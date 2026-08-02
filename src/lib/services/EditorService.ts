import type {
	EditableTranscriptLineType,
	SpeakerType,
	EpisodeSubmissionType,
	LineStatusType,
	MassActionType
} from '../types/editor';
import type { IEditorRepository } from '../repositories/EditorRepository';
import { SupabaseEditorRepository } from '../repositories/EditorRepository';
import { createErrorHandler } from '../utils/errors';
import {
	deriveSpeakerRoster,
	countLinesBySpeaker,
	addCustomSpeaker,
	findSpeaker
} from '../utils/speakerRoster';
import epListData from '../../assets/episodes6.json';
import { supabase } from '$lib/supabase';
import {
	normalizeTimestamp,
	isValidTimestampFormat,
	timestampToSeconds,
	secondsToNormalizedTimestamp
} from '../utils/audioSync';

interface EpisodeListItemType {
	ep: string;
	title: string;
	desc: string;
	date: string;
	url: string;
	feedTitle: string;
	hasAudio: boolean;
	startingTime: number;
}

const epList: EpisodeListItemType[] = epListData as EpisodeListItemType[];

export class EditorService {
	private repository: IEditorRepository | null = null;
	private readonly handleError = createErrorHandler('EditorService');

	constructor(repository?: IEditorRepository) {
		this.repository = repository || null;
	}

	private async getRepository(): Promise<IEditorRepository> {
		if (this.repository) {
			return this.repository;
		}
		return new SupabaseEditorRepository();
	}

	async loadEpisodeTranscript(episodeId: string): Promise<EditableTranscriptLineType[]> {
		try {
			const repository = await this.getRepository();
			return await repository.fetchEpisodeTranscript(episodeId);
		} catch (error) {
			throw this.handleError(error);
		}
	}

	async loadEpisodes(): Promise<
		Array<{ ep: string; title: string; season: string; hasAudio: boolean }>
	> {
		try {
			const repository = await this.getRepository();
			return await repository.fetchAllEpisodes();
		} catch (error) {
			throw this.handleError(error);
		}
	}

	async loadEpisodesWithEditStatus(): Promise<
		Array<{ ep: string; title: string; season: string; hasAudio: boolean; hasEdits: boolean }>
	> {
		try {
			const repository = await this.getRepository();
			return await repository.fetchEpisodesWithEditStatus();
		} catch (error) {
			throw this.handleError(error);
		}
	}

	// Utility methods for transcript editing
	updateLineText(
		lines: EditableTranscriptLineType[],
		lineIndex: number,
		newText: string
	): EditableTranscriptLineType[] {
		const updatedLines = [...lines];
		const line = updatedLines[lineIndex];

		if (line) {
			updatedLines[lineIndex] = {
				...line,
				line: newText,
				edited: this.resolveEditedFlag(line)
			};
		}

		return updatedLines;
	}

	updateLineSpeaker(
		lines: EditableTranscriptLineType[],
		lineIndex: number,
		newSpeaker: string
	): EditableTranscriptLineType[] {
		const updatedLines = [...lines];
		const line = updatedLines[lineIndex];

		if (line) {
			updatedLines[lineIndex] = {
				...line,
				speaker: newSpeaker,
				edited: this.resolveEditedFlag(line)
			};
		}

		return updatedLines;
	}

	updateLineTimestamp(
		lines: EditableTranscriptLineType[],
		lineIndex: number,
		newTimestamp: string
	): EditableTranscriptLineType[] {
		if (!isValidTimestampFormat(newTimestamp)) {
			throw new Error('Invalid timestamp format. Use HH:MM:SS or MM:SS');
		}

		// Normalize timestamp to single-digit format (0:00:01 instead of 00:00:01)
		const normalizedTimestamp = normalizeTimestamp(newTimestamp);

		const updatedLines = [...lines];
		const line = updatedLines[lineIndex];

		if (line) {
			updatedLines[lineIndex] = {
				...line,
				time: normalizedTimestamp
			};
		}

		// Sort lines chronologically by timestamp after any timestamp change
		return this.sortLinesByTimestamp(updatedLines);
	}

