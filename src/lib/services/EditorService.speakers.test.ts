import { describe, it, expect } from 'vitest';
import { editorService } from './EditorService';
import { deriveSpeakerRoster } from '$lib/utils/speakerRoster';
import type { EditableTranscriptLineType } from '$lib/types/editor';

/**
 * Speaker roster behaviour reached through EditorService.
 *
 * The derivation itself is covered in src/lib/utils/speakerRoster.test.ts; what
 * matters here is the cycling arithmetic, which crashed on any speaker missing
 * from the roster — the normal case before the roster was derived from the
 * transcript, since a fixed cast list matched none of a diarized episode.
 */

const roster = () => deriveSpeakerRoster([{ speaker: 'spk_0' }, { speaker: 'spk_1' }]);

describe('getNextSpeaker() / getPreviousSpeaker()', () => {
	it('advances through the roster', () => {
		const speakers = roster();
		const next = editorService.getNextSpeaker(speakers, speakers[0].name);
		expect(next?.name).toBe(speakers[1].name);
	});

	it('wraps forwards off the end', () => {
		const speakers = roster();
		const next = editorService.getNextSpeaker(speakers, speakers.at(-1)!.name);
		expect(next?.name).toBe(speakers[0].name);
	});

	it('wraps backwards off the start', () => {
		const speakers = roster();
		const prev = editorService.getPreviousSpeaker(speakers, speakers[0].name);
		expect(prev?.name).toBe(speakers.at(-1)!.name);
	});

	it('steps backwards', () => {
		const speakers = roster();
		const prev = editorService.getPreviousSpeaker(speakers, speakers[2].name);
		expect(prev?.name).toBe(speakers[1].name);
	});

	// Regression: `currentIndex === 0 ? len - 1 : currentIndex - 1` evaluated to
	// speakers[-2] for an unrecognised speaker, so Shift+Tab threw
	// "Cannot read properties of undefined (reading 'name')".
	it('never returns undefined for a speaker absent from the roster', () => {
		const speakers = roster();
		expect(editorService.getPreviousSpeaker(speakers, 'Nobody At All')).toBeDefined();
		expect(editorService.getNextSpeaker(speakers, 'Nobody At All')).toBeDefined();
		expect(editorService.getPreviousSpeaker(speakers, '')).toBeDefined();
	});

	it('starts the cycle at the first entry for an unrecognised speaker', () => {
		const speakers = roster();
		expect(editorService.getNextSpeaker(speakers, 'Nobody At All')?.name).toBe(speakers[0].name);
	});

	it('matches case-insensitively', () => {
		const speakers = roster();
		// A line reading `howard` used to miss the roster's `Howard` entirely,
		// feeding -1 into the arithmetic above.
		expect(editorService.getNextSpeaker(speakers, 'howard')?.name).toBe(
			editorService.getNextSpeaker(speakers, 'Howard')?.name
		);
	});

	it('returns null rather than throwing on an empty roster', () => {
		expect(editorService.getNextSpeaker([], 'anyone')).toBeNull();
		expect(editorService.getPreviousSpeaker([], 'anyone')).toBeNull();
	});
});

describe('deriveSpeakers() / countLinesBySpeaker()', () => {
	it('derives the roster from the loaded transcript', () => {
		const lines = [
			{
				speaker: 'spk_0',
				line: 'a',
				time: '0:00:01',
				edited: false,
				editState: 'unedited' as const
			},
			{
				speaker: 'spk_0',
				line: 'b',
				time: '0:00:02',
				edited: false,
				editState: 'unedited' as const
			},
			{
				speaker: 'spk_9',
				line: 'c',
				time: '0:00:03',
				edited: false,
				editState: 'unedited' as const
			}
		];

		const speakers = editorService.deriveSpeakers(lines);
		expect(speakers.map((s) => s.name)).toContain('spk_0');
		expect(speakers.map((s) => s.name)).toContain('spk_9');

		const counts = editorService.countLinesBySpeaker(lines);
		expect(counts.get('spk_0')).toBe(2);
		expect(counts.get('spk_9')).toBe(1);
	});

	it('still offers the cast for an episode that contains none of them', () => {
		const speakers = editorService.deriveSpeakers([]);
		expect(speakers.map((s) => s.name)).toEqual(['Howard', 'Todd', 'Bill', 'Sam', 'Unknown']);
	});
});

