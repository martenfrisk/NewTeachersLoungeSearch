import { describe, it, expect, beforeEach } from 'vitest';
import {
	deriveSpeakerRoster,
	countLinesBySpeaker,
	findSpeaker,
	addCustomSpeaker
} from './speakerRoster';
import {
	isUnknownSpeaker,
	clearSpeakerColorCache,
	getSpeakerColor,
	processTranscriptSpeakers
} from './speakerUtils';
import { CAST_SPEAKERS } from '$lib/types/editor';

/**
 * The fixture mirrors s09e26 as stored in production: 732 lines across six
 * diarization labels, with spk_4 absent. The gap is the point - indices are
 * sparse, so anything that generates `spk_0..spk_N` from a max would invent a
 * speaker that has no lines.
 */
const S09E26_COUNTS: Record<string, number> = {
	spk_0: 205,
	spk_2: 155,
	spk_1: 138,
	spk_3: 125,
	spk_6: 103,
	spk_5: 6
};

function s09e26Lines(): { speaker: string }[] {
	// Interleaved rather than grouped, so first-appearance order (spk_0, spk_2,
	// spk_1, …) differs from descending-count order and the two can't be confused.
	const remaining = { ...S09E26_COUNTS };
	const lines: { speaker: string }[] = [];
	let any = true;
	while (any) {
		any = false;
		for (const speaker of Object.keys(S09E26_COUNTS)) {
			if (remaining[speaker] > 0) {
				lines.push({ speaker });
				remaining[speaker]--;
				any = true;
			}
		}
	}
	return lines;
}

const names = (roster: { name: string }[]) => roster.map((s) => s.name);

beforeEach(() => {
	// getSpeakerColor memoizes globally; a stale cache would hide a colour bug.
	clearSpeakerColorCache();
});

describe('countLinesBySpeaker()', () => {
	it('counts each speaker', () => {
		expect(Object.fromEntries(countLinesBySpeaker(s09e26Lines()))).toEqual(S09E26_COUNTS);
	});

	it('returns an empty map for an empty transcript', () => {
		expect(countLinesBySpeaker([]).size).toBe(0);
	});
});