	splitLine(
		lines: EditableTranscriptLineType[],
		lineIndex: number,
		splitPosition: number
	): EditableTranscriptLineType[] {
		const updatedLines = [...lines];
		const line = updatedLines[lineIndex];

		if (line && splitPosition > 0 && splitPosition < line.line.length) {
			const firstPart = line.line.substring(0, splitPosition).trim();
			const secondPart = line.line.substring(splitPosition).trim();

			if (firstPart && secondPart) {
				// Update first line
				updatedLines[lineIndex] = {
					...line,
					line: firstPart
				};

				// Create second line
				const secondLine: EditableTranscriptLineType = {
					...line,
					id: `${line.id}-split-${Date.now()}`,
					line: secondPart,
					originalText: secondPart
				};

				// Insert second line after current
				updatedLines.splice(lineIndex + 1, 0, secondLine);
			}
		}

		return updatedLines;
	}

	mergeLine(lines: EditableTranscriptLineType[], lineIndex: number): EditableTranscriptLineType[] {
		const updatedLines = [...lines];
		const currentLine = updatedLines[lineIndex];
		const nextLine = updatedLines[lineIndex + 1];

		if (currentLine && nextLine) {
			// Merge lines if they have the same speaker
			if (currentLine.speaker === nextLine.speaker) {
				const mergedText = `${currentLine.line} ${nextLine.line}`;
				updatedLines[lineIndex] = {
					...currentLine,
					line: mergedText
				};

				// Remove next line
				updatedLines.splice(lineIndex + 1, 1);
			}
		}

		return updatedLines;
	}

	addNewLineBefore(
		lines: EditableTranscriptLineType[],
		lineIndex: number,
		speaker?: string
	): EditableTranscriptLineType[] {
		const updatedLines = [...lines];
		const referenceLine = updatedLines[lineIndex];

		if (referenceLine) {
			const newLine: EditableTranscriptLineType = {
				id: `new-line-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
				line: '',
				speaker: speaker || referenceLine.speaker,
				time: referenceLine.time, // Will need manual timestamp adjustment
				edited: true,
				isEditing: true,
				originalText: '',
				originalSpeaker: speaker || referenceLine.speaker,
				originalTime: referenceLine.time
			};

			// Insert new line before current line
			updatedLines.splice(lineIndex, 0, newLine);
		}

		return updatedLines;
	}

	addNewLineAfter(
		lines: EditableTranscriptLineType[],
		lineIndex: number,
		speaker?: string
	): EditableTranscriptLineType[] {
		const updatedLines = [...lines];
		const referenceLine = updatedLines[lineIndex];

		if (referenceLine) {
			// Try to calculate a reasonable timestamp for the new line
			let newTimestamp = referenceLine.time;
			const nextLine = updatedLines[lineIndex + 1];

			if (nextLine) {
				// Calculate midpoint timestamp between current and next line
				const currentSeconds = this.timestampToSeconds(referenceLine.time);
				const nextSeconds = this.timestampToSeconds(nextLine.time);
				const midpointSeconds = currentSeconds + (nextSeconds - currentSeconds) / 2;
				newTimestamp = this.secondsToTimestamp(midpointSeconds);
			}

			const newLine: EditableTranscriptLineType = {
				id: `new-line-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
				line: '',
				speaker: speaker || referenceLine.speaker,
				time: newTimestamp,
				edited: true,
				isEditing: true,
				originalText: '',
				originalSpeaker: speaker || referenceLine.speaker,
				originalTime: newTimestamp
			};

			// Insert new line after current line
			updatedLines.splice(lineIndex + 1, 0, newLine);
		}

		return updatedLines;
	}

	// Delete a line
	deleteLine(lines: EditableTranscriptLineType[], lineIndex: number): EditableTranscriptLineType[] {
		const updatedLines = [...lines];

		// Don't allow deletion if it's the only line left
		if (updatedLines.length <= 1) {
			return updatedLines;
		}

		// Remove the line at the specified index
		updatedLines.splice(lineIndex, 1);

		// A deletion leaves no mark on any surviving line. This used to nudge a
		// neighbour into 'unsaved' so the Submit button would appear; with the state
		// field gone, deletion tracking moves to the store, which compares the line
		// count against what was loaded.
		return updatedLines;
	}

	findLineByTimestamp(lines: EditableTranscriptLineType[], timestamp: string): number {
		const targetSeconds = this.timestampToSeconds(timestamp);

		let closest = 0;
		let closestDiff = Infinity;

		lines.forEach((line, index) => {
			const lineSeconds = this.timestampToSeconds(line.time);
			const diff = Math.abs(lineSeconds - targetSeconds);

			if (diff < closestDiff) {
				closestDiff = diff;
				closest = index;
			}
		});

		return closest;
	}

	timestampToSeconds(timestamp: string): number {
		return timestampToSeconds(timestamp);
	}

