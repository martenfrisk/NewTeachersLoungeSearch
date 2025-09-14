import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { EditableTranscriptLineType } from '../../types/editor';
import { editorService } from '../../services/EditorService';

// Create test transcript lines with different change states
function createTestLines(): EditableTranscriptLineType[] {
	return [
		// Unedited line (no changes)
		{
			id: '1',
			line: 'Original text',
			speaker: 'Howard',
			time: '0:01',
			editState: 'unedited',
			originalText: 'Original text',
			originalSpeaker: 'Howard',
			originalTime: '0:01',
			edited: false,
			isEditing: false,
			isHighlighted: false,
			isPlaying: false
		},
		// Line with text changes
		{
			id: '2',
			line: 'Changed text',
			speaker: 'Todd',
			time: '0:03',
			editState: 'unsaved',
			originalText: 'Original text 2',
			originalSpeaker: 'Todd',
			originalTime: '0:03',
			edited: false,
			isEditing: false,
			isHighlighted: false,
			isPlaying: false
		},
		// Line with timestamp changes
		{
			id: '3',
			line: 'Same text',
			speaker: 'Bill',
			time: '0:10',
			editState: 'unsaved',
			originalText: 'Same text',
			originalSpeaker: 'Bill',
			originalTime: '0:05',
			edited: false,
			isEditing: false,
			isHighlighted: false,
			isPlaying: false
		}
	];
}

describe('SubmitControls Logic - Integration Tests', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should correctly count lines with changes', () => {
		const linesWithChanges = createTestLines();

		// Test the same logic used by SubmitControls component
		const changedLinesCount = editorService.getChangedLinesCount(linesWithChanges);

		// Should count 2 changes (text change + timestamp change)
		expect(changedLinesCount).toBe(2);
	});

	it('should return 0 for unedited lines without changes', () => {
		const linesWithoutChanges = createTestLines();
		// Reset all lines to unedited state
		linesWithoutChanges.forEach((line) => {
			line.editState = 'unedited';
			line.line = line.originalText || line.line;
			line.speaker = line.originalSpeaker || line.speaker;
			line.time = line.originalTime || line.time;
		});

		const changedLinesCount = editorService.getChangedLinesCount(linesWithoutChanges);

		expect(changedLinesCount).toBe(0);
	});

	it('should detect timestamp-only changes correctly', () => {
		const linesWithTimestampChanges: EditableTranscriptLineType[] = [
			// Unedited line
			{
				id: '1',
				line: 'Same text',
				speaker: 'Howard',
				time: '0:01',
				editState: 'unedited',
				originalText: 'Same text',
				originalSpeaker: 'Howard',
				originalTime: '0:01',
				edited: false,
				isEditing: false,
				isHighlighted: false,
				isPlaying: false
			},
			// Line with only timestamp change
			{
				id: '2',
				line: 'Same text 2',
				speaker: 'Todd',
				time: '0:10',
				editState: 'unedited', // This should be detected as changed due to time difference
				originalText: 'Same text 2',
				originalSpeaker: 'Todd',
				originalTime: '0:03',
				edited: false,
				isEditing: false,
				isHighlighted: false,
				isPlaying: false
			}
		];

		const changedLinesCount = editorService.getChangedLinesCount(linesWithTimestampChanges);

		// Should detect 1 change for the timestamp change
		expect(changedLinesCount).toBe(1);
	});

	it('should handle lines shifted with shiftAllLinesTime correctly', () => {
		const originalLines: EditableTranscriptLineType[] = [
			{
				id: '1',
				line: 'Line 1',
				speaker: 'Howard',
				time: '0:01',
				editState: 'unedited',
				originalText: 'Line 1',
				originalSpeaker: 'Howard',
				originalTime: '0:01',
				edited: false,
				isEditing: false,
				isHighlighted: false,
				isPlaying: false
			},
			{
				id: '2',
				line: 'Line 2',
				speaker: 'Todd',
				time: '0:03',
				editState: 'unedited',
				originalText: 'Line 2',
				originalSpeaker: 'Todd',
				originalTime: '0:03',
				edited: false,
				isEditing: false,
				isHighlighted: false,
				isPlaying: false
			}
		];

		// Simulate shiftAllLinesTime by +5 seconds
		const shiftedLines = editorService.shiftAllLinesTime(originalLines, 5);
		const changedLinesCount = editorService.getChangedLinesCount(shiftedLines);

		// Should detect changes from the timestamp shift
		expect(changedLinesCount).toBe(2);

		// Verify the individual lines are detected as changed
		const changedLines = editorService.getChangedLines(shiftedLines);
		expect(changedLines).toHaveLength(2);
		expect(changedLines[0].time).toBe('0:06'); // 0:01 + 5 seconds
		expect(changedLines[1].time).toBe('0:08'); // 0:03 + 5 seconds
	});

	it('should maintain consistent state detection across different method calls', () => {
		const linesWithChanges = createTestLines();

		// All these methods should return consistent results
		const changedLinesCount = editorService.getChangedLinesCount(linesWithChanges);
		const changedLines = editorService.getChangedLines(linesWithChanges);
		const hasChanges = editorService.hasAnyChanges(linesWithChanges);

		expect(changedLinesCount).toBe(2);
		expect(changedLines).toHaveLength(2);
		expect(hasChanges).toBe(true);
	});

	it('should correctly identify different types of changes', () => {
		const mixedChanges: EditableTranscriptLineType[] = [
			// Text-only change
			{
				id: '1',
				line: 'Changed text',
				speaker: 'Howard',
				time: '0:01',
				editState: 'unedited',
				originalText: 'Original text',
				originalSpeaker: 'Howard',
				originalTime: '0:01',
				edited: false,
				isEditing: false,
				isHighlighted: false,
				isPlaying: false
			},
			// Speaker-only change
			{
				id: '2',
				line: 'Same text',
				speaker: 'Sam',
				time: '0:03',
				editState: 'unedited',
				originalText: 'Same text',
				originalSpeaker: 'Todd',
				originalTime: '0:03',
				edited: false,
				isEditing: false,
				isHighlighted: false,
				isPlaying: false
			},
			// Time-only change
			{
				id: '3',
				line: 'Same text',
				speaker: 'Bill',
				time: '0:10',
				editState: 'unedited',
				originalText: 'Same text',
				originalSpeaker: 'Bill',
				originalTime: '0:05',
				edited: false,
				isEditing: false,
				isHighlighted: false,
				isPlaying: false
			},
			// Multiple changes
			{
				id: '4',
				line: 'New text',
				speaker: 'Guest',
				time: '0:15',
				editState: 'unedited',
				originalText: 'Old text',
				originalSpeaker: 'Howard',
				originalTime: '0:07',
				edited: false,
				isEditing: false,
				isHighlighted: false,
				isPlaying: false
			}
		];

		const changedLinesCount = editorService.getChangedLinesCount(mixedChanges);
		const changedLines = editorService.getChangedLines(mixedChanges);

		expect(changedLinesCount).toBe(4);
		expect(changedLines).toHaveLength(4);

		// Each line should be detected as changed
		changedLines.forEach((line) => {
			expect(editorService.hasLineChanged(line)).toBe(true);
		});
	});
});
