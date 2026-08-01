import { CAST_SPEAKERS, type SpeakerType } from '$lib/types/editor';
import { getSpeakerColor, isUnknownSpeaker, createUnknownSpeakerMap } from './speakerUtils';

/**
 * Builds the editor's speaker roster from the episode actually loaded.
 *
 * The editor previously seeded its roster from a hardcoded cast list and never
 * looked at the transcript, so an unedited episode - where every speaker is a
 * diarization label like `spk_0` - matched nothing and collapsed into a single
 * indistinguishable "Unknown Speaker" badge on all 732 lines. Deriving the
 * roster is what makes per-speaker counts, selection and batch rename possible.
 */

/** Anything with a `speaker`. Accepts both transcript and editable line shapes. */
interface HasSpeakerType {
	speaker: string;
}

const normalize = (name: string): string => name.trim().toLowerCase();

/**
 * DOM-key slug. Not used for matching - `name` is the canonical key - so it only
 * has to be stable and unique within a roster.
 */
function slugify(name: string): string {
	const base = name
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
	return base || 'speaker';
}

function uniqueId(base: string, taken: Set<string>): string {
	if (!taken.has(base)) {
		taken.add(base);
		return base;
	}
	let n = 2;
	while (taken.has(`${base}-${n}`)) n++;
	const id = `${base}-${n}`;
	taken.add(id);
	return id;
}

/**
 * How many lines each speaker has, keyed by the stored `speaker` value.
 *
 * Kept out of `SpeakerType` deliberately: a count is a property of the current
 * transcript, not of the speaker's identity, and would go stale on every edit.
 */
export function countLinesBySpeaker(lines: HasSpeakerType[]): Map<string, number> {
	const counts = new Map<string, number>();
	for (const line of lines) {
		counts.set(line.speaker, (counts.get(line.speaker) ?? 0) + 1);
	}
	return counts;
}

/**
 * Merges the recurring cast with the speakers present in `lines`, plus any
 * `extras` the user has added for this episode.
 *
 * Ordering is cast first in their fixed order, then transcript-derived speakers
 * by descending line count, then custom additions. That puts the four names a
 * user reaches for most at stable positions - which matters once number keys
 * assign the Nth roster entry - while keeping the episode's dominant voices
 * above its one-line bit parts.
 *
 * Matching is case-insensitive on `name`, so a transcript that says `howard`
 * folds into the cast entry instead of producing a near-duplicate row.
 */
export function deriveSpeakerRoster(lines: HasSpeakerType[], extras: string[] = []): SpeakerType[] {
	const counts = countLinesBySpeaker(lines);

	// "Unknown Speaker #1", #2 … numbered by first appearance, shared with the
	// public episode pages so a given label reads the same in both places.
	const unknownNumbers = createUnknownSpeakerMap(lines.map((line) => line.speaker));

	const takenIds = new Set<string>();
	const byName = new Map<string, SpeakerType>();
	const roster: SpeakerType[] = [];

	const add = (
		name: string,
		origin: SpeakerType['origin'],
		displayName?: string
	): SpeakerType | null => {
		const trimmed = name.trim();
		if (!trimmed) return null;

		const existing = byName.get(normalize(trimmed));
		if (existing) return existing;

		const machine = isUnknownSpeaker(trimmed);
		const entry: SpeakerType = {
			id: uniqueId(slugify(trimmed), takenIds),
			name: trimmed,
			displayName:
				displayName ??
				(machine
					? unknownNumbers.has(trimmed)
						? `Unknown Speaker #${unknownNumbers.get(trimmed)}`
						: trimmed
					: trimmed),
			color: getSpeakerColor(trimmed),
			origin,
			isMachineLabel: machine
		};

		byName.set(normalize(trimmed), entry);
		roster.push(entry);
		return entry;
	};

	// 1. Cast, in their declared order, present in the episode or not.
	for (const cast of CAST_SPEAKERS) {
		const entry = add(cast.name, 'cast', cast.displayName);
		// Cast ids are already referenced as {#each} keys; keep them stable rather
		// than letting slugify reassign them.
		if (entry) entry.id = cast.id;
	}
	CAST_SPEAKERS.forEach((cast) => takenIds.add(cast.id));

	// 2. Everyone actually in the transcript, loudest first. Ties fall back to
	//    first appearance, which `counts` preserves via Map insertion order.
	const fromTranscript = [...counts.keys()]
		.filter((name) => name.trim() && !byName.has(normalize(name)))
		.sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0));

	for (const name of fromTranscript) {
		add(name, 'transcript');
	}

	// 3. Guests the user added by hand.
	for (const extra of extras) {
		add(extra, 'custom');
	}

	return roster;
}

/** Case-insensitive lookup by stored name. */
export function findSpeaker(roster: SpeakerType[], name: string): SpeakerType | null {
	const target = normalize(name);
	return roster.find((speaker) => normalize(speaker.name) === target) ?? null;
}

/**
 * Appends a speaker the roster does not already contain.
 *
 * Replaces the old `addCustomSpeaker`, which picked colours by
 * `speakers.length % colors.length` - so removing anyone reshuffled the colour
 * of everyone after them. Hashing the name instead keeps a speaker's colour
 * fixed for the life of the episode.
 */
export function addCustomSpeaker(roster: SpeakerType[], name: string): SpeakerType[] {
	const trimmed = name.trim();
	if (!trimmed || findSpeaker(roster, trimmed)) return roster;

	const takenIds = new Set(roster.map((speaker) => speaker.id));
	const machine = isUnknownSpeaker(trimmed);

	return [
		...roster,
		{
			id: uniqueId(slugify(trimmed), takenIds),
			name: trimmed,
			displayName: trimmed,
			color: getSpeakerColor(trimmed),
			origin: 'custom',
			isMachineLabel: machine
		}
	];
}