	secondsToTimestamp(seconds: number): string {
		return secondsToNormalizedTimestamp(seconds);
	}

	getSpeakerByName(speakers: SpeakerType[], name: string): SpeakerType | null {
		return findSpeaker(speakers, name);
	}

	/**
	 * Index of `name` in the roster, or -1.
	 *
	 * Case-insensitive, unlike the exact `s.name === currentSpeaker` these used to
	 * do: a line reading `howard` against a roster entry `Howard` counted as a
	 * miss, which fed -1 into the arithmetic below.
	 */
	private indexOfSpeaker(speakers: SpeakerType[], name: string): number {
		const target = name.trim().toLowerCase();
		return speakers.findIndex((s) => s.name.trim().toLowerCase() === target);
	}

	getNextSpeaker(speakers: SpeakerType[], currentSpeaker: string): SpeakerType | null {
		if (speakers.length === 0) return null;
		const i = this.indexOfSpeaker(speakers, currentSpeaker);
		// An unrecognised speaker starts the cycle rather than skipping the first
		// entry, which `(-1 + 1) % len` happened to do correctly but only by luck.
		return speakers[i === -1 ? 0 : (i + 1) % speakers.length];
	}

	getPreviousSpeaker(speakers: SpeakerType[], currentSpeaker: string): SpeakerType | null {
		if (speakers.length === 0) return null;
		const i = this.indexOfSpeaker(speakers, currentSpeaker);
		// `i === 0 ? len - 1 : i - 1` evaluated to speakers[-2] for an unrecognised
		// speaker, so Shift+Tab threw "Cannot read properties of undefined".
		return speakers[i <= 0 ? speakers.length - 1 : i - 1];
	}

	/**
	 * The roster for a loaded episode: the recurring cast merged with the speakers
	 * actually present, plus any guests the user has added.
	 *
	 * Replaces `initializeSpeakers()`, which returned a fixed cast list regardless
	 * of the transcript. Because an unedited episode is entirely diarization
	 * labels, nothing in it ever matched that list, and every line fell through to
	 * the "Unknown" entry.
	 */
	deriveSpeakers(lines: EditableTranscriptLineType[], extras: string[] = []): SpeakerType[] {
		return deriveSpeakerRoster(lines, extras);
	}

	/** Lines per speaker, keyed by the stored `speaker` value. */
	countLinesBySpeaker(lines: EditableTranscriptLineType[]): Map<string, number> {
		return countLinesBySpeaker(lines);
	}

	/**
	 * Relabel every line belonging to one speaker.
	 *
	 * The first pass on an unedited episode: say once that `spk_0` is Todd Padre
	 * and 205 lines are correct before the line-by-line pass starts. Diarization is
	 * imperfect, so some will be wrong - but they start right more often than not.
	 *
	 * Deliberately not a `massAction`. That union's contract is (lines, indices,
	 * action) with no payload and every branch is a state transition; rename
	 * carries data and changes content, so folding it in would make the options
	 * type a lie.
	 *
	 * Renamed lines come out *modified but not reviewed*: `edited` is untouched via
	 * resolveEditedFlag, so they enter the submission and show the Modified badge
	 * while the reviewed badge stays for lines a human actually confirmed. Renaming
	 * to a name already in use merges the two speakers, which is intended - it is
	 * how two diarization labels for one person get combined.
	 */
	renameSpeaker(
		lines: EditableTranscriptLineType[],
		from: string,
		to: string,
		options?: { lineIndices?: number[] }
	): { lines: EditableTranscriptLineType[]; changedCount: number; indices: number[] } {
		const target = to.trim();
		const source = from.trim().toLowerCase();

		if (!target || !source) {
			return { lines, changedCount: 0, indices: [] };
		}

		const limit = options?.lineIndices ? new Set(options.lineIndices) : null;
		const indices: number[] = [];

		const updated = lines.map((line, index) => {
			if (limit && !limit.has(index)) return line;
			if (line.speaker.trim().toLowerCase() !== source) return line;
			if (line.speaker === target) return line;

			indices.push(index);
			return {
				...line,
				speaker: target,
				edited: this.resolveEditedFlag(line)
			};
		});

		// Returning the original array when nothing matched keeps referential
		// equality, so Svelte does not re-render 732 rows for a no-op.
		if (indices.length === 0) {
			return { lines, changedCount: 0, indices: [] };
		}

		return { lines: updated, changedCount: indices.length, indices };
	}

