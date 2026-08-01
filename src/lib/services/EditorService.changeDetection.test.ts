import { describe, it, expect } from 'vitest';
import { editorService } from './EditorService';
import type { EditableTranscriptLineType } from '$lib/types/editor';

/**
 * What gets submitted for moderation, and how a line is presented.
 *
 * This file began as a baseline pinning the old four-state `editState` model so
 * its removal could be shown to be safe. That comparison is done - the old
 * predicate was `hasLineChanged || editState in (edited, unsaved, saved)`, and it
 * agreed with the replacement on every reachable line state. It is now the
 * coverage for the model that replaced it:
 *
 *   modified = the line differs from what was loaded  (derived from original*)
 *   reviewed = a human vouched for it                 (`edited`, persisted)
 *
 * The two are independent, so a line can be both.
 */

const ORIGINAL = {
	text: 'the original transcribed text',
	speaker: 'spk_0',
	time: '0:00:10'
} as const;

interface LineShapeType {
	/** Content differs from what was loaded. */
	changed: boolean;
	/** Current review flag. */
	edited: boolean;
	/** Review flag as loaded from the database. */
	originalEdited?: boolean;
}

function makeLine(shape: LineShapeType, id = 'line-1'): EditableTranscriptLineType {
	return {
		id,
		line: shape.changed ? 'text the user rewrote' : ORIGINAL.text,
		speaker: ORIGINAL.speaker,
		time: ORIGINAL.time,
		edited: shape.edited,
		originalText: ORIGINAL.text,
		originalSpeaker: ORIGINAL.speaker,
		originalTime: ORIGINAL.time,
		originalEdited: shape.originalEdited ?? false
	};
}

describe('getChangedLines()', () => {
	it('includes a line whose text was rewritten', () => {
		expect(
			editorService.getChangedLines([makeLine({ changed: true, edited: false })])
		).toHaveLength(1);
	});

	it('excludes an untouched line', () => {
		expect(
			editorService.getChangedLines([makeLine({ changed: false, edited: false })])
		).toHaveLength(0);
	});

	it('includes a line reviewed during this session', () => {
		const line = makeLine({ changed: false, edited: true, originalEdited: false });
		expect(editorService.getChangedLines([line])).toHaveLength(1);
	});

	it('includes a line whose review was cleared during this session', () => {
		const line = makeLine({ changed: false, edited: false, originalEdited: true });
		expect(editorService.getChangedLines([line])).toHaveLength(1);
	});

	/**
	 * Seven episodes carry `edited = true` on every row from the pre-migration
	 * apply function - s04e02 has 629 of 629. Counting those as pending changes
	 * made the editor report hundreds of edits to submit on an untouched episode,
	 * and re-submitting them is a no-op.
	 */
	it('excludes a line that arrived already reviewed and was not touched', () => {
		const line = makeLine({ changed: false, edited: true, originalEdited: true });
		expect(editorService.getChangedLines([line])).toHaveLength(0);
	});

	it('includes an already-reviewed line once its content is edited', () => {
		const line = makeLine({ changed: true, edited: true, originalEdited: true });
		expect(editorService.getChangedLines([line])).toHaveLength(1);
	});

	it('detects a speaker-only change, which is what batch rename produces', () => {
		const line = makeLine({ changed: false, edited: false });
		line.speaker = 'Todd';
		expect(editorService.hasLineChanged(line)).toBe(true);
		expect(editorService.getChangedLines([line])).toHaveLength(1);
	});

	it('detects a timestamp-only change', () => {
		const line = makeLine({ changed: false, edited: false });
		line.time = '0:00:11';
		expect(editorService.getChangedLines([line])).toHaveLength(1);
	});

	it('treats a missing originalEdited as "arrived unreviewed"', () => {
		// Lines built before originalEdited existed, and any fixture that omits it.
		const line = makeLine({ changed: false, edited: true });
		delete line.originalEdited;
		expect(editorService.getChangedLines([line])).toHaveLength(1);
	});
});

describe('lineStatus()', () => {
	it.each([
		[{ changed: false, edited: false }, 'unchanged'],
		[{ changed: true, edited: false }, 'modified'],
		[{ changed: false, edited: true }, 'reviewed'],
		[{ changed: true, edited: true }, 'modified-reviewed']
	] as const)('%o -> %s', (shape, expected) => {
		expect(editorService.lineStatus(makeLine(shape))).toBe(expected);
	});

	it('reports modified-reviewed rather than hiding one behind the other', () => {
		// The old badge chain was a mutually-exclusive {:else if}, so a reviewed
		// line stopped showing that it also had unsubmitted content changes.
		const line = makeLine({ changed: true, edited: true });
		expect(editorService.lineStatus(line)).toBe('modified-reviewed');
	});
});

