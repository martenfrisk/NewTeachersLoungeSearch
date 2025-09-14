import { describe, it, expect, beforeEach } from 'vitest';
import { EditorService } from './EditorService';
import type { EditableTranscriptLineType, EpisodeSubmissionType } from '../types/editor';
import type { IEditorRepository } from '../repositories/EditorRepository';

// Mock Repository Implementation for Testing
class MockEditorRepository implements IEditorRepository {
	private mockTranscripts = new Map<string, EditableTranscriptLineType[]>();
	private mockEpisodes: Array<{ ep: string; title: string; season: string; hasAudio: boolean }> =
		[];
	private submissionId = 'test-submission-123';

	async fetchEpisodeTranscript(episodeId: string): Promise<EditableTranscriptLineType[]> {
		return this.mockTranscripts.get(episodeId) || [];
	}

	async fetchAllEpisodes() {
		return this.mockEpisodes;
	}

	async fetchEpisodesWithEditStatus() {
		return this.mockEpisodes.map((ep) => ({ ...ep, hasEdits: false }));
	}

	async submitEpisodeTranscript(
		_submission: EpisodeSubmissionType,
		_userId?: string
	): Promise<string> {
		// Simulate submission process
		return this.submissionId;
	}

	// Mock implementations for moderation methods
	async fetchPendingEpisodeSubmissions() {
		return [];
	}

	async fetchApprovedEpisodeSubmissions() {
		return [];
	}

	async fetchRejectedEpisodeSubmissions() {
		return [];
	}

	async approveEpisodeSubmission(_submissionId: string, _moderatorId: string): Promise<void> {
		// Mock implementation
	}

	async rejectEpisodeSubmission(
		_submissionId: string,
		_moderatorId: string,
		_reason?: string
	): Promise<void> {
		// Mock implementation
	}

	// Mock implementations for version history methods
	async fetchEpisodeVersionHistory(_episodeEp: string) {
		return [];
	}

	async fetchEpisodeCurrentVersion(_episodeEp: string) {
		return null;
	}

	async restoreEpisodeVersion(_versionId: string, _userId?: string): Promise<void> {
		// Mock implementation
	}

	async fetchVersionDiffSummary(_fromVersionId: string, _toVersionId: string) {
		return { linesAdded: 0, linesRemoved: 0, linesModified: 0, totalChanges: 0 };
	}

	async fetchArchivedTranscriptLines(_versionId: string) {
		return [];
	}

	// Test helper methods
	setMockTranscript(episodeId: string, lines: EditableTranscriptLineType[]) {
		this.mockTranscripts.set(episodeId, lines);
	}

	setMockEpisodes(
		episodes: Array<{ ep: string; title: string; season: string; hasAudio: boolean }>
	) {
		this.mockEpisodes = episodes;
	}

	setMockSubmissionId(id: string) {
		this.submissionId = id;
	}
}

// Test Data Fixtures
function createMockLine(
	id: string,
	line: string,
	speaker: string,
	time: string,
	overrides: Partial<EditableTranscriptLineType> = {}
): EditableTranscriptLineType {
	return {
		id,
		line,
		speaker,
		time,
		editState: 'unedited',
		originalText: line,
		originalSpeaker: speaker,
		originalTime: time,
		edited: false,
		isEditing: false,
		isHighlighted: false,
		isPlaying: false,
		...overrides
	};
}

function createTestTranscript(): EditableTranscriptLineType[] {
	return [
		createMockLine('1', 'Welcome to the show', 'Howard', '0:01'),
		createMockLine('2', 'Thanks for having me', 'Todd', '0:03'),
		createMockLine('3', "Let's get started", 'Howard', '0:05'),
		createMockLine('4', 'Sounds good to me', 'Bill', '0:07')
	];
}