	addCustomSpeaker(speakers: SpeakerType[], name: string): SpeakerType[] {
		return addCustomSpeaker(speakers, name);
	}

	// Shift all line timestamps by a given number of seconds
	shiftAllLinesTime(
		lines: EditableTranscriptLineType[],
		shiftSeconds: number
	): EditableTranscriptLineType[] {
		if (shiftSeconds === 0) return lines;

		return lines.map((line) => {
			const currentSeconds = this.timestampToSeconds(line.time);
			const newSeconds = Math.max(0, currentSeconds + shiftSeconds); // Don't allow negative timestamps
			const newTimestamp = this.secondsToTimestamp(newSeconds);

			return {
				...line,
				time: newTimestamp
			};
		});
	}

	// Set timestamp to previous line + 1 second
	setTimestampToPreviousPlusOne(
		lines: EditableTranscriptLineType[],
		lineIndex: number
	): EditableTranscriptLineType[] {
		if (lineIndex <= 0) return lines; // Can't set if no previous line

		const updatedLines = [...lines];
		const previousLine = updatedLines[lineIndex - 1];
		const currentLine = updatedLines[lineIndex];

		if (previousLine && currentLine) {
			const previousSeconds = this.timestampToSeconds(previousLine.time);
			const newTimestamp = this.secondsToTimestamp(previousSeconds + 1);

			updatedLines[lineIndex] = {
				...currentLine,
				time: newTimestamp
			};
		}

		return updatedLines;
	}

	// `saveLine` and `saveAllChanges` are gone along with the 'unsaved'/'saved'
	// distinction they maintained. Every store mutation already calls
	// saveToLocalStorage(), so pressing `w` persisted nothing - it only moved a
	// badge colour. What a line looks like is now derived from whether it differs
	// from what was loaded, which needs no separate save step.

	// Commit a line (mark as edited/done)
	commitLine(lines: EditableTranscriptLineType[], lineIndex: number): EditableTranscriptLineType[] {
		const updatedLines = [...lines];
		const line = updatedLines[lineIndex];

		if (line) {
			// Always mark as 'edited' when explicitly committed, regardless of changes
			// This allows users to mark lines as reviewed/verified even if content is correct
			updatedLines[lineIndex] = {
				...line,
				edited: true
			};
		}

		return updatedLines;
	}

	// Get episode info for audio matching
	async getEpisodeAudioInfo(
		episodeId: string
	): Promise<{ title: string; feedTitle?: string } | null> {
		try {
			const episode = epList.find((ep) => ep.ep === episodeId);
			if (episode) {
				return {
					title: episode.title,
					feedTitle: episode.feedTitle
				};
			}
			return null;
		} catch (error) {
			console.warn('Failed to get episode audio info:', error);
			return null;
		}
	}

	// Detect changes in a line
	hasLineChanged(line: EditableTranscriptLineType): boolean {
		return (
			line.line !== line.originalText ||
			line.speaker !== line.originalSpeaker ||
			line.time !== line.originalTime
		);
	}

	// Decide whether a line keeps its human-reviewed badge (`edited`) after its
	// content is edited or saved. Called by updateLineText, updateLineSpeaker,
	// saveLine, saveAllChanges and the bulk 'save' action - every path that
	// changes a line's content without the user explicitly reviewing or
	// un-reviewing it. commitLine() and 'reset-edited' set the flag directly and
	// do not go through here.
	//
	// Editing content never revokes the badge. The tempting alternative - clear it
	// whenever hasActualChanges is true, on the grounds that a review vouches for
	// specific text - cannot be expressed with the state available here:
	// hasActualChanges compares against originalText/Speaker/Time, which is the
	// line as *loaded*, not as reviewed. A line the user edited and then committed
	// stays hasActualChanges === true for the rest of the session, so that rule
	// would let a later bulk save silently un-review it. Only commitLine() and
	// 'reset-edited' move this flag.
	resolveEditedFlag(line: EditableTranscriptLineType): boolean {
		return line.edited;
	}

	// Get change types for a line
	getLineChangeTypes(line: EditableTranscriptLineType): string[] {
		const changes: string[] = [];

		if (line.line !== line.originalText) {
			changes.push('text');
		}
		if (line.speaker !== line.originalSpeaker) {
			changes.push('speaker');
		}
		if (line.time !== line.originalTime) {
			changes.push('timestamp');
		}

		return changes;
	}

