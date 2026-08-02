import { describe, it, expect } from 'vitest';
import { groupIntoTurns, findSuspectBoundaries, moveBoundary } from './transcriptSegments';

const line = (speaker: string, text = 'some words') => ({ speaker, line: text });

describe('groupIntoTurns()', () => {
	it('collapses consecutive lines by the same speaker', () => {
		const groups = groupIntoTurns([
			line('spk_0'),
			line('spk_0'),
			line('spk_1'),
			line('spk_0'),
			line('spk_0'),
			line('spk_0')
		]);

		expect(groups.map((g) => g.speaker)).toEqual(['spk_0', 'spk_1', 'spk_0']);
		expect(groups.map((g) => g.lineIndices)).toEqual([[0, 1], [2], [3, 4, 5]]);
	});

	it('maps every line back to its original index exactly once', () => {
		const lines = Array.from({ length: 20 }, (_, i) => line(`spk_${i % 3}`));
		const flat = groupIntoTurns(lines).flatMap((g) => g.lineIndices);

		expect(flat).toEqual([...Array(20).keys()]);
	});

	it('does not split a turn on casing alone', () => {
		const groups = groupIntoTurns([line('Howard'), line('howard'), line('HOWARD')]);
		expect(groups).toHaveLength(1);
	});

	it('returns one group per line when speakers alternate every line', () => {
		const groups = groupIntoTurns([line('a'), line('b'), line('a'), line('b')]);
		expect(groups).toHaveLength(4);
	});

	it('handles an empty transcript', () => {
		expect(groupIntoTurns([])).toEqual([]);
	});

	// The reason turn grouping helps with bad diarization: a wrong boundary shows
	// up as a lone line between two long turns instead of hiding among 732
	// identical badges.
	it('leaves an interrupted turn visible as a one-line group', () => {
		const groups = groupIntoTurns([
			line('spk_0'),
			line('spk_0'),
			line('spk_1'), // the suspicious one
			line('spk_0'),
			line('spk_0')
		]);

		expect(groups.map((g) => g.lineIndices.length)).toEqual([2, 1, 2]);
	});
});

describe('findSuspectBoundaries()', () => {
	// Verbatim from s09e26, which is where the 49% figure comes from.
	it('flags a sentence broken across a speaker boundary', () => {
		const suspect = findSuspectBoundaries([
			line('spk_1', 'Wait a second. Pause. Pasta song. Mr, Can I please just'),
			line('spk_0', 'one, Your Honor, Mr Jin Air. Just one time, can I?')
		]);
		expect([...suspect]).toEqual([0]);
	});

	it('flags a trailing filler word followed by a new line', () => {
		const suspect = findSuspectBoundaries([
			line('spk_3', 'Their Levis, your biology teacher. Ah, and ah, now basketball coach. Um,'),
			line('spk_1', 'you were getting your sign.')
		]);
		expect([...suspect]).toEqual([0]);
	});

	it('flags a question split across two speakers', () => {
		const suspect = findSuspectBoundaries([
			line('spk_0', "So you were getting told you couldn't"),
			line('spk_3', 'ask? I was getting tell')
		]);
		expect([...suspect]).toEqual([0]);
	});

	it('does not flag a boundary where the first line ends a sentence', () => {
		const suspect = findSuspectBoundaries([
			line('spk_0', 'That is the end of my point.'),
			line('spk_1', 'and here is a lowercase start')
		]);
		expect(suspect.size).toBe(0);
	});

	it('does not flag a boundary where the next line starts a sentence', () => {
		const suspect = findSuspectBoundaries([
			line('spk_0', 'trailing off without punctuation'),
			line('spk_1', 'A new sentence begins here.')
		]);
		expect(suspect.size).toBe(0);
	});

	// Within one speaker's turn a mid-sentence break is cosmetic, and turn
	// grouping hides it anyway - flagging it would bury the real signal.
	it('ignores a mid-sentence break within a single speaker turn', () => {
		const suspect = findSuspectBoundaries([
			line('spk_0', 'this sentence continues'),
			line('spk_0', 'onto the following line')
		]);
		expect(suspect.size).toBe(0);
	});

	it('tolerates punctuation wrapped in quotes or brackets', () => {
		const suspect = findSuspectBoundaries([
			line('spk_0', 'He said "that is enough."'),
			line('spk_1', 'and then left')
		]);
		expect(suspect.size).toBe(0);
	});

	it('sees through a leading quote on the following line', () => {
		const suspect = findSuspectBoundaries([
			line('spk_0', 'he told me'),
			line('spk_1', '"quietly, and then he left."')
		]);
		expect([...suspect]).toEqual([0]);
	});

	it('ignores blank lines rather than flagging them', () => {
		const suspect = findSuspectBoundaries([
			line('spk_0', 'trailing off'),
			line('spk_1', '   '),
			line('spk_2', 'more words')
		]);
		expect(suspect.size).toBe(0);
	});

	it('never flags the final line, which has no following boundary', () => {
		const suspect = findSuspectBoundaries([
			line('spk_0', 'first'),
			line('spk_1', 'trailing off with no next line')
		]);
		expect(suspect.has(1)).toBe(false);
	});

	it('handles an empty transcript', () => {
		expect(findSuspectBoundaries([]).size).toBe(0);
	});
});

