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

			expect(updatedLines[0].line).toBe('Updated text');
		});

		it('should stop reporting a change once the text is typed back to the original', () => {
			const lines = createTestTranscript();
			const changedLines = editorService.updateLineText(lines, 0, 'Updated text');
			expect(editorService.hasLineChanged(changedLines[0])).toBe(true);

			const revertedLines = editorService.updateLineText(changedLines, 0, 'Welcome to the show');
			expect(editorService.hasLineChanged(revertedLines[0])).toBe(false);
			expect(editorService.getChangedLines(revertedLines)).toHaveLength(0);
		});

		it('should maintain edited flag consistency', () => {
			const lines = createTestTranscript();
			const updatedLines = editorService.updateLineText(lines, 0, 'Updated text');

			expect(updatedLines[0].edited).toBe(false); // Not committed yet
		});
	});

	// `edited` is the human-reviewed badge shown in search results, and
	// apply_episode_submission now persists it per line instead of forcing every
	// line to true. That makes these paths load-bearing: anything that silently
	// clears the flag now silently un-reviews a line in the database.
	describe('resolveEditedFlag() - Review Badge Preservation', () => {
		it('should keep the badge when a reviewed line is retyped', () => {
			const lines = [createMockLine('1', 'Reviewed text', 'Howard', '0:01', { edited: true })];
			const updatedLines = editorService.updateLineText(lines, 0, 'Corrected text');

			expect(updatedLines[0].edited).toBe(true);
		});

		it('should keep the badge when a reviewed line changes speaker', () => {
			const lines = [createMockLine('1', 'Reviewed text', 'Howard', '0:01', { edited: true })];
			const updatedLines = editorService.updateLineSpeaker(lines, 0, 'Todd');

			expect(updatedLines[0].edited).toBe(true);
		});

		it('should not grant the badge to an unreviewed line that is merely edited', () => {
			const lines = createTestTranscript();
			const updatedLines = editorService.updateLineText(lines, 0, 'Updated text');

			expect(updatedLines[0].edited).toBe(false);
		});

		it('should survive further edits after a commit without losing the badge', () => {
			// The case that ruled out clearing the badge on content change:
			// hasLineChanged() stays true after the commit, so a subsequent edit must
			// not read that as "never reviewed".
			//
			// This used to also exercise saveLine() and massAction('save'), both of
			// which are gone - they only moved a line between 'unsaved' and 'saved',
			// a distinction that never persisted anything.
			let lines = createTestTranscript();
			lines = editorService.updateLineText(lines, 0, 'Corrected text');
			lines = editorService.commitLine(lines, 0);
			expect(lines[0].edited).toBe(true);

			lines = editorService.updateLineText(lines, 0, 'Corrected text, again');
			expect(lines[0].edited).toBe(true);

			lines = editorService.updateLineSpeaker(lines, 0, 'Todd');
			expect(lines[0].edited).toBe(true);
		});

		it('should still clear the badge on an explicit reset-edited', () => {
			let lines = createTestTranscript();
			lines = editorService.commitLine(lines, 0);
			expect(lines[0].edited).toBe(true);

			lines = editorService.massAction(lines, [0], 'reset-edited');
			expect(lines[0].edited).toBe(false);
		});
	});

	describe('updateLineTimestamp() - Timestamp Change State Transitions', () => {
		it('should set editState to unsaved when timestamp changes', () => {
			const lines = createTestTranscript();
			const originalLineId = lines[0].id;
			const updatedLines = editorService.updateLineTimestamp(lines, 0, '0:10');

			// Find the line that was changed (it may have moved due to sorting)
			const changedLine = updatedLines.find((line) => line.id === originalLineId);
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

			// Find the line again after reverting - updateLineTimestamp re-sorts, so
			// the index is not stable but the id is.
			const revertedLine = revertedLines.find((line) => line.id === originalLineId);
			expect(revertedLine).toBeDefined();
			expect(editorService.hasLineChanged(revertedLine!)).toBe(false);
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

			// Every line moved, so every line is now a pending change.
			shiftedLines.forEach((line) => {
				expect(editorService.hasLineChanged(line)).toBe(true);
			});
			expect(editorService.getChangedLines(shiftedLines)).toHaveLength(lines.length);
		});

		it('should keep lines as unedited when shifted back to original', () => {
			const lines = createTestTranscript();
			const shiftedLines = editorService.shiftAllLinesTime(lines, 10);
			const revertedLines = editorService.shiftAllLinesTime(shiftedLines, -10);

			// Shifting back by the same amount restores the original timestamps, so
			// nothing should remain to submit.
			revertedLines.forEach((line) => {
				expect(editorService.hasLineChanged(line)).toBe(false);
			});
			expect(editorService.getChangedLines(revertedLines)).toHaveLength(0);
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

		it('should return lines reviewed this session even without content changes', () => {
			const lines = createTestTranscript();

			// Marking a line reviewed is itself a change worth submitting - `edited`
			// is a persisted column, so flipping it has to reach the database.
			lines[0].edited = true;
			lines[1].edited = true;

			const changedLines = editorService.getChangedLines(lines);

			expect(changedLines).toHaveLength(2);
			expect(changedLines.map((l) => l.id)).toEqual(['1', '2']);
		});

		it('should not return lines that arrived already reviewed and were not touched', () => {
			const lines = createTestTranscript();

			// Seven episodes carry edited=true on every row from the pre-migration
			// apply function. Re-submitting them is a no-op, and counting them made
			// s04e02 open reporting 629 pending changes on an untouched transcript.
			lines[0].edited = true;
			lines[0].originalEdited = true;

			expect(editorService.getChangedLines(lines)).toHaveLength(0);
		});

		it('should not return unedited lines without edited flag', () => {
			const lines = createTestTranscript();
			// All lines are unedited and edited=false by default

			const changedLines = editorService.getChangedLines(lines);

			expect(changedLines).toHaveLength(0);
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
			});
		});
	});
});