	/**
	 * How a line should be presented. Derived, never stored.
	 *
	 * The old `editState` field conflated three separate things: whether a line
	 * differs from what was loaded (derivable), whether a human has vouched for it
	 * (`edited`, which is persisted), and an 'unsaved'/'saved' distinction that did
	 * nothing. Storing the first is what let `updateLineText` silently downgrade a
	 * reviewed line to 'unedited' and drop it from the submission while it still
	 * painted the reviewed badge.
	 */
	lineStatus(line: EditableTranscriptLineType): LineStatusType {
		const modified = this.hasLineChanged(line);
		if (modified && line.edited) return 'modified-reviewed';
		if (modified) return 'modified';
		if (line.edited) return 'reviewed';
		return 'unchanged';
	}

	/**
	 * Everything that goes to moderation: content that differs from what was
	 * loaded, plus anything a human explicitly marked reviewed.
	 *
	 * Equivalent to the old four-way predicate on every reachable line state - see
	 * the exhaustive comparison in EditorService.changeDetection.test.ts. It is
	 * deliberately broader in one case (a reviewed line with no content change now
	 * stays in the submission instead of being dropped while still showing the
	 * badge) and narrower only for lines forced into 'unsaved'/'saved' without a
	 * content change, which was reachable solely through the mass actions removed
	 * alongside this.
	 */
	getChangedLines(lines: EditableTranscriptLineType[]): EditableTranscriptLineType[] {
		return lines.filter((line) => this.hasLineChanged(line) || this.hasReviewChanged(line));
	}

	/**
	 * Whether the review badge differs from how the line was loaded.
	 *
	 * Not simply `line.edited`: seven episodes arrive with every row already
	 * flagged, and re-submitting a line that is already stored that way is a no-op
	 * that would show the user hundreds of phantom pending changes.
	 */
	hasReviewChanged(line: EditableTranscriptLineType): boolean {
		return line.edited !== (line.originalEdited ?? false);
	}

	/** Indices of lines differing from what was loaded. */
	getModifiedLines(lines: EditableTranscriptLineType[]): number[] {
		return lines
			.map((line, index) => (this.hasLineChanged(line) ? index : -1))
			.filter((index) => index !== -1);
	}

	/** Indices of lines a human has marked reviewed. */
	getReviewedLines(lines: EditableTranscriptLineType[]): number[] {
		return lines.map((line, index) => (line.edited ? index : -1)).filter((index) => index !== -1);
	}

	// Helper method to check if any lines have changes - used by stores and components
	hasAnyChanges(lines: EditableTranscriptLineType[]): boolean {
		return this.getChangedLines(lines).length > 0;
	}

	// Helper method to count changed lines - used by stores and components
	getChangedLinesCount(lines: EditableTranscriptLineType[]): number {
		return this.getChangedLines(lines).length;
	}

	// Sort lines chronologically by timestamp
	sortLinesByTimestamp(lines: EditableTranscriptLineType[]): EditableTranscriptLineType[] {
		return [...lines].sort((a, b) => {
			const aSeconds = this.timestampToSeconds(a.time);
			const bSeconds = this.timestampToSeconds(b.time);
			return aSeconds - bSeconds;
		});
	}

