<script lang="ts">
	import type { EditableTranscriptLineType, SpeakerType } from '$lib/types/editor';

	// Focus management action to replace autofocus
	function focusOnMount(element: HTMLElement) {
		setTimeout(() => element.focus(), 0);
		return {
			destroy() {}
		};
	}

	interface Props {
		line: EditableTranscriptLineType;
		speakers: SpeakerType[];
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
		speakers,
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

	// Local editing states
	let isEditingText = $state(false);
	let isEditingSpeaker = $state(false);
	let isEditingTimestamp = $state(false);
	let textareaRef: HTMLTextAreaElement | null = $state(null);
	let editedText = $state(line.line);
	let editedSpeaker = $state(line.speaker);
	let editedTimestamp = $state(line.time);

	// Sync local state when line changes
	$effect(() => {
		if (!isEditingText) {
			editedText = line.line;
		}
		if (!isEditingSpeaker) {
			editedSpeaker = line.speaker;
		}
		if (!isEditingTimestamp) {
			editedTimestamp = line.time;
		}
	});

	// Sync local editing state with global state
	$effect(() => {
		if (!line.isEditing && isEditingText) {
			isEditingText = false;
		}
	});

	// Get speaker styling
	let speakerInfo = $derived(
		speakers.find((s) => s.name.toLowerCase() === line.speaker.toLowerCase()) ||
			speakers.find((s) => s.id === 'unknown')!
	);

	// Auto-resize textarea
	function adjustTextareaHeight() {
		if (textareaRef) {
			textareaRef.style.height = 'auto';
			textareaRef.style.height = textareaRef.scrollHeight + 'px';
		}
	}

	// Text editing functions
	function startTextEdit() {
		isEditingText = true;
		editedText = line.line;
		onStartEditing(lineIndex);

		// Focus textarea after DOM update
		setTimeout(() => {
			if (textareaRef) {
				textareaRef.focus();
				adjustTextareaHeight();
			}
		}, 0);
	}

	function saveTextEdit() {
		onTextEdit(lineIndex, editedText);
		isEditingText = false;
		onStopEditing(lineIndex);
	}

	function cancelTextEdit() {
		editedText = line.line;
		isEditingText = false;
		onStopEditing(lineIndex);
	}

	// Speaker editing functions
	function startSpeakerEdit() {
		isEditingSpeaker = true;
		editedSpeaker = line.speaker;
	}

	function saveSpeakerEdit() {
		onSpeakerEdit(lineIndex, editedSpeaker);
		isEditingSpeaker = false;
	}

	function cancelSpeakerEdit() {
		editedSpeaker = line.speaker;
		isEditingSpeaker = false;
	}

	// Timestamp editing functions
	function startTimestampEdit() {
		isEditingTimestamp = true;
		editedTimestamp = line.time;
	}

	function saveTimestampEdit() {
		onTimestampEdit(lineIndex, editedTimestamp);
		isEditingTimestamp = false;
	}

	function cancelTimestampEdit() {
		editedTimestamp = line.time;
		isEditingTimestamp = false;
	}

	// Handle checkbox change
	function handleSelectionChange(event: Event) {
		const checkbox = event.target as HTMLInputElement;
		// For checkbox changes, we need to check if modifier keys were held during the click
		// Unfortunately, the change event doesn't preserve modifier keys, so we'll rely on click events instead
		onSelectionChange?.(lineIndex, checkbox.checked);
	}

	// Handle checkbox click to capture modifier keys
	function handleCheckboxClick(event: MouseEvent) {
		const checkbox = event.target as HTMLInputElement;
		const isShiftKey = event.shiftKey;

		// The checkbox will be checked by default behavior, so use that state
		const newCheckedState = checkbox.checked;

		onSelectionChange?.(lineIndex, newCheckedState, isShiftKey);
	}

	// Handle line click for selection (when not editing)
	function handleLineClick(event: MouseEvent) {
		// Don't interfere with text editing or action buttons
		if (isEditingText || isEditingSpeaker || isEditingTimestamp) return;
		if (event.target && (event.target as HTMLElement).closest('button, input, select, textarea')) {
			return;
		}

		const isShiftKey = event.shiftKey;
		const isCtrlKey = event.ctrlKey || event.metaKey;

		if (isShiftKey || isCtrlKey) {
			// Multi-select mode - for shift+click, we want to select (true) for range selection
			// For ctrl+click, we want to toggle
			const newState = isShiftKey ? true : !isSelected;
			onSelectionChange?.(lineIndex, newState, isShiftKey, isCtrlKey);
		} else {
			// Normal line click navigation
			onLineClick(lineIndex);
		}
	}

	// Global line navigation handler
	function handleLineKeydown(event: KeyboardEvent) {
		// Don't interfere with text editing
		if (isEditingText || isEditingSpeaker || isEditingTimestamp) return;

		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			startTextEdit();
		} else if (event.key === 'e' && !event.ctrlKey && !event.metaKey) {
			event.preventDefault();
			startTextEdit();
		} else if (event.key === 's' && !event.ctrlKey && !event.metaKey) {
			event.preventDefault();
			startSpeakerEdit();
		} else if (event.key === 't' && !event.ctrlKey && !event.metaKey) {
			event.preventDefault();
			startTimestampEdit();
		} else if (event.key === 'j') {
			event.preventDefault();
			onNavigateAndEdit?.(lineIndex + 1);
		} else if (event.key === 'k') {
			event.preventDefault();
			onNavigateAndEdit?.(lineIndex - 1);
		} else if (event.key === 'o' && !event.ctrlKey && !event.metaKey) {
			event.preventDefault();
			onAddNewLineAfter(lineIndex);
		} else if (event.key === 'O' && event.shiftKey && !event.ctrlKey && !event.metaKey) {
			event.preventDefault();
			onAddNewLineBefore(lineIndex);
		} else if (event.key === 'u' && !event.ctrlKey && !event.metaKey) {
			event.preventDefault();
			// This will be handled by the global keyboard handler
		} else if (event.key === 'r' && !event.ctrlKey && !event.metaKey) {
			event.preventDefault();
			if (line.editState === 'edited') {
				onKeyboardAction?.('reset-edited');
			}
		}
	}

	// Handle keyboard events in textarea
	function handleTextareaKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			if (event.ctrlKey || event.metaKey) {
				// Split line at cursor position
				const cursorPosition = (event.target as HTMLTextAreaElement).selectionStart;
				onSplitLine(lineIndex, cursorPosition);
			} else {
				// Only save if there's actual text content
				if (editedText.trim()) {
					saveTextEdit();
					// Navigate to next line after saving
					setTimeout(() => onNavigateAndEdit?.(lineIndex + 1), 0);
				} else {
					// If empty, just cancel and move to next line
					cancelTextEdit();
					setTimeout(() => onNavigateAndEdit?.(lineIndex + 1), 0);
				}
			}
		} else if (event.key === 's' && (event.ctrlKey || event.metaKey)) {
			// Ctrl+S / Cmd+S to save
			event.preventDefault();
			if (editedText.trim()) {
				saveTextEdit();
			} else {
				cancelTextEdit();
			}
		} else if (event.key === 'Escape') {
			event.preventDefault();
			cancelTextEdit();
		} else if (event.key === 'ArrowUp' && (event.ctrlKey || event.metaKey)) {
			event.preventDefault();
			if (editedText.trim()) {
				saveTextEdit();
			} else {
				cancelTextEdit();
			}
			// Move to previous line and start editing
			setTimeout(() => onNavigateAndEdit?.(lineIndex - 1), 0);
		} else if (event.key === 'ArrowDown' && (event.ctrlKey || event.metaKey)) {
			event.preventDefault();
			if (editedText.trim()) {
				saveTextEdit();
			} else {
				cancelTextEdit();
			}
			// Move to next line and start editing
			setTimeout(() => onNavigateAndEdit?.(lineIndex + 1), 0);
		}
	}

	function handleSelectKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			if (isEditingSpeaker) saveSpeakerEdit();
			if (isEditingTimestamp) saveTimestampEdit();
		} else if (event.key === 'Escape') {
			event.preventDefault();
			if (isEditingSpeaker) cancelSpeakerEdit();
			if (isEditingTimestamp) cancelTimestampEdit();
		}
	}

	// Double click handlers
	function handleTextDoubleClick() {
		if (!isEditingText) {
			startTextEdit();
		}
	}

	function handleSpeakerDoubleClick() {
		if (!isEditingSpeaker) {
			startSpeakerEdit();
		}
	}

	function handleTimestampDoubleClick() {
		if (!isEditingTimestamp) {
			startTimestampEdit();
		}
	}

	// Action button handlers
	function handleActionButton(action: string, event: MouseEvent) {
		event.stopPropagation(); // Prevent line click

		switch (action) {
			case 'edit-text':
				if (!isEditingText) startTextEdit();
				break;
			case 'edit-speaker':
				if (!isEditingSpeaker) startSpeakerEdit();
				break;
			case 'edit-timestamp':
				if (!isEditingTimestamp) startTimestampEdit();
				break;
			case 'new-line-before':
				onAddNewLineBefore(lineIndex);
				break;
			case 'new-line-after':
				onAddNewLineAfter(lineIndex);
				break;
			case 'delete-line':
				if (transcriptLinesLength > 1) {
					const confirmed = confirm('Are you sure you want to delete this line?');
					if (confirmed && onKeyboardAction) {
						onKeyboardAction('delete-line');
					}
				}
				break;
			case 'auto-timestamp':
				if (onKeyboardAction) onKeyboardAction('set-timestamp-previous-plus-one');
				break;
			case 'save-line':
				if (onKeyboardAction) onKeyboardAction('save-line');
				break;
			case 'commit-line':
				if (onKeyboardAction) onKeyboardAction('commit-line');
				break;
			case 'reset-edited':
				if (onKeyboardAction) onKeyboardAction('reset-edited');
				break;
			default:
				if (onKeyboardAction) onKeyboardAction(action);
		}
	}

	// Check if action should be disabled
	function isActionDisabled(action: string): boolean {
		switch (action) {
			case 'delete-line':
				return transcriptLinesLength <= 1;
			case 'auto-timestamp':
				return lineIndex === 0;
			default:
				return false;
		}
	}