describe('EditorService - State Management', () => {
	let editorService: EditorService;
	let mockRepository: MockEditorRepository;

	beforeEach(() => {
		mockRepository = new MockEditorRepository();
		editorService = new EditorService(mockRepository);
	});

	describe('hasLineChanged() - Core Change Detection', () => {
		it('should detect text changes', () => {
			const line = createMockLine('1', 'Updated text', 'Howard', '0:00:01', {
				originalText: 'Original text'
			});

			expect(editorService.hasLineChanged(line)).toBe(true);
		});

		it('should detect speaker changes', () => {
			const line = createMockLine('1', 'Same text', 'Todd', '0:01', {
				originalSpeaker: 'Howard'
			});

			expect(editorService.hasLineChanged(line)).toBe(true);
		});

		it('should detect timestamp changes', () => {
			const line = createMockLine('1', 'Same text', 'Howard', '0:05', {
				originalTime: '0:01'
			});

			expect(editorService.hasLineChanged(line)).toBe(true);
		});

		it('should detect multiple simultaneous changes', () => {
			const line = createMockLine('1', 'New text', 'Todd', '0:05', {
				originalText: 'Original text',
				originalSpeaker: 'Howard',
				originalTime: '0:01'
			});

			expect(editorService.hasLineChanged(line)).toBe(true);
		});

		it('should return false when no changes exist', () => {
			const line = createMockLine('1', 'Same text', 'Howard', '0:01');

			expect(editorService.hasLineChanged(line)).toBe(false);
		});

		it('should handle edge cases like whitespace differences', () => {
			const line = createMockLine('1', 'Text with spaces ', 'Howard', '0:01', {
				originalText: 'Text with spaces'
			});

			expect(editorService.hasLineChanged(line)).toBe(true);
		});
	});

	describe('updateLineText() - Text Change State Transitions', () => {
		it('should set editState to unsaved when text changes', () => {
			const lines = createTestTranscript();
			const updatedLines = editorService.updateLineText(lines, 0, 'Updated text');

			expect(updatedLines[0].editState).toBe('unsaved');
			expect(updatedLines[0].line).toBe('Updated text');
		});

		it('should set editState to unedited when reverting to original', () => {
			const lines = createTestTranscript();
			const changedLines = editorService.updateLineText(lines, 0, 'Updated text');
			const revertedLines = editorService.updateLineText(changedLines, 0, 'Welcome to the show');

			expect(revertedLines[0].editState).toBe('unedited');
		});

		it('should maintain edited flag consistency', () => {
			const lines = createTestTranscript();
			const updatedLines = editorService.updateLineText(lines, 0, 'Updated text');

			expect(updatedLines[0].edited).toBe(false); // Not committed yet
		});
	});

	describe('updateLineTimestamp() - Timestamp Change State Transitions', () => {
		it('should set editState to unsaved when timestamp changes', () => {
			const lines = createTestTranscript();
			const originalLineId = lines[0].id;
			const updatedLines = editorService.updateLineTimestamp(lines, 0, '0:10');

			// Find the line that was changed (it may have moved due to sorting)
			const changedLine = updatedLines.find((line) => line.id === originalLineId);
			expect(changedLine?.editState).toBe('unsaved');
			expect(changedLine?.time).toBe('0:10');
		});

		it('should set editState to unedited when reverting to original timestamp', () => {
			const lines = createTestTranscript();
			const originalLineId = lines[0].id;

			// Change timestamp first
			const changedLines = editorService.updateLineTimestamp(lines, 0, '0:10');

			// Find the changed line in the sorted array
			const changedLineIndex = changedLines.findIndex((line) => line.id === originalLineId);

			// Revert it back
			const revertedLines = editorService.updateLineTimestamp(
				changedLines,
				changedLineIndex,
				'0:01'
			);

			// Find the line again after reverting
			const revertedLine = revertedLines.find((line) => line.id === originalLineId);
			expect(revertedLine?.editState).toBe('unedited');
		});

		it('should sort lines after timestamp updates', () => {
			const lines = createTestTranscript();
			// Move first line to end by changing timestamp
			const updatedLines = editorService.updateLineTimestamp(lines, 0, '0:20');

			// First line should now be at the end
			expect(updatedLines[3].id).toBe('1');
			expect(updatedLines[3].time).toBe('0:20');
		});

		it('should handle invalid timestamp format', () => {
			const lines = createTestTranscript();

			expect(() => {
				editorService.updateLineTimestamp(lines, 0, 'invalid-time');
			}).toThrow('Invalid timestamp format');
		});
	});

	describe('shiftAllLinesTime() - Bulk Timestamp Changes', () => {
		it('should update all timestamps when shifting', () => {
			const lines = createTestTranscript();
			const shiftedLines = editorService.shiftAllLinesTime(lines, 10); // Add 10 seconds

			expect(shiftedLines[0].time).toBe('0:11');
			expect(shiftedLines[1].time).toBe('0:13');
			expect(shiftedLines[2].time).toBe('0:15');
			expect(shiftedLines[3].time).toBe('0:17');
		});

		it('should mark lines as unsaved when timestamps change from original', () => {
			const lines = createTestTranscript();
			const shiftedLines = editorService.shiftAllLinesTime(lines, 10);

			// All lines should be marked as unsaved since timestamps changed
			shiftedLines.forEach((line) => {
				expect(line.editState).toBe('unsaved');
			});
		});

		it('should keep lines as unedited when shifted back to original', () => {
			const lines = createTestTranscript();
			const shiftedLines = editorService.shiftAllLinesTime(lines, 10);
			const revertedLines = editorService.shiftAllLinesTime(shiftedLines, -10);

			// All lines should be back to unedited since they match original
			revertedLines.forEach((line) => {
				expect(line.editState).toBe('unedited');
			});
		});

		it('should not allow negative timestamps', () => {
			const lines = createTestTranscript();
			const shiftedLines = editorService.shiftAllLinesTime(lines, -10);

			// All timestamps should be 0 or positive
			shiftedLines.forEach((line) => {
				const timeInSeconds = editorService.timestampToSeconds(line.time);
				expect(timeInSeconds).toBeGreaterThanOrEqual(0);
			});
		});

		it('should return original array when shift is zero', () => {
			const lines = createTestTranscript();
			const shiftedLines = editorService.shiftAllLinesTime(lines, 0);

			expect(shiftedLines).toEqual(lines);
		});
	});

	describe('getChangedLines() - Changed Line Detection', () => {
		it('should return lines with actual content changes', () => {
			const lines = createTestTranscript();

			// Make actual changes to the lines
			lines[0].line = 'Changed text'; // Text change
			lines[1].speaker = 'Sam'; // Speaker change
			lines[2].time = '0:10'; // Timestamp change

			const changedLines = editorService.getChangedLines(lines);

			expect(changedLines).toHaveLength(3);
			expect(changedLines.map((l) => l.id)).toEqual(['1', '2', '3']);
		});

		it('should return lines marked as edited even without content changes', () => {
			const lines = createTestTranscript();

			// Mark lines as edited without changing content
			lines[0].editState = 'edited';
			lines[1].editState = 'edited';

			const changedLines = editorService.getChangedLines(lines);

			expect(changedLines).toHaveLength(2);
			expect(changedLines.map((l) => l.id)).toEqual(['1', '2']);
		});

		it('should not return unedited lines without edited flag', () => {
			const lines = createTestTranscript();
			// All lines are unedited and edited=false by default

			const changedLines = editorService.getChangedLines(lines);

			expect(changedLines).toHaveLength(0);
		});
	});

	describe('Line State Transitions', () => {
		it('should transition from unedited -> unsaved -> saved -> edited correctly', () => {
			const lines = createTestTranscript();

			// unedited -> unsaved (make a change)
			const unsavedLines = editorService.updateLineText(lines, 0, 'Changed text');
			expect(unsavedLines[0].editState).toBe('unsaved');

			// unsaved -> saved (save the change)
			const savedLines = editorService.saveLine(unsavedLines, 0);
			expect(savedLines[0].editState).toBe('saved');

			// saved -> edited (commit the change)
			const editedLines = editorService.commitLine(savedLines, 0);
			expect(editedLines[0].editState).toBe('edited');
			expect(editedLines[0].edited).toBe(true);
		});

		it('should handle revert operations correctly', () => {
			const lines = createTestTranscript();

			// Make change and commit
			const changedLines = editorService.updateLineText(lines, 0, 'Changed text');
			const editedLines = editorService.commitLine(changedLines, 0);
			expect(editedLines[0].editState).toBe('edited');

			// Reset edited state
			const resetLines = editorService.resetLineEditedState(editedLines, 0);
			expect(resetLines[0].editState).toBe('saved'); // Should go to saved since content changed
			expect(resetLines[0].edited).toBe(false);
		});
	});

	describe('State Transition Edge Cases', () => {
		it('should detect changes after transitioning edited lines to unedited state', () => {
			const lines = createTestTranscript();

			// Simulate lines that have been edited and committed
			lines[0].line = 'Changed text';
			lines[0].editState = 'edited';
			lines[0].edited = true;
			lines[1].speaker = 'Sam';
			lines[1].editState = 'edited';
			lines[1].edited = true;

			// User selects all lines and changes state to "unedited"
			const updatedLines = editorService.changeLineStates(lines, [0, 1], 'unedited', false);

			// Lines should transition to 'saved' because they still have content changes
			expect(updatedLines[0].editState).toBe('saved');
			expect(updatedLines[1].editState).toBe('saved');

			// These lines should still be detected as changed for submission
			const changedLines = editorService.getChangedLines(updatedLines);
			const changedLinesCount = editorService.getChangedLinesCount(updatedLines);

			expect(changedLines).toHaveLength(2);
			expect(changedLinesCount).toBe(2);
			expect(editorService.hasAnyChanges(updatedLines)).toBe(true);
		});

		it('should not detect changes when truly reverting to original content', () => {
			const lines = createTestTranscript();

			// Simulate lines that have been edited but then reverted to original
			lines[0].line = 'Welcome to the show'; // Same as original
			lines[0].editState = 'edited';
			lines[0].edited = true;

			// User changes state to "unedited" - should go to truly unedited since no content changes
			const updatedLines = editorService.changeLineStates(lines, [0], 'unedited', false);

			expect(updatedLines[0].editState).toBe('unedited');
			expect(updatedLines[0].edited).toBe(false);

			// Should not be detected as changed
			const changedLines = editorService.getChangedLines(updatedLines);
			expect(changedLines).toHaveLength(0);
		});

		it('should reproduce the exact user issue: edited lines -> set to unedited -> no submit button', () => {
			// Create lines that simulate the exact user scenario
			const lines = createTestTranscript();

			// Simulate that these lines have been previously edited and are marked as 'edited'
			// but the content differs from original (like after making actual edits)
			lines[0].line = 'Modified welcome message';
			lines[0].editState = 'edited';
			lines[0].edited = true;
			lines[1].speaker = 'Sam';
			lines[1].editState = 'edited';
			lines[1].edited = true;
			lines[2].time = '0:10';
			lines[2].editState = 'edited';
			lines[2].edited = true;

			console.log('Before changing state:');
			console.log('Line 0:', {
				line: lines[0].line,
				originalText: lines[0].originalText,
				editState: lines[0].editState
			});
			console.log('Line 1:', {
				speaker: lines[1].speaker,
				originalSpeaker: lines[1].originalSpeaker,
				editState: lines[1].editState
			});
			console.log('Line 2:', {
				time: lines[2].time,
				originalTime: lines[2].originalTime,
				editState: lines[2].editState
			});

			// User selects all lines and changes state to "unedited"
			const allIndices = lines.map((_, index) => index);
			const updatedLines = editorService.changeLineStates(lines, allIndices, 'unedited', false);

			console.log('After changing state:');
			console.log('Line 0:', {
				line: updatedLines[0].line,
				originalText: updatedLines[0].originalText,
				editState: updatedLines[0].editState
			});
			console.log('Line 1:', {
				speaker: updatedLines[1].speaker,
				originalSpeaker: updatedLines[1].originalSpeaker,
				editState: updatedLines[1].editState
			});
			console.log('Line 2:', {
				time: updatedLines[2].time,
				originalTime: updatedLines[2].originalTime,
				editState: updatedLines[2].editState
			});

			// Check if lines are detected as changed (this should determine if Submit button appears)
			const changedLines = editorService.getChangedLines(updatedLines);
			const changedLinesCount = editorService.getChangedLinesCount(updatedLines);
			const hasChanges = editorService.hasAnyChanges(updatedLines);

			console.log('Detection results:');
			console.log('changedLinesCount:', changedLinesCount);
			console.log('hasChanges:', hasChanges);
			console.log(
				'changedLines:',
				changedLines.map((l) => ({ id: l.id, editState: l.editState }))
			);

			// The Submit button should appear because lines still have content changes
			expect(changedLinesCount).toBeGreaterThan(0);
			expect(hasChanges).toBe(true);
		});
	});

	describe('Integration - Complete Workflow', () => {
		it('should handle mixed change types correctly', () => {
			const lines = createTestTranscript();

			// Make text change to line 1
			let workingLines = editorService.updateLineText(lines, 0, 'Updated text');

			// Make timestamp change to line 2
			workingLines = editorService.updateLineTimestamp(workingLines, 1, '0:10');

			// Shift all timestamps
			workingLines = editorService.shiftAllLinesTime(workingLines, 5);

			const changedLines = editorService.getChangedLines(workingLines);

			// All lines should be marked as changed
			expect(changedLines).toHaveLength(4);

			// Verify each line has the expected changes
			expect(changedLines[0].line).toBe('Updated text'); // Text changed + shifted
			expect(changedLines.some((l) => l.time.includes('0:15'))).toBe(true); // Line 2 timestamp change + shift
		});

		it('should prepare correct data for submission', () => {
			const lines = createTestTranscript();

			// Make various changes
			let workingLines = editorService.updateLineText(lines, 0, 'Updated text');
			workingLines = editorService.updateLineSpeaker(workingLines, 1, 'Sam');
			workingLines = editorService.shiftAllLinesTime(workingLines, 5);

			const changedLines = editorService.getChangedLines(workingLines);

			// Should have changes for submission
			expect(changedLines.length).toBeGreaterThan(0);

			// Verify changed lines have the expected properties for submission
			changedLines.forEach((line) => {
				expect(line.id).toBeDefined();
				expect(line.editState).not.toBe('unedited');
			});
		});
	});
});
