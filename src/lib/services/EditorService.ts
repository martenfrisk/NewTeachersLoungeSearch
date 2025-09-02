import type {
	EditableTranscriptLineType,
	SpeakerType,
	EpisodeSubmissionType
} from '../types/editor';
import type { IEditorRepository } from '../repositories/EditorRepository';
import { SupabaseEditorRepository } from '../repositories/EditorRepository';
import { createErrorHandler } from '../utils/errors';
import { DEFAULT_SPEAKERS } from '../types/editor';
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
			const hasActualChanges = newText !== line.originalText;
			updatedLines[lineIndex] = {
				...line,
				line: newText,
				editState: hasActualChanges ? 'unsaved' : 'unedited',
				edited: hasActualChanges ? false : false
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
			const hasActualChanges = this.hasLineChanged({ ...line, speaker: newSpeaker });
			updatedLines[lineIndex] = {
				...line,
				speaker: newSpeaker,
				editState: hasActualChanges ? 'unsaved' : 'unedited',
				edited: hasActualChanges ? false : false
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
			const hasActualChanges = this.hasLineChanged({ ...line, time: normalizedTimestamp });
			updatedLines[lineIndex] = {
				...line,
				time: normalizedTimestamp,
				editState: hasActualChanges ? 'unsaved' : 'unedited'
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
				const hasFirstPartChanges = firstPart !== line.originalText;
				updatedLines[lineIndex] = {
					...line,
					line: firstPart,
					editState: hasFirstPartChanges ? 'unsaved' : 'unedited'
				};

				// Create second line
				const secondLine: EditableTranscriptLineType = {
					...line,
					id: `${line.id}-split-${Date.now()}`,
					line: secondPart,
					editState: 'unsaved',
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
				const hasChanges = mergedText !== currentLine.originalText;
				updatedLines[lineIndex] = {
					...currentLine,
					line: mergedText,
					editState: hasChanges ? 'unsaved' : 'unedited'
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
				editState: 'unsaved',
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
				editState: 'unsaved',
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

		// Mark a nearby line as changed to track that a deletion occurred
		// This ensures the "Submit Changes" button appears after deletion
		const nearbyIndex = Math.min(lineIndex, updatedLines.length - 1);
		if (nearbyIndex >= 0 && updatedLines[nearbyIndex]) {
			const nearbyLine = updatedLines[nearbyIndex];
			// Only mark as changed if it's not already marked as saved or edited
			if (nearbyLine.editState === 'unedited') {
				updatedLines[nearbyIndex] = {
					...nearbyLine,
					editState: 'unsaved'
				};
			}
		}

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
		return speakers.find((s) => s.name.toLowerCase() === name.toLowerCase()) || null;
	}

	getNextSpeaker(speakers: SpeakerType[], currentSpeaker: string): SpeakerType {
		const currentIndex = speakers.findIndex((s) => s.name === currentSpeaker);
		const nextIndex = (currentIndex + 1) % speakers.length;
		return speakers[nextIndex];
	}

	getPreviousSpeaker(speakers: SpeakerType[], currentSpeaker: string): SpeakerType {
		const currentIndex = speakers.findIndex((s) => s.name === currentSpeaker);
		const prevIndex = currentIndex === 0 ? speakers.length - 1 : currentIndex - 1;
		return speakers[prevIndex];
	}

	initializeSpeakers(): SpeakerType[] {
		return [...DEFAULT_SPEAKERS];
	}

	addCustomSpeaker(speakers: SpeakerType[], name: string): SpeakerType[] {
		const existingSpeaker = this.getSpeakerByName(speakers, name);
		if (existingSpeaker) {
			return speakers;
		}

		const colors = [
			'bg-red-100 text-red-800 border-red-200',
			'bg-yellow-100 text-yellow-800 border-yellow-200',
			'bg-indigo-100 text-indigo-800 border-indigo-200',
			'bg-pink-100 text-pink-800 border-pink-200',
			'bg-teal-100 text-teal-800 border-teal-200'
		];

		const newSpeaker: SpeakerType = {
			id: name.toLowerCase().replace(/\s+/g, '-'),
			name,
			displayName: name,
			color: colors[speakers.length % colors.length]
		};

		return [...speakers, newSpeaker];
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

			const hasChanges = this.hasLineChanged({ ...line, time: newTimestamp });
			return {
				...line,
				time: newTimestamp,
				editState: hasChanges ? 'unsaved' : 'unedited'
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

			const hasChanges = this.hasLineChanged({ ...currentLine, time: newTimestamp });
			updatedLines[lineIndex] = {
				...currentLine,
				time: newTimestamp,
				editState: hasChanges ? 'unsaved' : 'unedited'
			};
		}

		return updatedLines;
	}

	// Save a line (persist changes without marking as done)
	saveLine(lines: EditableTranscriptLineType[], lineIndex: number): EditableTranscriptLineType[] {
		const updatedLines = [...lines];
		const line = updatedLines[lineIndex];

		if (line) {
			const hasActualChanges = this.hasLineChanged(line);
			updatedLines[lineIndex] = {
				...line,
				editState: hasActualChanges ? 'saved' : 'unedited',
				edited: hasActualChanges ? false : false
			};
		}

		return updatedLines;
	}

	// Save all lines that have changes (preserving their edited status)
	saveAllChanges(lines: EditableTranscriptLineType[]): EditableTranscriptLineType[] {
		return lines.map((line) => {
			// Only process lines that are unsaved
			if (line.editState === 'unsaved') {
				const hasActualChanges = this.hasLineChanged(line);
				return {
					...line,
					editState: hasActualChanges ? 'saved' : 'unedited',
					edited: hasActualChanges ? false : false
				};
			}
			return line;
		});
	}

	// Commit a line (mark as edited/done)
	commitLine(lines: EditableTranscriptLineType[], lineIndex: number): EditableTranscriptLineType[] {
		const updatedLines = [...lines];
		const line = updatedLines[lineIndex];

		if (line) {
			// Always mark as 'edited' when explicitly committed, regardless of changes
			// This allows users to mark lines as reviewed/verified even if content is correct
			updatedLines[lineIndex] = {
				...line,
				editState: 'edited',
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

	// Get all changed lines from transcript
	getChangedLines(lines: EditableTranscriptLineType[]): EditableTranscriptLineType[] {
		return lines.filter((line) => line.editState !== 'unedited' || line.edited === true);
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
			editState: line.editState === 'edited' ? ('edited' as const) : ('unedited' as const),
			originalText: line.line,
			originalSpeaker: line.speaker,
			originalTime: line.time
		}));
	}

	// Mass actions - perform operations on multiple lines
	massAction(
		lines: EditableTranscriptLineType[],
		lineIndices: number[],
		action:
			| 'save'
			| 'commit'
			| 'reset-edited'
			| 'delete'
			| 'set-unedited'
			| 'set-unsaved'
			| 'set-saved'
			| 'set-edited'
			| 'revert-to-original',
		options?: { confirmDelete?: boolean }
	): EditableTranscriptLineType[] {
		let updatedLines = [...lines];

		switch (action) {
			case 'save':
				lineIndices.forEach((index) => {
					if (index >= 0 && index < updatedLines.length) {
						const line = updatedLines[index];
						if (line) {
							const hasActualChanges = this.hasLineChanged(line);
							updatedLines[index] = {
								...line,
								editState: hasActualChanges ? 'saved' : 'unedited',
								edited: hasActualChanges ? false : false
							};
						}
					}
				});
				break;

			case 'commit':
				lineIndices.forEach((index) => {
					if (index >= 0 && index < updatedLines.length) {
						const line = updatedLines[index];
						if (line) {
							updatedLines[index] = {
								...line,
								editState: 'edited',
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
						if (line && line.editState === 'edited') {
							const hasActualChanges = this.hasLineChanged(line);
							updatedLines[index] = {
								...line,
								editState: hasActualChanges ? 'saved' : 'unedited',
								edited: hasActualChanges ? false : false
							};
						}
					}
				});
				break;

			case 'delete': {
				if (!options?.confirmDelete) {
					throw new Error('Delete action requires confirmation');
				}
				// Sort indices in descending order to avoid index shifting issues
				const sortedIndices = lineIndices.sort((a, b) => b - a);
				sortedIndices.forEach((index) => {
					if (index >= 0 && index < updatedLines.length && updatedLines.length > 1) {
						updatedLines.splice(index, 1);
					}
				});

				// Mark a nearby line as changed to track that deletions occurred
				if (sortedIndices.length > 0 && updatedLines.length > 0) {
					const nearbyIndex = Math.min(
						sortedIndices[sortedIndices.length - 1],
						updatedLines.length - 1
					);
					if (nearbyIndex >= 0 && updatedLines[nearbyIndex]) {
						const nearbyLine = updatedLines[nearbyIndex];
						if (nearbyLine.editState === 'unedited') {
							updatedLines[nearbyIndex] = {
								...nearbyLine,
								editState: 'unsaved'
							};
						}
					}
				}
				break;
			}

			case 'set-unedited':
				updatedLines = this.changeLineStates(updatedLines, lineIndices, 'unedited', true);
				break;

			case 'set-unsaved':
				updatedLines = this.changeLineStates(updatedLines, lineIndices, 'unsaved', true);
				break;

			case 'set-saved':
				updatedLines = this.changeLineStates(updatedLines, lineIndices, 'saved', true);
				break;

			case 'set-edited':
				updatedLines = this.changeLineStates(updatedLines, lineIndices, 'edited', true);
				break;

			case 'revert-to-original':
				updatedLines = this.revertLinesToOriginal(updatedLines, lineIndices);
				break;

			default:
				throw new Error(`Unknown mass action: ${action}`);
		}

		return updatedLines;
	}

	// Reset a specific line's edited state back to false
	resetLineEditedState(
		lines: EditableTranscriptLineType[],
		lineIndex: number
	): EditableTranscriptLineType[] {
		const updatedLines = [...lines];
		const line = updatedLines[lineIndex];

		if (line && (line.editState === 'edited' || (line.editState === 'unedited' && line.edited))) {
			const hasActualChanges = this.hasLineChanged(line);
			updatedLines[lineIndex] = {
				...line,
				editState: hasActualChanges ? 'saved' : 'unedited',
				edited: false
			};
		}

		return updatedLines;
	}

	// Get lines that match certain criteria for mass actions
	getLinesByState(
		lines: EditableTranscriptLineType[],
		states: ('unedited' | 'unsaved' | 'saved' | 'edited')[]
	): number[] {
		return lines
			.map((line, index) => (states.includes(line.editState) ? index : -1))
			.filter((index) => index !== -1);
	}

	// Get lines by speaker for mass actions
	getLinesBySpeaker(lines: EditableTranscriptLineType[], speakerName: string): number[] {
		return lines
			.map((line, index) => (line.speaker.toLowerCase() === speakerName.toLowerCase() ? index : -1))
			.filter((index) => index !== -1);
	}

	// Change state of multiple lines to a target state
	changeLineStates(
		lines: EditableTranscriptLineType[],
		lineIndices: number[],
		targetState: 'unedited' | 'unsaved' | 'saved' | 'edited',
		forceExactState: boolean = false
	): EditableTranscriptLineType[] {
		// eslint-disable-next-line prefer-const
		let updatedLines = [...lines];

		lineIndices.forEach((index) => {
			if (index >= 0 && index < updatedLines.length) {
				const line = updatedLines[index];
				if (line) {
					let newState = targetState;

					// Apply business logic for state transitions only if not forced
					if (!forceExactState) {
						if (targetState === 'unedited') {
							// When transitioning to unedited, check if line actually has changes
							const hasActualChanges = this.hasLineChanged(line);
							if (hasActualChanges) {
								// If line has actual changes, it should be 'saved' instead of 'unedited'
								newState = 'saved';
							} else {
								newState = 'unedited';
							}
						} else if (targetState === 'saved') {
							// When transitioning to saved, check if line actually has changes
							const hasActualChanges = this.hasLineChanged(line);
							newState = hasActualChanges ? 'saved' : 'unedited';
						}
					}
					// For 'unsaved' and 'edited' states, we can set them directly
					// When forceExactState is true, we use targetState directly

					updatedLines[index] = {
						...line,
						editState: newState,
						edited: newState === 'edited'
					};
				}
			}
		});

		return updatedLines;
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
						editState: 'unedited',
						edited: false
					};
				}
			}
		});

		return updatedLines;
	}
}

export const editorService = new EditorService();
