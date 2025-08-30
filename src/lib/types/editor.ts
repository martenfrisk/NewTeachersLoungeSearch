import type { TranscriptLine, EpisodeInfo } from './episode';

export interface SpeakerType {
	id: string;
	name: string;
	color: string;
	displayName: string;
}

export interface EditableTranscriptLineType extends TranscriptLine {
	isEditing?: boolean;
	isHighlighted?: boolean;
	isPlaying?: boolean;
	originalText?: string;
	originalSpeaker?: string;
	originalTime?: string;
	hasChanges?: boolean;
	isCommitted?: boolean; // User has marked this line as "done/edited"
}

export interface EditorStateType {
	selectedEpisode: string | null;
	episodeInfo: EpisodeInfo | null;
	transcriptLines: EditableTranscriptLineType[];
	speakers: SpeakerType[];
	currentLineIndex: number;
	isLoading: boolean;
	error: string | null;
	audioCurrentTime: number;
	isAudioSynced: boolean;
}

export interface AudioControlsType {
	isPlaying: boolean;
	currentTime: number;
	duration: number;
	volume: number;
	syncEnabled: boolean;
}

export interface KeyboardShortcutType {
	key: string;
	ctrlKey?: boolean;
	shiftKey?: boolean;
	altKey?: boolean;
	action: string;
	description: string;
}

export interface EditorSettingsType {
	autoSave: boolean;
	showTimestamps: boolean;
	highlightCurrentLine: boolean;
	keyboardShortcutsEnabled: boolean;
	audioSyncEnabled: boolean;
}

export const DEFAULT_SPEAKERS: SpeakerType[] = [
	{
		id: 'howard',
		name: 'Howard',
		displayName: "Howard Levi's",
		color: 'bg-blue-100 text-blue-800 border-blue-200'
	},
	{
		id: 'todd',
		name: 'Todd',
		displayName: 'Todd Padre',
		color: 'bg-green-100 text-green-800 border-green-200'
	},
	{
		id: 'bill',
		name: 'Bill',
		displayName: 'Bill Cravy',
		color: 'bg-purple-100 text-purple-800 border-purple-200'
	},
	{
		id: 'sam',
		name: 'Sam',
		displayName: 'Sam Weatherman',
		color: 'bg-red-100 text-red-800 border-red-200'
	},
	{
		id: 'guest',
		name: 'Guest',
		displayName: 'Guest',
		color: 'bg-orange-100 text-orange-800 border-orange-200'
	},
	{
		id: 'unknown',
		name: 'Unknown',
		displayName: 'Unknown Speaker',
		color: 'bg-gray-100 text-gray-800 border-gray-200'
	}
];

export const KEYBOARD_SHORTCUTS: KeyboardShortcutType[] = [
	// Audio controls - use keys that don't interfere with text editing
	{ key: 'F1', action: 'toggle-play', description: 'Play/pause audio' },
	{ key: 'F2', action: 'skip-backward-5', description: 'Skip back 5 seconds' },
	{ key: 'F3', action: 'skip-forward-5', description: 'Skip forward 5 seconds' },
	{ key: 'F2', shiftKey: true, action: 'skip-backward-10', description: 'Skip back 10 seconds' },
	{ key: 'F3', shiftKey: true, action: 'skip-forward-10', description: 'Skip forward 10 seconds' },

	// Navigation - these are safe as they're used for UI navigation
	{ key: 'ArrowUp', action: 'previous-line', description: 'Previous line' },
	{ key: 'ArrowDown', action: 'next-line', description: 'Next line' },
	{ key: 'Tab', action: 'next-speaker', description: 'Next speaker' },
	{ key: 'Tab', shiftKey: true, action: 'previous-speaker', description: 'Previous speaker' },

	// Line editing - using less common keys
	{ key: 'Enter', altKey: true, action: 'split-line', description: 'Split line at cursor' },
	{ key: 'o', action: 'new-line-after', description: 'New line after current' },
	{ key: 'O', shiftKey: true, action: 'new-line-before', description: 'New line before current' },
	{ key: 'c', action: 'commit-line', description: 'Mark line as edited/done' },
	{
		key: 'u',
		action: 'set-timestamp-previous-plus-one',
		description: 'Set timestamp to previous line + 1s'
	},
	{ key: 'Escape', action: 'cancel-edit', description: 'Cancel current edit' },
	{ key: '?', action: 'show-help', description: 'Show keyboard shortcuts' }
];
