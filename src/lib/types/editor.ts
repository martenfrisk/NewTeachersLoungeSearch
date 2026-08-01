import type { TranscriptLine, EpisodeInfo } from './episode';

/**
 * Where a roster entry came from.
 *
 * - `cast`       one of the show's recurring hosts, always offered as a rename
 *                target even when absent from the current episode.
 * - `transcript` a speaker actually present in the loaded episode.
 * - `custom`     added by the editor for this session, typically a guest.
 */
export type SpeakerOriginType = 'cast' | 'transcript' | 'custom';

export interface SpeakerType {
	/** Stable slug. DOM keys and remove buttons only - never used for matching. */
	id: string;
	/** The value stored in `transcript_lines.speaker`. The canonical lookup key. */
	name: string;
	color: string;
	/** What the UI shows: a host's full name, or "Unknown Speaker #n". */
	displayName: string;
	origin: SpeakerOriginType;
	/** True for diarization output (`spk_0`, `Speaker 3`, `7`) rather than a name. */
	isMachineLabel: boolean;
}

/**
 * How a line is presented, derived from the line itself - never stored.
 *
 * Replaces the stored `editState: 'unedited' | 'unsaved' | 'saved' | 'edited'`,
 * which conflated three independent things: whether the line differs from what
 * was loaded (derivable from `original*`), whether a human has vouched for it
 * (`edited`, which is persisted and read by the SQL that applies a submission),
 * and an 'unsaved' vs 'saved' distinction that did nothing - every store
 * mutation already writes to localStorage, so the `w` key only changed a badge.
 *
 * Storing the derivable part is what allowed `updateLineText` to downgrade a
 * reviewed line to 'unedited', dropping it from the submission while it kept
 * painting the reviewed badge.
 *
 * "Modified" and "reviewed" are independent, so a line can be both.
 */
export type LineStatusType = 'unchanged' | 'modified' | 'reviewed' | 'modified-reviewed';

/** Bulk operations offered on a selection. */
export type MassActionType = 'commit' | 'reset-edited' | 'delete' | 'revert-to-original';

