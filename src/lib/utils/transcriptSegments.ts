import type { EditableTranscriptLineType } from '$lib/types/editor';

/**
 * Grouping and boundary analysis for the transcript view.
 *
 * Two things live here, both pure and both about where one speaker's turn ends
 * and the next begins.
 */

/** Consecutive lines attributed to the same speaker. */
export interface TurnGroupType {
	speaker: string;
	/** Indices into the original transcript array, in order. */
	lineIndices: number[];
}

/**
 * Collapse consecutive same-speaker lines into turns.
 *
 * Every professional transcription tool (Descript, Trint, Sonix, Otter) presents
 * a transcript as turns with the speaker named once, not as a flat line list with
 * a speaker badge on every row. With diarization this matters for more than
 * tidiness: 732 near-identical badges make a wrong boundary invisible, whereas in
 * a turn view it shows up as a one-line block wedged between two long ones.
 *
 * Purely presentational - the underlying array and the submitted payload are
 * untouched, and `lineIndices` maps every row back to its real position.
 */
export function groupIntoTurns(
	lines: Pick<EditableTranscriptLineType, 'speaker'>[]
): TurnGroupType[] {
	const groups: TurnGroupType[] = [];

	for (let index = 0; index < lines.length; index++) {
		const speaker = lines[index].speaker;
		const previous = groups[groups.length - 1];

		// Compared case-insensitively so `howard` and `Howard` do not split a turn
		// that is really one person.
		if (previous && previous.speaker.trim().toLowerCase() === speaker.trim().toLowerCase()) {
			previous.lineIndices.push(index);
		} else {
			groups.push({ speaker, lineIndices: [index] });
		}
	}

	return groups;
}

/**
 * A line that ends without sentence-final punctuation, followed by one starting
 * lowercase, means a single sentence was broken across the boundary.
 *
 * Measured on s09e26: 359 of 732 lines match, 356 of them crossing a speaker
 * boundary - so roughly half the episode has a turn boundary in the wrong place.
 */
const ENDS_SENTENCE = /[.!?]["”')\]]?\s*$/;
const STARTS_LOWERCASE = /^["“'([]?\p{Ll}/u;

/**
 * Indices of lines whose boundary with the *next* line looks wrong.
 *
 * A detector, not a fixer. It reliably says *where* a boundary is wrong but not
 * which way to move it, and the two directions repair different examples:
 * pushing the trailing fragment down fixes
 *   "...basketball coach." / "Um, you were getting your sign."
 * but breaks
 *   "So you were getting told you couldn't" / "ask? I was getting tell"
 * by attributing one speaker's question to another. Which is right depends on who
 * is talking, which is exactly what the text alone cannot settle - so this
 * surfaces the boundary and lets the editor decide.
 *
 * Only cross-speaker boundaries are reported. A mid-sentence break within one
 * speaker's turn is cosmetic, and turn grouping already hides it.
 */
export function findSuspectBoundaries(
	lines: Pick<EditableTranscriptLineType, 'speaker' | 'line'>[]
): Set<number> {
	const suspect = new Set<number>();

	for (let index = 0; index < lines.length - 1; index++) {
		const current = lines[index];
		const next = lines[index + 1];

		const sameSpeaker = current.speaker.trim().toLowerCase() === next.speaker.trim().toLowerCase();
		if (sameSpeaker) continue;

		const currentText = current.line.trim();
		const nextText = next.line.trim();
		if (!currentText || !nextText) continue;

		if (!ENDS_SENTENCE.test(currentText) && STARTS_LOWERCASE.test(nextText)) {
			suspect.add(index);
		}
	}

	return suspect;
}

/** Index just past the last sentence-ending punctuation, or 0 if there is none. */
function lastSentenceEnd(text: string): number {
	const match = text.match(/^.*[.!?]["”')\]]?\s+/s);
	return match ? match[0].length : 0;
}

/**
 * Titles that take a period without ending a sentence.
 *
 * A following capital is not enough to tell them apart - "Mr. Jin Air" looks
 * exactly like a sentence break followed by a new one, and the corpus is full of
 * "Mr Jin Air" style names.
 */
const ABBREVIATIONS = 'Mr|Mrs|Ms|Dr|Prof|Rev|St|Sr|Jr|Sgt|Lt|Capt|vs|etc|approx|Inc|Ltd|No';

/** Index just past the first sentence-ending punctuation, or the whole length. */
function firstSentenceEnd(text: string): number {
	const match = text.match(
		new RegExp(`^.*?(?<!\\b(?:${ABBREVIATIONS}))[.!?]["”')\\]]?(?=\\s+\\p{Lu}|\\s*$)`, 'su')
	);
	return match ? match[0].length : text.length;
}

export type BoundaryDirectionType = 'up' | 'down';

/**
 * Move the text either side of a boundary, without changing a single word.
 *
 * `up`   appends line i+1's opening sentence to line i.
 * `down` prepends line i's trailing fragment to line i+1.
 *
 * Which is correct depends on who is speaking, so both are offered and the
 * editor chooses - see findSuspectBoundaries for why this cannot be automated.
 * Returns the original array unchanged when there is nothing to move, so a
 * no-op does not re-render the transcript.
 */
export function moveBoundary<T extends { line: string }>(
	lines: T[],
	index: number,
	direction: BoundaryDirectionType
): T[] {
	const current = lines[index];
	const next = lines[index + 1];
	if (!current || !next) return lines;

	let currentText: string;
	let nextText: string;

	if (direction === 'up') {
		const cut = firstSentenceEnd(next.line.trimStart());
		const trimmed = next.line.trimStart();
		const moved = trimmed.slice(0, cut).trim();
		const remainder = trimmed.slice(cut).trim();
		// Refuse to empty a line; deleting a row is a separate, explicit action.
		if (!moved || !remainder) return lines;
		currentText = `${current.line.trimEnd()} ${moved}`;
		nextText = remainder;
	} else {
		const cut = lastSentenceEnd(current.line);
		const moved = current.line.slice(cut).trim();
		const remainder = current.line.slice(0, cut).trim();
		if (!moved || !remainder) return lines;
		currentText = remainder;
		nextText = `${moved} ${next.line.trimStart()}`;
	}

	const updated = [...lines];
	updated[index] = { ...current, line: currentText };
	updated[index + 1] = { ...next, line: nextText };
	return updated;
}
