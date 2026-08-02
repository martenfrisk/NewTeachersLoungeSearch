<script lang="ts">
	import type { EditableTranscriptLineType, SpeakerType } from '$lib/types/editor';
	import { getSpeakerColor } from '$lib/utils/speakerUtils';
	import { editorService } from '$lib/services/EditorService';
	import LineSpeakerField from './line/LineSpeakerField.svelte';
	import LineTimestampField from './line/LineTimestampField.svelte';
	import LineTextField from './line/LineTextField.svelte';
	import type { TextFieldThenType } from './line/types';
	import LineStatusBadges from './line/LineStatusBadges.svelte';
	import LineQuickActions from './line/LineQuickActions.svelte';

	/**
	 * One transcript row.
	 *
	 * The only component here that knows about line indices: the fields below it
	 * report values and intent, and this translates them into calls on the store.
	 * That is what lets the leaves stay cheap at 732 instances.
	 */
	interface Props {
		line: EditableTranscriptLineType;
		/**
		 * Roster keyed by lowercased speaker name, built once by TranscriptView.
		 * Passed in rather than derived per row: at 732 rows a `speakers.find()`
		 * inside each component is O(rows x roster) on every roster change.
		 */
		speakerLookup?: Map<string, SpeakerType>;
		/** id of the shared <datalist> rendered once by TranscriptView. */
		speakerDatalistId?: string;
		isActive: boolean;
		lineIndex: number;
		onTextEdit: (index: number, text: string) => void;
		onSpeakerEdit: (index: number, speaker: string) => void;
		onTimestampEdit: (index: number, timestamp: string) => void;
		onLineClick: (index: number) => void;
		onSplitLine: (index: number, position: number) => void;
		onAddNewLineBefore: (index: number) => void;
		onAddNewLineAfter: (index: number) => void;
		onStartEditing: (index: number) => void;
		onStopEditing: (index: number) => void;
		onNavigateAndEdit?: (index: number) => void;
		onKeyboardAction?: (action: string) => void;
		transcriptLinesLength?: number;
		isSelected?: boolean;
		onSelectionChange?: (
			index: number,
			selected: boolean,
			shiftKey?: boolean,
			ctrlKey?: boolean
		) => void;
	}

	let {
		line,
		speakerLookup,
		speakerDatalistId = 'editor-speaker-names',
		isActive,
		lineIndex,
		onTextEdit,
		onSpeakerEdit,
		onTimestampEdit,
		onLineClick,
		onSplitLine,
		onAddNewLineBefore,
		onAddNewLineAfter,
		onStartEditing,
		onStopEditing,
		onNavigateAndEdit,
		onKeyboardAction,
		transcriptLinesLength = 0,
		isSelected = false,
		onSelectionChange
	}: Props = $props();

	// Which field, if any, is open. The fields themselves hold only their drafts.
	let isEditingText = $state(false);
	let isEditingSpeaker = $state(false);
	let isEditingTimestamp = $state(false);

	let isEditingAnything = $derived(isEditingText || isEditingSpeaker || isEditingTimestamp);

	// Close the text field when the store clears the flag (mass actions, undo).
	$effect(() => {
		if (!line.isEditing && isEditingText) isEditingText = false;
	});

	// Status is derived, never stored. `modified` compares against the line as
	// loaded; `reviewed` is the persisted human-vouched flag. They are
	// independent - a line can be both.
	let isModified = $derived(editorService.hasLineChanged(line));
	let isReviewed = $derived(line.edited);

	/**
	 * How this line's speaker is labelled and coloured.
	 *
	 * Falls back to the line's own value rather than the roster's "Unknown" entry.
	 * The old fallback was a non-null assertion on `speakers.find(s => s.id ===
	 * 'unknown')`, which had two problems: removing "Unknown" from the roster threw
	 * and unmounted the whole transcript, and every unmatched speaker rendered as
	 * "Unknown Speaker" - which, before the roster was derived from the transcript,
	 * meant every line of an unedited episode.
	 */
	let speakerInfo = $derived(
		speakerLookup?.get(line.speaker.trim().toLowerCase()) ?? {
			displayName: line.speaker,
			color: getSpeakerColor(line.speaker)
		}
	);

	function startTextEdit() {
		isEditingText = true;
		onStartEditing(lineIndex);
	}

	function stopTextEdit() {
		isEditingText = false;
		onStopEditing(lineIndex);
	}

	/** Where focus goes after the text field closes. */
	function navigateAfter(then: TextFieldThenType) {
		if (then === 'next') setTimeout(() => onNavigateAndEdit?.(lineIndex + 1), 0);
		else if (then === 'previous') setTimeout(() => onNavigateAndEdit?.(lineIndex - 1), 0);
	}

	function commitText(text: string, then: TextFieldThenType) {
		onTextEdit(lineIndex, text);
		stopTextEdit();
		navigateAfter(then);
	}

	function cancelText(then: TextFieldThenType) {
		stopTextEdit();
		navigateAfter(then);
	}

	function commitSpeaker(value: string) {
		const trimmed = value.trim();
		// Free text means an empty field is reachable; treat it as a cancel rather
		// than writing a blank speaker into the transcript.
		if (trimmed && trimmed !== line.speaker) onSpeakerEdit(lineIndex, trimmed);
		isEditingSpeaker = false;
	}

	function commitTimestamp(value: string) {
		onTimestampEdit(lineIndex, value);
		isEditingTimestamp = false;
	}

	function handleSelectionChange(event: Event) {
		// The change event does not carry modifier keys, so range selection is
		// handled by the click handler below; this covers keyboard toggling.
		onSelectionChange?.(lineIndex, (event.target as HTMLInputElement).checked);
	}

	function handleCheckboxClick(event: MouseEvent) {
		const checkbox = event.target as HTMLInputElement;
		onSelectionChange?.(lineIndex, checkbox.checked, event.shiftKey);
	}

	function handleLineClick(event: MouseEvent) {
		if (isEditingAnything) return;
		if (event.target && (event.target as HTMLElement).closest('button, input, select, textarea')) {
			return;
		}

		const isShiftKey = event.shiftKey;
		const isCtrlKey = event.ctrlKey || event.metaKey;

		if (isShiftKey || isCtrlKey) {
			// Shift extends a range, so it always selects; Ctrl toggles.
			onSelectionChange?.(lineIndex, isShiftKey ? true : !isSelected, isShiftKey, isCtrlKey);
		} else {
			onLineClick(lineIndex);
		}
	}

	/**
	 * Keys handled by the focused row itself.
	 *
	 * These are the `line` scope in KEYBOARD_SHORTCUTS_BY_CATEGORY and are
	 * deliberately absent from the flat list the document handler walks - `s` and
	 * `t` are letters, and swallowing them page-wide would break every text field.
	 */
	function handleLineKeydown(event: KeyboardEvent) {
		if (isEditingAnything) return;
		if (event.ctrlKey || event.metaKey) return;

		switch (event.key) {
			case 'Enter':
				if (event.shiftKey) return;
				event.preventDefault();
				startTextEdit();
				break;
			case 'e':
				event.preventDefault();
				startTextEdit();
				break;
			case 's':
				event.preventDefault();
				isEditingSpeaker = true;
				break;
			case 't':
				event.preventDefault();
				isEditingTimestamp = true;
				break;
			case 'j':
				event.preventDefault();
				onNavigateAndEdit?.(lineIndex + 1);
				break;
			case 'k':
				event.preventDefault();
				onNavigateAndEdit?.(lineIndex - 1);
				break;
			// `o`, `O` and `r` are global bindings that the row also acts on, so they
			// stop here - without that the document handler fired too and `o`
			// inserted two lines.
			case 'o':
				event.preventDefault();
				event.stopPropagation();
				onAddNewLineAfter(lineIndex);
				break;
			case 'O':
				if (!event.shiftKey) return;
				event.preventDefault();
				event.stopPropagation();
				onAddNewLineBefore(lineIndex);
				break;
			case 'r':
				event.preventDefault();
				event.stopPropagation();
				if (line.edited) onKeyboardAction?.('reset-edited');
				break;
		}
		// `u` is deliberately absent: it belongs to the document handler alone. It
		// used to be caught here too, with an empty body and a preventDefault that
		// stopped nothing.
	}

	function handleQuickAction(action: string, event: MouseEvent) {
		event.stopPropagation();

		switch (action) {
			case 'edit-text':
				if (!isEditingText) startTextEdit();
				break;
			case 'edit-speaker':
				isEditingSpeaker = true;
				break;
			case 'edit-timestamp':
				isEditingTimestamp = true;
				break;
			case 'new-line-before':
				onAddNewLineBefore(lineIndex);
				break;
			case 'new-line-after':
				onAddNewLineAfter(lineIndex);
				break;
			case 'delete-line':
				if (transcriptLinesLength > 1 && confirm('Are you sure you want to delete this line?')) {
					onKeyboardAction?.('delete-line');
				}
				break;
			case 'auto-timestamp':
				onKeyboardAction?.('set-timestamp-previous-plus-one');
				break;
			default:
				onKeyboardAction?.(action);
		}
	}