export interface EditableTranscriptLineType extends TranscriptLine {
	isEditing?: boolean;
	isHighlighted?: boolean;
	isPlaying?: boolean;
	originalText?: string;
	originalSpeaker?: string;
	originalTime?: string;
	/**
	 * The `edited` flag as loaded from the database.
	 *
	 * Lets "reviewed during this session" count as a pending change while "arrived
	 * already reviewed" does not. Seven episodes carry `edited = true` on every row
	 * from the pre-migration apply function - s04e02 has 629 of 629 - and without
	 * this they open reporting hundreds of changes to submit before the user has
	 * touched anything.
	 */
	originalEdited?: boolean;
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

/**
 * The show's recurring cast, offered as rename targets in every episode even
 * when absent from it. Most episodes are these four plus a guest or two.
 *
 * `name` is the value written to `transcript_lines.speaker`, so it must match
 * what is already stored - the corpus has `Howard` (459 lines), `Todd` (516),
 * `Bill` (556), `Sam` (632) and `Unknown` (1,344). The full names are display
 * only. `Guest` was dropped: it appears on zero lines corpus-wide, so it was
 * occupying a slot in a list the editor cycles through for nothing.
 *
 * Colours are assigned at derive time from `getSpeakerColor(name)` rather than
 * hardcoded, so the editor and the public episode pages agree.
 */
export const CAST_SPEAKERS: readonly { id: string; name: string; displayName: string }[] = [
	{ id: 'howard', name: 'Howard', displayName: "Howard Levi's" },
	{ id: 'todd', name: 'Todd', displayName: 'Todd Padre' },
	{ id: 'bill', name: 'Bill', displayName: 'Bill Cravy' },
	{ id: 'sam', name: 'Sam', displayName: 'Sam Weatherman' },
	{ id: 'unknown', name: 'Unknown', displayName: 'Unknown Speaker' }
];

// Keyboard shortcuts
//
// One table, grouped, with the flat list derived from it. There used to be two
// hand-maintained lists - KEYBOARD_SHORTCUTS and KEYBOARD_SHORTCUTS_BY_CATEGORY -
// and they had already drifted: `w`, `c`, `r`, Escape and `?` were missing from
// one or the other, so the help panel and the actual bindings disagreed.
export interface KeyboardShortcutCategory {
	name: string;
	icon?: string;
	shortcuts: KeyboardShortcutType[];
}

/**
 * Bindings follow the conventions of dedicated transcription tools (oTranscribe,
 * Express Scribe, InqScribe, Descript) rather than the function keys this editor
 * started with. F1 opens browser help, and on a Mac laptop the function row needs
 * Fn - both are the wrong place for the key pressed most often in a session.
 */
export const KEYBOARD_SHORTCUTS_BY_CATEGORY: KeyboardShortcutCategory[] = [
	{
		name: 'Playback',
		icon: '🎵',
		shortcuts: [
			// Esc is the play/pause key in oTranscribe and Express Scribe: reachable
			// without leaving the text field, and not otherwise meaningful while a
			// line is merely focused.
			{ key: 'Escape', action: 'toggle-play', description: 'Play / pause' },
			{ key: 'ArrowLeft', ctrlKey: true, action: 'skip-backward-5', description: 'Back 5s' },
			{ key: 'ArrowRight', ctrlKey: true, action: 'skip-forward-5', description: 'Forward 5s' },
			{
				key: 'ArrowLeft',
				ctrlKey: true,
				shiftKey: true,
				action: 'skip-backward-10',
				description: 'Back 10s'
			},
			{
				key: 'ArrowRight',
				ctrlKey: true,
				shiftKey: true,
				action: 'skip-forward-10',
				description: 'Forward 10s'
			},
			{ key: 'ArrowDown', ctrlKey: true, action: 'playback-slower', description: 'Slower' },
			{ key: 'ArrowUp', ctrlKey: true, action: 'playback-faster', description: 'Faster' }
		]
	},
	{
		name: 'Navigation',
		icon: '🧭',
		shortcuts: [
			{ key: 'ArrowUp', action: 'previous-line', description: 'Previous line' },
			{ key: 'ArrowDown', action: 'next-line', description: 'Next line' }
			// Tab no longer cycles speakers. It stole focus navigation, broke keyboard
			// accessibility, and once the roster is derived from the transcript it
			// cycled spk_0 -> spk_1, which is never what anyone wants. Number keys
			// assign a speaker directly instead.
		]
	},
	{
		name: 'Speakers',
		icon: '🗣️',
		shortcuts: [
			// The biggest throughput win available: one keystroke per line, and the
			// four hosts sit at fixed positions 1-4 because the roster lists the cast
			// first in a stable order.
			{ key: '1', action: 'assign-speaker-1', description: 'Assign 1st speaker' },
			{ key: '2', action: 'assign-speaker-2', description: 'Assign 2nd speaker' },
			{ key: '3', action: 'assign-speaker-3', description: 'Assign 3rd speaker' },
			{ key: '4', action: 'assign-speaker-4', description: 'Assign 4th speaker' },
			{ key: '5', action: 'assign-speaker-5', description: 'Assign 5th speaker' },
			{ key: '6', action: 'assign-speaker-6', description: 'Assign 6th speaker' },
			{ key: '7', action: 'assign-speaker-7', description: 'Assign 7th speaker' },
			{ key: '8', action: 'assign-speaker-8', description: 'Assign 8th speaker' },
			{ key: '9', action: 'assign-speaker-9', description: 'Assign 9th speaker' }
		]
	},
	{
		name: 'Line editing',
		icon: '✏️',
		shortcuts: [
			{ key: 'o', action: 'new-line-after', description: 'New line after' },
			{ key: 'O', shiftKey: true, action: 'new-line-before', description: 'New line before' },
			{ key: 'Enter', altKey: true, action: 'split-line', description: 'Split at cursor' },
			// The most common diarization repair: one turn split across two lines.
			// EditorService.mergeLine already existed but was bound to nothing.
			{ key: 'm', action: 'merge-line', description: 'Merge with next line' },
			{ key: 'Delete', ctrlKey: true, action: 'delete-line', description: 'Delete line' },
			{ key: 'u', action: 'set-timestamp-previous-plus-one', description: 'Auto timestamp' }
		]
	},
	{
		name: 'Review',
		icon: '✅',
		shortcuts: [
			{ key: 'c', action: 'commit-line', description: 'Mark reviewed' },
			{ key: 'r', action: 'reset-edited', description: 'Clear review' }
		]
	},
	{
		name: 'General',
		icon: '⚡',
		shortcuts: [{ key: '?', action: 'show-help', description: 'Show shortcuts' }]
	}
];

/** Flat view for the key handler. Derived, so it cannot drift from the panel. */
export const KEYBOARD_SHORTCUTS: KeyboardShortcutType[] = KEYBOARD_SHORTCUTS_BY_CATEGORY.flatMap(
	(category) => category.shortcuts
);

/** How many roster entries the number keys can reach. */
export const SPEAKER_HOTKEY_COUNT = 9;