describe('deriveSpeakerRoster()', () => {
	it('lists the cast first, in their declared order', () => {
		const roster = deriveSpeakerRoster(s09e26Lines());
		expect(names(roster).slice(0, CAST_SPEAKERS.length)).toEqual(CAST_SPEAKERS.map((c) => c.name));
	});

	it('offers the cast even when the episode contains none of them', () => {
		const roster = deriveSpeakerRoster(s09e26Lines());
		// s09e26 is entirely machine-labelled, so every cast member is absent from
		// it - but they are the rename targets, which is the whole point.
		expect(findSpeaker(roster, 'Todd')?.origin).toBe('cast');
		expect(findSpeaker(roster, 'Sam')?.origin).toBe('cast');
	});

	it('orders transcript speakers by descending line count, not first appearance', () => {
		const roster = deriveSpeakerRoster(s09e26Lines());
		const derived = roster.filter((s) => s.origin === 'transcript');
		expect(names(derived)).toEqual(['spk_0', 'spk_2', 'spk_1', 'spk_3', 'spk_6', 'spk_5']);
	});

	it('preserves sparse indices instead of filling the gap', () => {
		const roster = deriveSpeakerRoster(s09e26Lines());
		expect(findSpeaker(roster, 'spk_4')).toBeNull();
		expect(roster.filter((s) => s.origin === 'transcript')).toHaveLength(6);
	});

	it('folds a differently-cased transcript name into the cast entry', () => {
		const roster = deriveSpeakerRoster([{ speaker: 'howard' }, { speaker: 'HOWARD' }]);
		const matches = roster.filter((s) => s.name.toLowerCase() === 'howard');
		expect(matches).toHaveLength(1);
		expect(matches[0].origin).toBe('cast');
		// Keeps the cast spelling, which is what gets written back to the database.
		expect(matches[0].name).toBe('Howard');
	});

	it('produces no duplicates and no blank entries', () => {
		const roster = deriveSpeakerRoster([
			{ speaker: 'spk_0' },
			{ speaker: 'spk_0' },
			{ speaker: '' },
			{ speaker: '   ' },
			{ speaker: 'Klaus' }
		]);
		expect(new Set(names(roster)).size).toBe(roster.length);
		expect(names(roster)).not.toContain('');
		expect(findSpeaker(roster, 'Klaus')).not.toBeNull();
	});

	it('gives every entry a unique id', () => {
		const roster = deriveSpeakerRoster([{ speaker: 'Fake Manager' }, { speaker: 'fake-manager' }]);
		expect(new Set(roster.map((s) => s.id)).size).toBe(roster.length);
	});

	it('keeps the hardcoded cast ids, which are already used as {#each} keys', () => {
		const roster = deriveSpeakerRoster(s09e26Lines());
		expect(findSpeaker(roster, 'Howard')?.id).toBe('howard');
		expect(findSpeaker(roster, 'Unknown')?.id).toBe('unknown');
	});

	it('appends user-added guests last, as custom', () => {
		const roster = deriveSpeakerRoster(s09e26Lines(), ['Luke Krakoski']);
		expect(roster.at(-1)?.name).toBe('Luke Krakoski');
		expect(roster.at(-1)?.origin).toBe('custom');
	});

	it('ignores an extra that duplicates someone already present', () => {
		const roster = deriveSpeakerRoster([{ speaker: 'Klaus' }], ['klaus', 'Todd']);
		expect(roster.filter((s) => s.name.toLowerCase() === 'klaus')).toHaveLength(1);
		expect(roster.filter((s) => s.name.toLowerCase() === 'todd')).toHaveLength(1);
	});

	it('returns just the cast for an empty transcript', () => {
		expect(names(deriveSpeakerRoster([]))).toEqual(CAST_SPEAKERS.map((c) => c.name));
	});

	describe('machine labels', () => {
		it.each(['spk_3', 'Speaker 10', 'SPEAKER-01', '4'])(
			'treats %s as a machine label and numbers it',
			(label) => {
				const roster = deriveSpeakerRoster([{ speaker: label }]);
				const entry = findSpeaker(roster, label);
				expect(entry?.isMachineLabel).toBe(true);
				expect(entry?.displayName).toMatch(/^Unknown Speaker #\d+$/);
			}
		);

		it.each(['Klaus', 'Tom Hanks', 'Fake Manager', 'Customer 1', 'Waiter 2', 'Delivery Man 1'])(
			'leaves the named character %s verbatim',
			(name) => {
				const roster = deriveSpeakerRoster([{ speaker: name }]);
				const entry = findSpeaker(roster, name);
				expect(entry?.isMachineLabel).toBe(false);
				expect(entry?.displayName).toBe(name);
			}
		);

		it('numbers machine labels by first appearance, matching the public pages', () => {
			const roster = deriveSpeakerRoster(s09e26Lines());
			// First appearance order is spk_0, spk_2, spk_1, … (see the fixture).
			expect(findSpeaker(roster, 'spk_0')?.displayName).toBe('Unknown Speaker #1');
			expect(findSpeaker(roster, 'spk_2')?.displayName).toBe('Unknown Speaker #2');
		});

		it('does not treat the cast as machine labels', () => {
			const roster = deriveSpeakerRoster([]);
			expect(roster.every((s) => s.isMachineLabel === false)).toBe(true);
		});
	});

	describe('colours', () => {
		it('assigns one to every entry', () => {
			const roster = deriveSpeakerRoster(s09e26Lines());
			expect(roster.every((s) => typeof s.color === 'string' && s.color.length > 0)).toBe(true);
		});

		it('is stable when the roster is reordered', () => {
			// The old addCustomSpeaker picked colours by `speakers.length % colors.length`,
			// so removing one speaker changed the colour of everyone after them.
			const full = deriveSpeakerRoster(s09e26Lines());
			const reordered = deriveSpeakerRoster(s09e26Lines().filter((l) => l.speaker !== 'spk_0'));
			for (const name of ['spk_1', 'spk_2', 'spk_6']) {
				expect(findSpeaker(reordered, name)?.color).toBe(findSpeaker(full, name)?.color);
			}
		});

		it('agrees with the colour the public episode pages use', () => {
			// processTranscriptSpeakers is what /ep/* renders with. Before this change
			// the editor coloured Howard from a hardcoded literal while the public page
			// hashed his name, so the same speaker was two different colours.
			const lines = [{ speaker: 'Klaus', edited: false, time: '0:00:01', line: 'hi' }];
			const roster = deriveSpeakerRoster(lines);
			const [publicLine] = processTranscriptSpeakers(lines);

			expect(findSpeaker(roster, 'Klaus')?.color).toBe(publicLine.speakerColor);
		});

		it('colours the cast by hashing their name too, not from a literal', () => {
			const roster = deriveSpeakerRoster([]);
			for (const cast of CAST_SPEAKERS) {
				expect(findSpeaker(roster, cast.name)?.color).toBe(getSpeakerColor(cast.name));
			}
		});
	});
});

describe('findSpeaker()', () => {
	const roster = deriveSpeakerRoster([{ speaker: 'spk_0' }]);

	it('matches case-insensitively', () => {
		expect(findSpeaker(roster, 'SPK_0')?.name).toBe('spk_0');
		expect(findSpeaker(roster, 'todd')?.name).toBe('Todd');
	});

	it('returns null for someone not in the roster', () => {
		expect(findSpeaker(roster, 'Nobody')).toBeNull();
	});
});

describe('addCustomSpeaker()', () => {
	it('appends a new speaker', () => {
		const roster = deriveSpeakerRoster([]);
		const next = addCustomSpeaker(roster, 'Luke Krakoski');
		expect(next).toHaveLength(roster.length + 1);
		expect(next.at(-1)?.origin).toBe('custom');
	});

	it('is a no-op for someone already present, whatever the casing', () => {
		const roster = deriveSpeakerRoster([]);
		expect(addCustomSpeaker(roster, 'todd')).toBe(roster);
	});

	it('ignores blank input', () => {
		const roster = deriveSpeakerRoster([]);
		expect(addCustomSpeaker(roster, '   ')).toBe(roster);
	});

	it('does not mutate the roster it was given', () => {
		const roster = deriveSpeakerRoster([]);
		const before = roster.length;
		addCustomSpeaker(roster, 'Klaus');
		expect(roster).toHaveLength(before);
	});
});

describe('isUnknownSpeaker() - the broadened pattern', () => {
	it('now matches the "Speaker N" form, which 26,732 lines use', () => {
		expect(isUnknownSpeaker('Speaker 0')).toBe(true);
		expect(isUnknownSpeaker('Speaker 13')).toBe(true);
	});

	it('still matches the forms it always did', () => {
		expect(isUnknownSpeaker('spk_0')).toBe(true);
		expect(isUnknownSpeaker('7')).toBe(true);
	});

	it('does not swallow named characters that end in a number', () => {
		expect(isUnknownSpeaker('Customer 1')).toBe(false);
		expect(isUnknownSpeaker('Demon Voice 1')).toBe(false);
		expect(isUnknownSpeaker('Waiter 2')).toBe(false);
	});

	it('does not match a bare prefix with no index', () => {
		expect(isUnknownSpeaker('Speaker')).toBe(false);
		expect(isUnknownSpeaker('spk')).toBe(false);
	});
});