describe('getModifiedLines() / getReviewedLines()', () => {
	const lines = [
		makeLine({ changed: false, edited: false }, 'a'),
		makeLine({ changed: true, edited: false }, 'b'),
		makeLine({ changed: false, edited: true }, 'c'),
		makeLine({ changed: true, edited: true }, 'd')
	];

	it('reports the indices that differ from what was loaded', () => {
		expect(editorService.getModifiedLines(lines)).toEqual([1, 3]);
	});

	it('reports the indices a human marked reviewed', () => {
		expect(editorService.getReviewedLines(lines)).toEqual([2, 3]);
	});
});

describe('massAction()', () => {
	function fixture(): EditableTranscriptLineType[] {
		return [
			makeLine({ changed: false, edited: false }, 'a'),
			makeLine({ changed: true, edited: false }, 'b'),
			makeLine({ changed: true, edited: true }, 'c'),
			makeLine({ changed: false, edited: false }, 'd')
		];
	}

	describe('commit', () => {
		it('marks the targeted lines reviewed', () => {
			const result = editorService.massAction(fixture(), [0, 1], 'commit');
			expect(result[0].edited).toBe(true);
			expect(result[1].edited).toBe(true);
		});

		it('leaves untargeted lines object-identical', () => {
			const lines = fixture();
			const result = editorService.massAction(lines, [0], 'commit');
			expect(result[3]).toBe(lines[3]);
		});
	});

	describe('reset-edited', () => {
		it('clears the review badge', () => {
			const result = editorService.massAction(fixture(), [2], 'reset-edited');
			expect(result[2].edited).toBe(false);
			// Content still differs, so the line stays in the submission.
			expect(editorService.getChangedLines(result)).toContainEqual(result[2]);
		});

		it('ignores lines that were never reviewed', () => {
			const lines = fixture();
			const result = editorService.massAction(lines, [0, 1], 'reset-edited');
			expect(result[0]).toBe(lines[0]);
			expect(result[1]).toBe(lines[1]);
		});
	});

	describe('delete', () => {
		it('refuses to run without explicit confirmation', () => {
			expect(() => editorService.massAction(fixture(), [0], 'delete')).toThrow(
				/requires confirmation/i
			);
		});

		it('removes the right lines when indices are given out of order', () => {
			const result = editorService.massAction(fixture(), [2, 0], 'delete', {
				confirmDelete: true
			});
			expect(result.map((l) => l.id)).toEqual(['b', 'd']);
		});

		it('does not mutate the caller-supplied index array', () => {
			// Callers pass editorStore.selectedLineIndices straight through, so an
			// in-place sort would reorder their reactive selection state.
			const indices = [2, 0];
			editorService.massAction(fixture(), indices, 'delete', { confirmDelete: true });
			expect(indices).toEqual([2, 0]);
		});

		it('never empties the transcript entirely', () => {
			const result = editorService.massAction(fixture(), [0, 1, 2, 3], 'delete', {
				confirmDelete: true
			});
			expect(result.length).toBeGreaterThanOrEqual(1);
		});
	});

	describe('revert-to-original', () => {
		it('restores original content and drops the line from the submission', () => {
			const result = editorService.massAction(fixture(), [1], 'revert-to-original');
			expect(result[1].line).toBe(ORIGINAL.text);
			expect(editorService.hasLineChanged(result[1])).toBe(false);
			expect(editorService.getChangedLines([result[1]])).toHaveLength(0);
		});
	});

	it('rejects an unknown action', () => {
		expect(() =>
			// @ts-expect-error - deliberately probing the runtime guard
			editorService.massAction(fixture(), [0], 'not-a-real-action')
		).toThrow(/unknown mass action/i);
	});

	// The removed actions all manipulated the deleted state field. `save` became a
	// no-op; `set-edited` duplicated `commit`; and set-unedited/unsaved/saved
	// assigned `edited: newState === 'edited'`, silently revoking review badges -
	// the one thing resolveEditedFlag documents must never happen implicitly.
	it.each(['save', 'set-unedited', 'set-unsaved', 'set-saved', 'set-edited'])(
		'no longer accepts the removed action %s',
		(action) => {
			expect(() =>
				// @ts-expect-error - these are gone from MassActionType on purpose
				editorService.massAction(fixture(), [0], action)
			).toThrow(/unknown mass action/i);
		}
	);
});

describe('getLinesBySpeaker()', () => {
	const lines = [
		makeLine({ changed: false, edited: false }, 'a'),
		makeLine({ changed: false, edited: false }, 'b'),
		makeLine({ changed: false, edited: false }, 'c')
	];
	lines[1].speaker = 'Todd';

	it('returns the indices of every matching line', () => {
		expect(editorService.getLinesBySpeaker(lines, 'spk_0')).toEqual([0, 2]);
	});

	it('matches case-insensitively', () => {
		expect(editorService.getLinesBySpeaker(lines, 'todd')).toEqual([1]);
	});

	it('returns an empty array for a speaker not present', () => {
		expect(editorService.getLinesBySpeaker(lines, 'Howard')).toEqual([]);
	});
});
