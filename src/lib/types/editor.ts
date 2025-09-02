import type { TranscriptLine, EpisodeInfo } from './episode';

export interface SpeakerType {
	id: string;
	name: string;
	color: string;
	displayName: string;
}

export type LineEditState = 'unedited' | 'unsaved' | 'saved' | 'edited';

export interface EditableTranscriptLineType extends TranscriptLine {
	isEditing?: boolean;
	isHighlighted?: boolean;
	isPlaying?: boolean;
	originalText?: string;
	originalSpeaker?: string;
	originalTime?: string;
	editState: LineEditState; // Clear state model: unedited | unsaved | saved | edited
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
	selectedLineIndices: number[];
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

// Episode submission types
export interface EpisodeSubmissionType {
	episodeId?: string; // UUID from database
	episodeEp: string; // Episode identifier like "s03e06"
	submissionType: 'full_replacement' | 'partial_edit';
	transcriptData: EditableTranscriptLineType[]; // Complete episode transcript
	contributorName?: string;
	contributorEmail?: string;
	notes?: string;
}

export interface PendingEpisodeSubmissionType {
	id: string;
	episodeId: string;
	episodeEp: string;
	submissionType: 'full_replacement' | 'partial_edit';
	transcriptData: EditableTranscriptLineType[];
	submittedBy?: string;
	contributorDisplayName?: string;
	contributorSessionId?: string;
	contactProvided?: boolean;
	notes?: string;
	status: 'pending' | 'approved' | 'rejected';
	createdAt: string;
	reviewedBy?: string;
	reviewedAt?: string;
	rejectionReason?: string;
	reviewerName?: string;
	reviewerEmail?: string;
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

// Keyboard shortcuts grouped by category
export interface KeyboardShortcutCategory {
	name: string;
	icon?: string;
	shortcuts: KeyboardShortcutType[];
}

export const KEYBOARD_SHORTCUTS: KeyboardShortcutType[] = [
	// Audio controls
	{ key: 'F1', action: 'toggle-play', description: 'Play/pause audio' },
	{ key: 'F2', action: 'skip-backward-5', description: 'Skip back 5 seconds' },
	{ key: 'F3', action: 'skip-forward-5', description: 'Skip forward 5 seconds' },
	{ key: 'F2', shiftKey: true, action: 'skip-backward-10', description: 'Skip back 10 seconds' },
	{ key: 'F3', shiftKey: true, action: 'skip-forward-10', description: 'Skip forward 10 seconds' },

	// Navigation
	{ key: 'ArrowUp', action: 'previous-line', description: 'Previous line' },
	{ key: 'ArrowDown', action: 'next-line', description: 'Next line' },
	{ key: 'Tab', action: 'next-speaker', description: 'Next speaker' },
	{ key: 'Tab', shiftKey: true, action: 'previous-speaker', description: 'Previous speaker' },

	// Line editing
	{ key: 'Enter', altKey: true, action: 'split-line', description: 'Split line at cursor' },
	{ key: 'o', action: 'new-line-after', description: 'New line after current' },
	{ key: 'O', shiftKey: true, action: 'new-line-before', description: 'New line before current' },
	{ key: 'Delete', ctrlKey: true, action: 'delete-line', description: 'Delete current line' },
	{ key: 'w', action: 'save-line', description: 'Save line changes' },
	{ key: 'c', action: 'commit-line', description: 'Mark line as edited/done' },
	{ key: 'r', action: 'reset-edited', description: 'Reset edited line to unedited' },
	{
		key: 'u',
		action: 'set-timestamp-previous-plus-one',
		description: 'Set timestamp to previous line + 1s'
	},

	// General
	{ key: 'Escape', action: 'cancel-edit', description: 'Cancel current edit' },
	{ key: '?', action: 'show-help', description: 'Show keyboard shortcuts' }
];

export const KEYBOARD_SHORTCUTS_BY_CATEGORY: KeyboardShortcutCategory[] = [
	{
		name: 'Audio Controls',
		icon: '🎵',
		shortcuts: [
			{ key: 'F1', action: 'toggle-play', description: 'Play/pause audio' },
			{ key: 'F2', action: 'skip-backward-5', description: 'Skip back 5s' },
			{ key: 'F3', action: 'skip-forward-5', description: 'Skip forward 5s' },
			{ key: 'F2', shiftKey: true, action: 'skip-backward-10', description: 'Skip back 10s' },
			{ key: 'F3', shiftKey: true, action: 'skip-forward-10', description: 'Skip forward 10s' }
		]
	},
	{
		name: 'Navigation',
		icon: '🧭',
		shortcuts: [
			{ key: 'ArrowUp', action: 'previous-line', description: 'Previous line' },
			{ key: 'ArrowDown', action: 'next-line', description: 'Next line' },
			{ key: 'Tab', action: 'next-speaker', description: 'Next speaker' },
			{ key: 'Tab', shiftKey: true, action: 'previous-speaker', description: 'Previous speaker' }
		]
	},
	{
		name: 'Line Editing',
		icon: '✏️',
		shortcuts: [
			{ key: 'o', action: 'new-line-after', description: 'New line after' },
			{ key: 'O', shiftKey: true, action: 'new-line-before', description: 'New line before' },
			{ key: 'Enter', altKey: true, action: 'split-line', description: 'Split line at cursor' },
			{ key: 'Delete', ctrlKey: true, action: 'delete-line', description: 'Delete current line' },
			{
				key: 'u',
				action: 'set-timestamp-previous-plus-one',
				description: 'Auto-increment timestamp'
			}
		]
	},
	{
		name: 'Save & Submit',
		icon: '💾',
		shortcuts: [
			{ key: 'w', action: 'save-line', description: 'Save line changes' },
			{ key: 'c', action: 'commit-line', description: 'Mark line as done' },
			{ key: 'r', action: 'reset-edited', description: 'Reset edited to unedited' }
		]
	},
	{
		name: 'General',
		icon: '⚡',
		shortcuts: [
			{ key: 'Escape', action: 'cancel-edit', description: 'Cancel edit' },
			{ key: '?', action: 'show-help', description: 'Show shortcuts' }
		]
	}
];
