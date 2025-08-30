import type { EditorStateType, EditableTranscriptLineType, SpeakerType } from '../types/editor';
import type { EpisodeInfo } from '../types/episode';
import { editorService } from '../services/EditorService';
import { browser } from '$app/environment';

// Create initial state
const initialState: EditorStateType = {
	selectedEpisode: null,
	episodeInfo: null,
	transcriptLines: [],
	speakers: editorService.initializeSpeakers(),
	currentLineIndex: -1,
	isLoading: false,
	error: null,
	audioCurrentTime: 0,
	isAudioSynced: false
};

// Create reactive store using Svelte 5 runes
class EditorStore {
	#state = $state<EditorStateType>(initialState);

	// Getters
	get selectedEpisode() {
		return this.#state.selectedEpisode;
	}
	get episodeInfo() {
		return this.#state.episodeInfo;
	}
	get transcriptLines() {
		return this.#state.transcriptLines;
	}
	get speakers() {
		return this.#state.speakers;
	}
	get currentLineIndex() {
		return this.#state.currentLineIndex;
	}
	get isLoading() {
		return this.#state.isLoading;
	}
	get error() {
		return this.#state.error;
	}
	get audioCurrentTime() {
		return this.#state.audioCurrentTime;
	}
	get isAudioSynced() {
		return this.#state.isAudioSynced;
	}

	// Computed properties
	get currentLine(): EditableTranscriptLineType | null {
		if (
			this.#state.currentLineIndex >= 0 &&
			this.#state.currentLineIndex < this.#state.transcriptLines.length
		) {
			return this.#state.transcriptLines[this.#state.currentLineIndex];
		}
		return null;
	}

	get hasChanges(): boolean {
		return this.#state.transcriptLines.some((line) => line.hasChanges);
	}

	get editedLinesCount(): number {
		return this.#state.transcriptLines.filter((line) => line.hasChanges).length;
	}

	// Actions
	setSelectedEpisode(episodeId: string | null) {
		this.#state.selectedEpisode = episodeId;
		if (!episodeId) {
			this.clearTranscript();
		}
	}

	setEpisodeInfo(info: EpisodeInfo | null) {
		this.#state.episodeInfo = info;
	}

	setTranscriptLines(lines: EditableTranscriptLineType[]) {
		this.#state.transcriptLines = lines;
		this.#state.currentLineIndex = lines.length > 0 ? 0 : -1;
	}

	setSpeakers(speakers: SpeakerType[]) {
		this.#state.speakers = speakers;
	}

	addSpeaker(name: string) {
		this.#state.speakers = editorService.addCustomSpeaker(this.#state.speakers, name);
	}