	// Submit entire episode transcript
	async submitEpisodeTranscript(
		episodeEp: string,
		transcriptLines: EditableTranscriptLineType[],
		contributorInfo?: { name?: string; email?: string; notes?: string }
	): Promise<string> {
		try {
			const repository = await this.getRepository();

			// Get current user if authenticated
			let userId: string | undefined;
			try {
				const { data } = await supabase.auth.getUser();
				userId = data.user?.id;
			} catch {
				// Not authenticated, that's fine for anonymous submissions
				userId = undefined;
			}

			// Create episode submission
			const episodeSubmission: EpisodeSubmissionType = {
				episodeEp,
				submissionType: 'full_replacement',
				transcriptData: transcriptLines,
				contributorName: contributorInfo?.name,
				contributorEmail: contributorInfo?.email,
				notes: contributorInfo?.notes
			};

			const submissionId = await repository.submitEpisodeTranscript(episodeSubmission, userId);
			return submissionId;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	// Get current user info
	async getCurrentUserInfo(): Promise<{ id: string; email: string } | null> {
		try {
			const { data, error } = await supabase.auth.getUser();
			if (error || !data.user) {
				return null;
			}
			return {
				id: data.user.id,
				email: data.user.email || ''
			};
		} catch (error) {
			console.warn('Error getting user info:', error);
			return null;
		}
	}

	// Check if user is authenticated
	async isUserAuthenticated(): Promise<boolean> {
		const userInfo = await this.getCurrentUserInfo();
		return userInfo !== null;
	}

	// Reset line changes (mark as no longer having changes)
	resetLineChanges(lines: EditableTranscriptLineType[]): EditableTranscriptLineType[] {
		return lines.map((line) => ({
			...line,
			// Preserve 'edited' state, only reset 'unsaved' and 'saved' to 'unedited'
			originalText: line.line,
			originalSpeaker: line.speaker,
			originalTime: line.time
		}));
	}

	/**
	 * Bulk operations on selected lines.
	 *
	 * Down from nine actions to four. `save` became a no-op once the
	 * 'unsaved'/'saved' distinction went; `set-edited` duplicated `commit`; and
	 * `set-unedited`/`set-unsaved`/`set-saved` went through `changeLineStates`,
	 * which assigned `edited: newState === 'edited'` and so silently revoked
	 * review badges - exactly what `resolveEditedFlag` documents must only ever
	 * happen through `reset-edited`.
	 */
	massAction(
		lines: EditableTranscriptLineType[],
		lineIndices: number[],
		action: MassActionType,
		options?: { confirmDelete?: boolean }
	): EditableTranscriptLineType[] {
		let updatedLines = [...lines];

		switch (action) {
			case 'commit':
				lineIndices.forEach((index) => {
					if (index >= 0 && index < updatedLines.length) {
						const line = updatedLines[index];
						if (line) {
							updatedLines[index] = {
								...line,
								edited: true
							};
						}
					}
				});
				break;

			case 'reset-edited':
				lineIndices.forEach((index) => {
					if (index >= 0 && index < updatedLines.length) {
						const line = updatedLines[index];
						if (line?.edited) {
							updatedLines[index] = {
								...line,
								// Explicitly un-reviewing a line, so the badge always clears -
								// this does not go through resolveEditedFlag.
								edited: false
							};
						}
					}
				});
				break;

			case 'delete': {
				if (!options?.confirmDelete) {
					throw new Error('Delete action requires confirmation');
				}
				// Sort indices in descending order to avoid index shifting issues.
				// Copy first - callers pass editorStore.selectedLineIndices straight
				// through, and sorting in place would reorder their reactive state.
				const sortedIndices = [...lineIndices].sort((a, b) => b - a);
				sortedIndices.forEach((index) => {
					if (index >= 0 && index < updatedLines.length && updatedLines.length > 1) {
						updatedLines.splice(index, 1);
					}
				});

				// A deletion leaves no trace on any surviving line, so the transcript
				// would otherwise look unchanged and never be submitted. Previously a
				// neighbouring line was nudged into 'unsaved' to force that; with the
				// state field gone there is nothing to nudge. Deletions are picked up
				// because the submission sends the whole transcript and the moderator
				// diff compares line counts.
				break;
			}

			case 'revert-to-original':
				updatedLines = this.revertLinesToOriginal(updatedLines, lineIndices);
				break;

			default:
				throw new Error(`Unknown mass action: ${action}`);
		}

		return updatedLines;
	}

	/** Clear a single line's review badge. */
	resetLineEditedState(
		lines: EditableTranscriptLineType[],
		lineIndex: number
	): EditableTranscriptLineType[] {
		const updatedLines = [...lines];
		const line = updatedLines[lineIndex];

		if (line?.edited) {
			updatedLines[lineIndex] = { ...line, edited: false };
		}

		return updatedLines;
	}

	// Get lines by speaker for mass actions
	getLinesBySpeaker(lines: EditableTranscriptLineType[], speakerName: string): number[] {
		return lines
			.map((line, index) => (line.speaker.toLowerCase() === speakerName.toLowerCase() ? index : -1))
			.filter((index) => index !== -1);
	}

	// Revert lines to their original state (undo all changes)
	revertLinesToOriginal(
		lines: EditableTranscriptLineType[],
		lineIndices: number[]
	): EditableTranscriptLineType[] {
		// eslint-disable-next-line prefer-const
		let updatedLines = [...lines];

		lineIndices.forEach((index) => {
			if (index >= 0 && index < updatedLines.length) {
				const line = updatedLines[index];
				if (line && (line.originalText || line.originalSpeaker || line.originalTime)) {
					updatedLines[index] = {
						...line,
						line: line.originalText || line.line,
						speaker: line.originalSpeaker || line.speaker,
						time: line.originalTime || line.time,
						edited: false
					};
				}
			}
		});

		return updatedLines;
	}
}

export const editorService = new EditorService();