</script>

<!-- Document-like line with minimal styling -->
<div
	class={`group relative transition-all duration-200 cursor-pointer border-l-4 pl-8 py-3 ${
		line.editState === 'unsaved'
			? 'border-l-yellow-400 bg-yellow-50/20 hover:bg-yellow-50/40'
			: line.editState === 'saved'
				? 'border-l-orange-400 bg-orange-50/20 hover:bg-orange-50/40'
				: line.editState === 'edited'
					? 'border-l-green-400 bg-green-50/20 hover:bg-green-50/40'
					: 'border-l-transparent hover:border-l-gray-300 hover:bg-gray-50/30'
	} ${
		isActive
			? '!border-l-blue-500 !bg-blue-50/30 shadow-sm'
			: line.isHighlighted
				? '!border-l-blue-400 !bg-blue-50/20'
				: ''
	} ${line.isPlaying ? '!border-l-green-500 !bg-green-50/30 animate-pulse' : ''} ${
		isSelected ? 'ring-2 ring-blue-500 ring-opacity-50 bg-blue-50/40' : ''
	}`}
	onclick={handleLineClick}
	onkeydown={handleLineKeydown}
	role="button"
	tabindex="0"
>
	<!-- Selection checkbox -->
	<div class="absolute -left-6 top-5">
		<input
			type="checkbox"
			checked={isSelected}
			onchange={handleSelectionChange}
			onclick={handleCheckboxClick}
			class="rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2"
		/>
	</div>
	<!-- Compact header with inline meta information -->
	<div class="flex items-start gap-3 mb-2">
		<div class="flex items-center gap-2 flex-shrink-0">
			<!-- Timestamp -->
			{#if isEditingTimestamp}
				<input
					bind:value={editedTimestamp}
					type="text"
					class="text-xs font-medium text-gray-600 bg-white px-2 py-1 rounded border border-blue-300 focus:ring-1 focus:ring-blue-500 focus:outline-none"
					style="width: 60px;"
					onblur={saveTimestampEdit}
					onkeydown={handleSelectKeydown}
					use:focusOnMount
				/>
			{:else}
				<button
					class="text-xs font-medium text-gray-500 bg-white/60 px-2 py-1 rounded-full border hover:bg-white hover:text-gray-700 transition-colors"
					ondblclick={handleTimestampDoubleClick}
					title="Double-click to edit timestamp"
				>
					{line.time}
				</button>
			{/if}

			<!-- Speaker -->
			{#if isEditingSpeaker}
				<select
					bind:value={editedSpeaker}
					class="text-xs sm:text-sm font-medium border rounded-full px-3 py-1 focus:ring-1 focus:ring-blue-500 focus:outline-none"
					onblur={saveSpeakerEdit}
					onkeydown={handleSelectKeydown}
					use:focusOnMount
				>
					{#each speakers as speaker (speaker.name)}
						<option value={speaker.name}>{speaker.displayName}</option>
					{/each}
				</select>
			{:else}
				<button
					class={`inline-flex items-center px-3 py-1 rounded-full text-xs sm:text-sm font-medium border transition-colors hover:opacity-80 ${speakerInfo.color}`}
					ondblclick={handleSpeakerDoubleClick}
					title="Double-click to edit speaker"
				>
					{speakerInfo.displayName}
				</button>
			{/if}
		</div>

		<div class="flex items-center gap-2 ml-auto flex-shrink-0">
			<!-- Status indicators -->
			<span class="text-xs">{line.editState} | edited: {line.edited}</span>
			{#if line.editState === 'unsaved'}
				<span
					class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 border border-yellow-200"
					title="Has unsaved changes"
				>
					<svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
						<path
							fill-rule="evenodd"
							d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
							clip-rule="evenodd"
						/>
					</svg>
					Unsaved
				</span>
			{:else if line.editState === 'saved'}
				<span
					class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700 border border-orange-200"
					title="Changes saved but not marked as done"
				>
					<svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
						<path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
					</svg>
					Saved
				</span>
			{:else if line.editState === 'edited' || line.edited}
				<span
					class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200"
					title="This line has been marked as edited/done"
				>
					<svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
						<path
							fill-rule="evenodd"
							d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
							clip-rule="evenodd"
						/>
					</svg>
					Edited
				</span>
			{:else}
				<span
					class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200"
					title="Original auto-transcribed line"
				>
					<svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
						<path
							fill-rule="evenodd"
							d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
							clip-rule="evenodd"
						/>
					</svg>
					<span class="hidden sm:inline">Auto</span>
				</span>
			{/if}

			<!-- Playing indicator -->
			{#if line.isPlaying}
				<div class="flex items-center text-green-600 animate-pulse">
					<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
						<path
							d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.814L4.5 13.5H2a1 1 0 01-1-1v-5a1 1 0 011-1h2.5l3.883-3.314A1 1 0 019.383 3.076zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 11-1.414-1.414A7.971 7.971 0 0017 10a7.971 7.971 0 00-2.343-5.657 1 1 0 010-1.414z"
						/>
					</svg>
				</div>
			{/if}
		</div>
	</div>

	<!-- Main content area -->
	<div class="min-h-[2rem]">
		{#if isEditingText}
			<textarea
				bind:this={textareaRef}
				bind:value={editedText}
				class="w-full text-gray-900 leading-relaxed text-base resize-none border-2 border-blue-300 focus:border-blue-500 focus:ring-0 focus:outline-none bg-white/80 px-2 py-1 rounded"
				style="min-height: 2rem;"
				oninput={adjustTextareaHeight}
				onkeydown={handleTextareaKeydown}
				placeholder="Enter text..."
			></textarea>
		{:else}
			<div
				class="text-gray-900 leading-relaxed text-base break-words cursor-text hover:bg-gray-100/20 px-2 py-1 -mx-2 -my-1 rounded transition-colors"
				ondblclick={handleTextDoubleClick}
				onkeydown={(e) => e.key === 'Enter' && handleTextDoubleClick()}
				role="button"
				tabindex="0"
				title="Double-click to edit text"
			>
				{line.line}
			</div>
		{/if}
	</div>

	<!-- Keyboard shortcuts hint (shown when active) -->
	{#if isActive && !isEditingText && !isEditingSpeaker && !isEditingTimestamp}
		<div class="mt-2 p-3 bg-gray-50 mr-4 rounded-lg border border-gray-200">
			<div class="text-xs text-gray-600 gap-4 mb-3 flex items-center">
				<span class="font-medium">Quick Actions</span>
				<div class="flex flex-wrap gap-1">
					<button
						onclick={(e) => handleActionButton('edit-text', e)}
						class="action-button-mini action-button-mini-blue"
						title="Edit text content (Enter)"
					>
						✏️
					</button>
					<button
						onclick={(e) => handleActionButton('edit-speaker', e)}
						class="action-button-mini action-button-mini-purple"
						title="Edit speaker (S)"
					>
						👤
					</button>
					<button
						onclick={(e) => handleActionButton('edit-timestamp', e)}
						class="action-button-mini action-button-mini-green"
						title="Edit timestamp (T)"
					>
						⏰
					</button>
					<span class="text-gray-300 mx-1">|</span>
					<button
						onclick={(e) => handleActionButton('new-line-before', e)}
						class="action-button-mini action-button-mini-gray"
						title="Add new line before (Shift+O)"
					>
						⬆️+
					</button>
					<button
						onclick={(e) => handleActionButton('new-line-after', e)}
						class="action-button-mini action-button-mini-gray"
						title="Add new line after (O)"
					>
						⬇️+
					</button>
					<button
						onclick={(e) => handleActionButton('delete-line', e)}
						class="action-button-mini action-button-mini-red"
						disabled={isActionDisabled('delete-line')}
						title="Delete line (Ctrl+Del)"
					>
						🗑️
					</button>
					<span class="text-gray-300 mx-1">|</span>
					<button
						onclick={(e) => handleActionButton('auto-timestamp', e)}
						class="action-button-mini action-button-mini-orange"
						disabled={isActionDisabled('auto-timestamp')}
						title="Set timestamp to previous + 1s (U)"
					>
						🔄
					</button>
					<button
						onclick={(e) => handleActionButton('save-line', e)}
						class="action-button-mini action-button-mini-green"
						title="Save changes (W)"
					>
						💾
					</button>
					<button
						onclick={(e) => handleActionButton('commit-line', e)}
						class="action-button-mini action-button-mini-yellow"
						title="Mark as done (C)"
					>
						✅
					</button>
					{#if line.editState === 'edited'}
						<button
							onclick={(e) => handleActionButton('reset-edited', e)}
							class="action-button-mini action-button-mini-gray"
							title="Reset to unedited state (R)"
						>
							↩️
						</button>
					{/if}
				</div>
			</div>

			<!-- Compact mouse buttons (for users who prefer mouse over keyboard) -->

			<!-- Keyboard shortcuts reference -->
			<details class="mt-3">
				<summary class="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
					Keyboard shortcuts
				</summary>
				<div class="mt-2 grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1 text-xs text-gray-600">
					<div class="flex items-center gap-1">
						<kbd class="shortcut-key-mini">Enter</kbd>
						<span>Edit text</span>
					</div>
					<div class="flex items-center gap-1">
						<kbd class="shortcut-key-mini">S</kbd>
						<span>Edit speaker</span>
					</div>
					<div class="flex items-center gap-1">
						<kbd class="shortcut-key-mini">T</kbd>
						<span>Edit time</span>
					</div>
					<div class="flex items-center gap-1">
						<kbd class="shortcut-key-mini">o</kbd>
						<span>New line after</span>
					</div>
					<div class="flex items-center gap-1">
						<kbd class="shortcut-key-mini">O</kbd>
						<span>New line before</span>
					</div>
					<div class="flex items-center gap-1">
						<kbd class="shortcut-key-mini">Ctrl+Del</kbd>
						<span>Delete line</span>
					</div>
					<div class="flex items-center gap-1">
						<kbd class="shortcut-key-mini">U</kbd>
						<span>Auto-time</span>
					</div>
					<div class="flex items-center gap-1">
						<kbd class="shortcut-key-mini">W</kbd>
						<span>Save</span>
					</div>
					<div class="flex items-center gap-1">
						<kbd class="shortcut-key-mini">C</kbd>
						<span>Mark done</span>
					</div>
					{#if line.editState === 'edited'}
						<div class="flex items-center gap-1">
							<kbd class="shortcut-key-mini">R</kbd>
							<span>Reset edited</span>
						</div>
					{/if}
				</div>
			</details>
		</div>
	{:else if isEditingText}
		<div class="mt-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
			<div class="text-xs text-blue-600 mb-1 font-medium">Text Editing</div>
			<div class="flex flex-wrap gap-3 text-xs text-blue-700">
				<div class="flex items-center gap-1">
					<kbd class="shortcut-key-mini-blue">Enter</kbd>
					<span>Save & next</span>
				</div>
				<div class="flex items-center gap-1">
					<kbd class="shortcut-key-mini-blue">Ctrl+S</kbd>
					<span>Save only</span>
				</div>
				<div class="flex items-center gap-1">
					<kbd class="shortcut-key-mini-blue">Esc</kbd>
					<span>Cancel</span>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.shortcut-key-mini {
		display: inline-flex;
		align-items: center;
		font-family: ui-monospace, SFMono-Regular, 'SF Mono', monospace;
		font-size: 0.625rem;
		font-weight: 600;
		background: linear-gradient(145deg, #ffffff 0%, #f1f5f9 100%);
		border: 1px solid #d1d5db;
		border-radius: 0.25rem;
		padding: 0.125rem 0.25rem;
		box-shadow: 0 1px 1px rgba(0, 0, 0, 0.05);
		color: #4b5563;
		min-width: fit-content;
	}

	.shortcut-key-mini-blue {
		display: inline-flex;
		align-items: center;
		font-family: ui-monospace, SFMono-Regular, 'SF Mono', monospace;
		font-size: 0.625rem;
		font-weight: 600;
		background: linear-gradient(145deg, #dbeafe 0%, #bfdbfe 100%);
		border: 1px solid #93c5fd;
		border-radius: 0.25rem;
		padding: 0.125rem 0.25rem;
		box-shadow: 0 1px 1px rgba(0, 0, 0, 0.05);
		color: #1e40af;
		min-width: fit-content;
	}

	.action-button {
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.75rem;
		font-weight: 500;
		padding: 0.5rem 0.75rem;
		border-radius: 0.375rem;
		border: 1px solid;
		cursor: pointer;
		transition: all 0.15s ease;
		background: white;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
	}

	.action-button:hover:not(:disabled) {
		transform: translateY(-1px);
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.action-button:active:not(:disabled) {
		transform: translateY(0);
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
	}

	.action-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		transform: none !important;
	}

	.action-button-blue {
		color: #1e40af;
		border-color: #3b82f6;
		background: linear-gradient(145deg, #eff6ff 0%, #dbeafe 100%);
	}

	.action-button-blue:hover:not(:disabled) {
		background: linear-gradient(145deg, #dbeafe 0%, #bfdbfe 100%);
		border-color: #2563eb;
	}

	.action-button-purple {
		color: #7c3aed;
		border-color: #8b5cf6;
		background: linear-gradient(145deg, #f5f3ff 0%, #ede9fe 100%);
	}

	.action-button-purple:hover:not(:disabled) {
		background: linear-gradient(145deg, #ede9fe 0%, #ddd6fe 100%);
		border-color: #7c3aed;
	}

	.action-button-green {
		color: #059669;
		border-color: #10b981;
		background: linear-gradient(145deg, #ecfdf5 0%, #d1fae5 100%);
	}

	.action-button-green:hover:not(:disabled) {
		background: linear-gradient(145deg, #d1fae5 0%, #a7f3d0 100%);
		border-color: #059669;
	}

	.action-button-gray {
		color: #4b5563;
		border-color: #6b7280;
		background: linear-gradient(145deg, #f9fafb 0%, #f3f4f6 100%);
	}

	.action-button-gray:hover:not(:disabled) {
		background: linear-gradient(145deg, #f3f4f6 0%, #e5e7eb 100%);
		border-color: #4b5563;
	}

	.action-button-red {
		color: #dc2626;
		border-color: #ef4444;
		background: linear-gradient(145deg, #fef2f2 0%, #fecaca 100%);
	}

	.action-button-red:hover:not(:disabled) {
		background: linear-gradient(145deg, #fecaca 0%, #fca5a5 100%);
		border-color: #dc2626;
	}

	.action-button-orange {
		color: #ea580c;
		border-color: #f97316;
		background: linear-gradient(145deg, #fff7ed 0%, #fed7aa 100%);
	}

	.action-button-orange:hover:not(:disabled) {
		background: linear-gradient(145deg, #fed7aa 0%, #fdba74 100%);
		border-color: #ea580c;
	}

	.action-button-yellow {
		color: #d97706;
		border-color: #f59e0b;
		background: linear-gradient(145deg, #fffbeb 0%, #fef3c7 100%);
	}

	.action-button-yellow:hover:not(:disabled) {
		background: linear-gradient(145deg, #fef3c7 0%, #fde68a 100%);
		border-color: #d97706;
	}

	/* Mini action buttons - compact and subtle */
	.action-button-mini {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-size: 0.75rem;
		line-height: 1;
		padding: 0.25rem;
		width: 1.5rem;
		height: 1.5rem;
		border-radius: 0.25rem;
		border: 1px solid;
		cursor: pointer;
		transition: all 0.1s ease;
		background: white;
		box-shadow: 0 1px 1px rgba(0, 0, 0, 0.05);
		opacity: 0.7;
	}

	.action-button-mini:hover:not(:disabled) {
		opacity: 1;
		transform: translateY(-1px);
		box-shadow: 0 2px 3px rgba(0, 0, 0, 0.1);
	}

	.action-button-mini:active:not(:disabled) {
		transform: translateY(0);
		box-shadow: 0 1px 1px rgba(0, 0, 0, 0.05);
	}

	.action-button-mini:disabled {
		opacity: 0.3;
		cursor: not-allowed;
		transform: none !important;
	}

	.action-button-mini-blue {
		color: #1e40af;
		border-color: #bfdbfe;
		background: linear-gradient(145deg, #ffffff 0%, #f0f8ff 100%);
	}

	.action-button-mini-blue:hover:not(:disabled) {
		border-color: #3b82f6;
		background: linear-gradient(145deg, #dbeafe 0%, #bfdbfe 100%);
	}

	.action-button-mini-purple {
		color: #7c3aed;
		border-color: #ddd6fe;
		background: linear-gradient(145deg, #ffffff 0%, #faf7ff 100%);
	}

	.action-button-mini-purple:hover:not(:disabled) {
		border-color: #8b5cf6;
		background: linear-gradient(145deg, #ede9fe 0%, #ddd6fe 100%);
	}

	.action-button-mini-green {
		color: #059669;
		border-color: #a7f3d0;
		background: linear-gradient(145deg, #ffffff 0%, #f0fdf4 100%);
	}

	.action-button-mini-green:hover:not(:disabled) {
		border-color: #10b981;
		background: linear-gradient(145deg, #d1fae5 0%, #a7f3d0 100%);
	}

	.action-button-mini-gray {
		color: #4b5563;
		border-color: #e5e7eb;
		background: linear-gradient(145deg, #ffffff 0%, #f9fafb 100%);
	}

	.action-button-mini-gray:hover:not(:disabled) {
		border-color: #6b7280;
		background: linear-gradient(145deg, #f3f4f6 0%, #e5e7eb 100%);
	}

	.action-button-mini-red {
		color: #dc2626;
		border-color: #fca5a5;
		background: linear-gradient(145deg, #ffffff 0%, #fffafa 100%);
	}

	.action-button-mini-red:hover:not(:disabled) {
		border-color: #ef4444;
		background: linear-gradient(145deg, #fecaca 0%, #fca5a5 100%);
	}

	.action-button-mini-orange {
		color: #ea580c;
		border-color: #fdba74;
		background: linear-gradient(145deg, #ffffff 0%, #fffbf5 100%);
	}

	.action-button-mini-orange:hover:not(:disabled) {
		border-color: #f97316;
		background: linear-gradient(145deg, #fed7aa 0%, #fdba74 100%);
	}

	.action-button-mini-yellow {
		color: #d97706;
		border-color: #fde68a;
		background: linear-gradient(145deg, #ffffff 0%, #fffef0 100%);
	}

	.action-button-mini-yellow:hover:not(:disabled) {
		border-color: #f59e0b;
		background: linear-gradient(145deg, #fef3c7 0%, #fde68a 100%);
	}
</style>