	setCurrentLineIndex(index: number) {
		if (index >= 0 && index < this.#state.transcriptLines.length) {
			this.#state.currentLineIndex = index;

			// Update line highlighting
			this.#state.transcriptLines = this.#state.transcriptLines.map((line, i) => ({
				...line,
				isHighlighted: i === index
			}));
		}
	}

	setIsLoading(loading: boolean) {
		this.#state.isLoading = loading;
		if (loading) {
			this.clearError();
		}
	}

	setError(error: string | null) {
		this.#state.error = error;
		if (error) {
			this.#state.isLoading = false;
		}
	}

	clearError() {
		this.#state.error = null;
	}

	setAudioCurrentTime(time: number) {
		this.#state.audioCurrentTime = time;

		if (this.#state.isAudioSynced) {
			this.syncWithAudioTime(time);
		}
	}

	setIsAudioSynced(synced: boolean) {
		this.#state.isAudioSynced = synced;
	}

	// Line editing actions
	startEditingLine(index: number) {
		this.#state.transcriptLines = this.#state.transcriptLines.map((line, i) => ({
			...line,
			isEditing: i === index
		}));
	}

	stopEditingLine(index: number) {
		this.#state.transcriptLines = this.#state.transcriptLines.map((line, i) => ({
			...line,
			isEditing: i === index ? false : line.isEditing
		}));
	}

	updateLineText(index: number, newText: string) {
		this.#state.transcriptLines = editorService.updateLineText(
			this.#state.transcriptLines,
			index,
			newText
		);
		this.saveToLocalStorage();
	}

	updateLineSpeaker(index: number, newSpeaker: string) {
		this.#state.transcriptLines = editorService.updateLineSpeaker(
			this.#state.transcriptLines,
			index,
			newSpeaker
		);
		this.saveToLocalStorage();
	}

	updateLineTimestamp(index: number, newTimestamp: string) {
		try {
			this.#state.transcriptLines = editorService.updateLineTimestamp(
				this.#state.transcriptLines,
				index,
				newTimestamp
			);
			this.saveToLocalStorage();
		} catch (error) {
			this.setError(error instanceof Error ? error.message : 'Invalid timestamp');
		}
	}

	splitLine(index: number, position: number) {
		this.#state.transcriptLines = editorService.splitLine(
			this.#state.transcriptLines,
			index,
			position
		);
		this.saveToLocalStorage();
	}

	mergeLine(index: number) {
		this.#state.transcriptLines = editorService.mergeLine(this.#state.transcriptLines, index);
		this.saveToLocalStorage();
	}

	addNewLineBefore(index: number, speaker?: string) {
		this.#state.transcriptLines = editorService.addNewLineBefore(
			this.#state.transcriptLines,
			index,
			speaker
		);
		// Update current line index to point to the new line
		this.setCurrentLineIndex(index);
		this.saveToLocalStorage();
	}

	addNewLineAfter(index: number, speaker?: string) {
		this.#state.transcriptLines = editorService.addNewLineAfter(
			this.#state.transcriptLines,
			index,
			speaker
		);
		// Update current line index to point to the new line
		this.setCurrentLineIndex(index + 1);
		this.saveToLocalStorage();
	}

	// Navigation actions
	goToNextLine() {
		if (this.#state.currentLineIndex < this.#state.transcriptLines.length - 1) {
			this.setCurrentLineIndex(this.#state.currentLineIndex + 1);
		}
	}

	goToPreviousLine() {
		if (this.#state.currentLineIndex > 0) {
			this.setCurrentLineIndex(this.#state.currentLineIndex - 1);
		}
	}

	goToLineByTimestamp(timestamp: string) {
		const lineIndex = editorService.findLineByTimestamp(this.#state.transcriptLines, timestamp);
		this.setCurrentLineIndex(lineIndex);
	}

	// Speaker cycling
	cycleToNextSpeaker(lineIndex: number) {
		const currentLine = this.#state.transcriptLines[lineIndex];
		if (currentLine) {
			const nextSpeaker = editorService.getNextSpeaker(this.#state.speakers, currentLine.speaker);
			this.updateLineSpeaker(lineIndex, nextSpeaker.name);
		}
	}

	cycleToPreviousSpeaker(lineIndex: number) {
		const currentLine = this.#state.transcriptLines[lineIndex];
		if (currentLine) {
			const prevSpeaker = editorService.getPreviousSpeaker(
				this.#state.speakers,
				currentLine.speaker
			);
			this.updateLineSpeaker(lineIndex, prevSpeaker.name);
		}
	}

	// Shift all line timestamps by a given number of seconds
	shiftAllLinesTime(shiftSeconds: number) {
		this.#state.transcriptLines = editorService.shiftAllLinesTime(
			this.#state.transcriptLines,
			shiftSeconds
		);
		this.saveToLocalStorage();
	}

	// Set timestamp to previous line + 1 second
	setTimestampToPreviousPlusOne(lineIndex: number) {
		this.#state.transcriptLines = editorService.setTimestampToPreviousPlusOne(
			this.#state.transcriptLines,
			lineIndex
		);
		this.saveToLocalStorage();
	}

	// Commit a line (mark as edited/done)
	commitLine(lineIndex: number) {
		this.#state.transcriptLines = editorService.commitLine(this.#state.transcriptLines, lineIndex);
		this.saveToLocalStorage();
	}

	// Audio sync utilities
	private syncWithAudioTime(currentTime: number) {
		// Convert current audio time to timestamp and find closest line
		// The line timestamps themselves now contain the correct timing after shifting
		const timestamp = editorService.secondsToTimestamp(currentTime);
		const lineIndex = editorService.findLineByTimestamp(this.#state.transcriptLines, timestamp);

		// Update playing indicators only if we found a valid line
		if (lineIndex >= 0 && lineIndex < this.#state.transcriptLines.length) {
			this.#state.transcriptLines = this.#state.transcriptLines.map((line, i) => ({
				...line,
				isPlaying: i === lineIndex
			}));

			// Optionally auto-scroll to current line
			if (lineIndex !== this.#state.currentLineIndex) {
				this.setCurrentLineIndex(lineIndex);
			}
		} else {
			// Clear all playing indicators if no line found
			this.#state.transcriptLines = this.#state.transcriptLines.map((line) => ({
				...line,
				isPlaying: false
			}));
		}
	}

	// Utility actions
	clearTranscript() {
		this.#state.transcriptLines = [];
		this.#state.currentLineIndex = -1;
		this.#state.episodeInfo = null;
		this.clearError();
		this.clearLocalStorage();
	}

	// LocalStorage auto-save methods
	private getStorageKey(episodeId: string): string {
		return `editor_autosave_${episodeId}`;
	}

	saveToLocalStorage() {
		if (!browser || !this.#state.selectedEpisode) return;

		// Save lines that have changes OR are committed (to preserve committed state)
		const linesToSave = this.#state.transcriptLines.filter(
			(line) => line.hasChanges || line.isCommitted
		);
		if (linesToSave.length === 0) return;

		const autoSaveData = {
			episodeId: this.#state.selectedEpisode,
			timestamp: Date.now(),
			changedLines: linesToSave.map((line) => ({
				id: line.id,
				line: line.line,
				speaker: line.speaker,
				time: line.time,
				originalText: line.originalText,
				originalSpeaker: line.originalSpeaker,
				originalTime: line.originalTime,
				isCommitted: line.isCommitted
			}))
		};

		try {
			localStorage.setItem(
				this.getStorageKey(this.#state.selectedEpisode),
				JSON.stringify(autoSaveData)
			);
		} catch (error) {
			console.warn('Failed to save to localStorage:', error);
		}
	}

	loadFromLocalStorage(episodeId: string): boolean {
		if (!browser) return false;

		try {
			const stored = localStorage.getItem(this.getStorageKey(episodeId));
			if (!stored) return false;

			const autoSaveData = JSON.parse(stored);
			if (autoSaveData.episodeId !== episodeId) return false;

			// Apply saved changes to current transcript
			interface SavedLineDataType {
				id: string;
				line: string;
				speaker: string;
				time: string;
				originalText: string;
				originalSpeaker: string;
				originalTime: string;
				isCommitted?: boolean;
			}

			const changedLines = new Map<string, SavedLineDataType>(
				autoSaveData.changedLines.map((savedLine: SavedLineDataType) => [savedLine.id, savedLine])
			);

			this.#state.transcriptLines = this.#state.transcriptLines.map((transcriptLine) => {
				const savedLine = transcriptLine.id ? changedLines.get(transcriptLine.id) : null;
				if (savedLine) {
					return {
						...transcriptLine,
						line: savedLine.line,
						speaker: savedLine.speaker,
						time: savedLine.time,
						hasChanges: !savedLine.isCommitted, // Don't mark committed lines as having changes
						isCommitted: savedLine.isCommitted || false,
						edited: true,
						originalText: savedLine.originalText,
						originalSpeaker: savedLine.originalSpeaker,
						originalTime: savedLine.originalTime
					};
				}
				return transcriptLine;
			});

			return true;
		} catch (error) {
			console.warn('Failed to load from localStorage:', error);
			return false;
		}
	}

	clearLocalStorage(episodeId?: string) {
		if (!browser) return;

		const keyToRemove = episodeId || this.#state.selectedEpisode;
		if (keyToRemove) {
			localStorage.removeItem(this.getStorageKey(keyToRemove));
		}
	}

	hasLocalStorageData(episodeId: string): boolean {
		if (!browser) return false;
		return localStorage.getItem(this.getStorageKey(episodeId)) !== null;
	}

	getLocalStorageTimestamp(episodeId: string): Date | null {
		if (!browser) return null;

		try {
			const stored = localStorage.getItem(this.getStorageKey(episodeId));
			if (!stored) return null;

			const autoSaveData = JSON.parse(stored);
			return new Date(autoSaveData.timestamp);
		} catch {
			return null;
		}
	}

	reset() {
		this.#state = { ...initialState, speakers: editorService.initializeSpeakers() };
	}

	// Load episode data
	async loadEpisode(episodeId: string) {
		this.setIsLoading(true);
		this.setSelectedEpisode(episodeId);

		try {
			const lines = await editorService.loadEpisodeTranscript(episodeId);
			this.setTranscriptLines(lines);

			// Extract episode info from the first line (they all have the same episode data)
			if (lines.length > 0) {
				interface LineWithEpisodeDataType extends EditableTranscriptLineType {
					episode?: {
						ep: string;
						title: string;
						season: string;
					};
				}
				const firstLine = lines[0] as LineWithEpisodeDataType;
				if (firstLine.episode) {
					// Get the feedTitle from episodes6.json for audio matching
					const episodeInfo = await editorService.getEpisodeAudioInfo(episodeId);

					this.setEpisodeInfo({
						ep: firstLine.episode.ep,
						title: episodeInfo?.feedTitle || episodeInfo?.title || firstLine.episode.title,
						season: firstLine.episode.season
					});
				}
			}
		} catch (error) {
			this.setError(error instanceof Error ? error.message : 'Failed to load episode');
			this.clearTranscript();
		} finally {
			this.setIsLoading(false);
		}
	}

	// Reset all line changes after successful submission
	resetLineChanges() {
		this.#state.transcriptLines = editorService.resetLineChanges(this.#state.transcriptLines);
	}
}

// Create and export the store instance
export const editorStore = new EditorStore();