</script>

<!-- Document-like line with minimal styling -->
<div
	class={`group relative cursor-pointer border-l-4 py-3 pl-8 transition-all duration-200 ${
		isModified && isReviewed
			? 'border-l-green-400 bg-amber-50/20 hover:bg-amber-50/40'
			: isModified
				? 'border-l-amber-400 bg-amber-50/20 hover:bg-amber-50/40'
				: isReviewed
					? 'border-l-green-400 bg-green-50/20 hover:bg-green-50/40'
					: 'border-l-transparent hover:border-l-gray-300 hover:bg-gray-50/30'
	} ${
		isActive
			? '!border-l-blue-500 !bg-blue-50/30 shadow-sm'
			: line.isHighlighted
				? '!border-l-blue-400 !bg-blue-50/20'
				: ''
	} ${line.isPlaying ? 'animate-pulse !border-l-green-500 !bg-green-50/30' : ''} ${
		isSelected ? 'ring-opacity-50 bg-blue-50/40 ring-2 ring-blue-500' : ''
	}`}
	onclick={handleLineClick}
	onkeydown={handleLineKeydown}
	role="button"
	tabindex="0"
>
	<div class="absolute top-5 -left-6">
		<input
			type="checkbox"
			checked={isSelected}
			onchange={handleSelectionChange}
			onclick={handleCheckboxClick}
			class="rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
			aria-label={`Select line ${lineIndex + 1}`}
		/>
	</div>

	<div class="mb-2 flex items-start gap-3">
		<div class="flex flex-shrink-0 items-center gap-2">
			<LineTimestampField
				value={line.time}
				editing={isEditingTimestamp}
				onRequestEdit={() => (isEditingTimestamp = true)}
				onCommit={commitTimestamp}
				onCancel={() => (isEditingTimestamp = false)}
			/>

			<LineSpeakerField
				value={line.speaker}
				displayName={speakerInfo.displayName}
				colorClass={speakerInfo.color}
				editing={isEditingSpeaker}
				datalistId={speakerDatalistId}
				onRequestEdit={() => (isEditingSpeaker = true)}
				onCommit={commitSpeaker}
				onCancel={() => (isEditingSpeaker = false)}
			/>
		</div>

		<LineStatusBadges {isModified} {isReviewed} isPlaying={!!line.isPlaying} />
	</div>

	<LineTextField
		value={line.line}
		editing={isEditingText}
		onRequestEdit={startTextEdit}
		onCommit={commitText}
		onCancel={cancelText}
		onSplit={(position) => onSplitLine(lineIndex, position)}
	/>

	{#if isActive && !isEditingAnything}
		<LineQuickActions
			{isReviewed}
			canDelete={transcriptLinesLength > 1}
			canAutoTimestamp={lineIndex > 0}
			onAction={handleQuickAction}
		/>
	{/if}
</div>