describe('renameSpeaker()', () => {
	const line = (
		id: string,
		speaker: string,
		overrides: Partial<EditableTranscriptLineType> = {}
	): EditableTranscriptLineType => ({
		id,
		speaker,
		line: `text ${id}`,
		time: '0:00:01',
		edited: false,
		originalText: `text ${id}`,
		originalSpeaker: speaker,
		originalTime: '0:00:01',
		originalEdited: false,
		...overrides
	});

	const transcript = () => [
		line('1', 'spk_0'),
		line('2', 'spk_1'),
		line('3', 'spk_0'),
		line('4', 'Todd')
	];

	it('renames every line belonging to the speaker', () => {
		const { lines, changedCount } = editorService.renameSpeaker(transcript(), 'spk_0', 'Howard');
		expect(changedCount).toBe(2);
		expect(lines.map((l) => l.speaker)).toEqual(['Howard', 'spk_1', 'Howard', 'Todd']);
	});

	it('reports the indices it touched, for undo', () => {
		const { indices } = editorService.renameSpeaker(transcript(), 'spk_0', 'Howard');
		expect(indices).toEqual([0, 2]);
	});

	it('matches the source speaker case-insensitively', () => {
		const { changedCount } = editorService.renameSpeaker(transcript(), 'SPK_0', 'Howard');
		expect(changedCount).toBe(2);
	});

	it('trims the target name', () => {
		const { lines } = editorService.renameSpeaker(transcript(), 'spk_0', '  Howard  ');
		expect(lines[0].speaker).toBe('Howard');
	});

	it('merges into an existing speaker when renamed to their name', () => {
		// Two diarization labels for one person is exactly why this is allowed.
		const { lines } = editorService.renameSpeaker(transcript(), 'spk_1', 'Todd');
		expect(lines.filter((l) => l.speaker === 'Todd')).toHaveLength(2);
	});

	// The decision behind the feature: a batch rename is a good first pass, not a
	// claim that anyone checked those lines.
	it('leaves renamed lines modified but NOT reviewed', () => {
		const { lines } = editorService.renameSpeaker(transcript(), 'spk_0', 'Howard');
		const renamed = [lines[0], lines[2]];

		renamed.forEach((l) => {
			expect(editorService.hasLineChanged(l)).toBe(true);
			expect(l.edited).toBe(false);
			expect(editorService.lineStatus(l)).toBe('modified');
		});
		expect(editorService.getChangedLines(lines)).toHaveLength(2);
	});

	it('preserves an existing review badge', () => {
		const lines = [line('1', 'spk_0', { edited: true, originalEdited: true })];
		const result = editorService.renameSpeaker(lines, 'spk_0', 'Howard');
		expect(result.lines[0].edited).toBe(true);
	});

	it('leaves untouched lines object-identical, so 732 rows do not re-render', () => {
		const original = transcript();
		const { lines } = editorService.renameSpeaker(original, 'spk_0', 'Howard');
		expect(lines[1]).toBe(original[1]);
		expect(lines[3]).toBe(original[3]);
	});

	it('returns the original array when nothing matches', () => {
		const original = transcript();
		const { lines, changedCount } = editorService.renameSpeaker(original, 'nobody', 'Howard');
		expect(lines).toBe(original);
		expect(changedCount).toBe(0);
	});

	it('is a no-op when renaming a speaker to the name they already have', () => {
		const original = transcript();
		const { lines, changedCount } = editorService.renameSpeaker(original, 'Todd', 'Todd');
		expect(lines).toBe(original);
		expect(changedCount).toBe(0);
	});

	it('ignores a blank target rather than wiping the speaker', () => {
		const original = transcript();
		expect(editorService.renameSpeaker(original, 'spk_0', '   ').lines).toBe(original);
	});

	it('can be limited to a subset of lines', () => {
		const { lines, changedCount } = editorService.renameSpeaker(transcript(), 'spk_0', 'Howard', {
			lineIndices: [0]
		});
		expect(changedCount).toBe(1);
		expect(lines.map((l) => l.speaker)).toEqual(['Howard', 'spk_1', 'spk_0', 'Todd']);
	});
});
