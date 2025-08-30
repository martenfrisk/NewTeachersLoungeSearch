import type { EditableTranscriptLineType, SpeakerType } from '../types/editor';
import type { IEditorRepository } from '../repositories/EditorRepository';
import { SupabaseEditorRepository } from '../repositories/EditorRepository';
import { createErrorHandler } from '../utils/errors';
import { DEFAULT_SPEAKERS } from '../types/editor';
import epListData from '../../assets/episodes6.json';

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
				hasChanges: newText !== line.originalText,
				edited: true
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
				hasChanges: newSpeaker !== line.originalSpeaker || line.hasChanges,
				edited: true
			};
		}

		return updatedLines;
	}

	updateLineTimestamp(
		lines: EditableTranscriptLineType[],
		lineIndex: number,
		newTimestamp: string
	): EditableTranscriptLineType[] {
		if (!this.isValidTimestamp(newTimestamp)) {
			throw new Error('Invalid timestamp format. Use HH:MM:SS or MM:SS');
		}

		const updatedLines = [...lines];
		const line = updatedLines[lineIndex];

		if (line) {
			updatedLines[lineIndex] = {
				...line,
				time: newTimestamp,
				hasChanges: newTimestamp !== line.originalTime || line.hasChanges,
				edited: true
			};
		}

		return updatedLines;
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
					line: firstPart,
					hasChanges: true,
					edited: true
				};

				// Create second line
				const secondLine: EditableTranscriptLineType = {
					...line,
					id: `${line.id}-split-${Date.now()}`,
					line: secondPart,
					hasChanges: true,
					edited: true,
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
				updatedLines[lineIndex] = {
					...currentLine,
					line: `${currentLine.line} ${nextLine.line}`,
					hasChanges: true,
					edited: true
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
				hasChanges: true,
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
				hasChanges: true,
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
		const parts = timestamp.split(':').map(Number);
		if (parts.length === 3) {
			return parts[0] * 3600 + parts[1] * 60 + parts[2];
		} else if (parts.length === 2) {
			return parts[0] * 60 + parts[1];
		}
		return 0;
	}

	secondsToTimestamp(seconds: number): string {
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		const secs = Math.floor(seconds % 60);

		if (hours > 0) {
			return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
		} else {
			return `${minutes}:${secs.toString().padStart(2, '0')}`;
		}
	}

	private isValidTimestamp(timestamp: string): boolean {
		// Match formats: HH:MM:SS, MM:SS, H:MM:SS, M:SS
		const timestampRegex = /^(\d{1,2}:)?([0-5]?\d):([0-5]\d)$/;
		return timestampRegex.test(timestamp);
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

			return {
				...line,
				time: newTimestamp,
				hasChanges: true,
				edited: true
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
				time: newTimestamp,
				hasChanges: newTimestamp !== currentLine.originalTime || currentLine.hasChanges,
				edited: true
			};
		}

		return updatedLines;
	}

	// Commit a line (mark as edited/done)
	commitLine(lines: EditableTranscriptLineType[], lineIndex: number): EditableTranscriptLineType[] {
		const updatedLines = [...lines];
		const line = updatedLines[lineIndex];

		if (line) {
			updatedLines[lineIndex] = {
				...line,
				isCommitted: true,
				hasChanges: false, // Clear unsaved changes when committing
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
}

export const editorService = new EditorService();