describe('moveBoundary()', () => {
	const norm = (s: string) => s.replace(/\s+/g, ' ').trim();
	const joined = (ls: { line: string }[]) => norm(ls.map((l) => l.line).join(' '));

	// Real s09e26 boundary: "...Can I please just" / "one, Your Honor..."
	const example = () => [
		line('spk_1', 'Wait a second. Pause. Pasta song. Mr, Can I please just'),
		line('spk_0', 'one, Your Honor, Mr Jin Air. Just one time, can I?')
	];

	it('moves the trailing fragment down to the following line', () => {
		const out = moveBoundary(example(), 0, 'down');
		expect(out[0].line).toBe('Wait a second. Pause. Pasta song.');
		expect(out[1].line).toBe(
			'Mr, Can I please just one, Your Honor, Mr Jin Air. Just one time, can I?'
		);
	});

	it('moves the following opening sentence up', () => {
		const out = moveBoundary(example(), 0, 'up');
		expect(out[0].line).toBe(
			'Wait a second. Pause. Pasta song. Mr, Can I please just one, Your Honor, Mr Jin Air.'
		);
		expect(out[1].line).toBe('Just one time, can I?');
	});

	// The property the whole feature rests on.
	it.each(['up', 'down'] as const)('preserves every word verbatim moving %s', (direction) => {
		const before = joined(example());
		expect(joined(moveBoundary(example(), 0, direction))).toBe(before);
	});

	it('does not split on an abbreviation that merely ends in a period', () => {
		// Without the capital-letter lookahead, "Mr." reads as a sentence end.
		const out = moveBoundary(
			[line('a', 'he told'), line('b', 'Mr. Jin Air the news. Then he left.')],
			0,
			'up'
		);
		expect(out[0].line).toBe('he told Mr. Jin Air the news.');
		expect(out[1].line).toBe('Then he left.');
	});

	it('refuses to empty a line rather than deleting it implicitly', () => {
		// The whole of the next line is one sentence, so moving it up would leave
		// an empty row - deleting a line is a separate, explicit action.
		const lines = [line('a', 'trailing off'), line('b', 'One whole sentence.')];
		expect(moveBoundary(lines, 0, 'up')).toBe(lines);
	});

	it('is a no-op when the line has no sentence break to move down', () => {
		const lines = [line('a', 'no punctuation at all here'), line('b', 'next line')];
		expect(moveBoundary(lines, 0, 'down')).toBe(lines);
	});

	it('is a no-op at the final boundary', () => {
		const lines = [line('a', 'only line.')];
		expect(moveBoundary(lines, 0, 'up')).toBe(lines);
	});

	it('leaves untouched lines object-identical', () => {
		const lines = [...example(), line('c', 'unrelated.')];
		const out = moveBoundary(lines, 0, 'down');
		expect(out[2]).toBe(lines[2]);
	});

	it('resolves the boundary it was applied to', () => {
		const out = moveBoundary(example(), 0, 'down');
		expect(findSuspectBoundaries(out).has(0)).toBe(false);
	});
});
