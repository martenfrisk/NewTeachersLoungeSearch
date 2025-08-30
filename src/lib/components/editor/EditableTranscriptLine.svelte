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
		onNavigateAndEdit
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
</script>

<!-- Document-like line with minimal styling -->
<div
	class={`group relative transition-all duration-200 cursor-pointer border-l-4 pl-4 py-3 ${
		line.hasChanges
			? 'border-l-orange-400 bg-orange-50/20 hover:bg-orange-50/40'
			: line.edited
				? 'border-l-green-400 bg-green-50/20 hover:bg-green-50/40'
				: 'border-l-transparent hover:border-l-gray-300 hover:bg-gray-50/30'
	} ${
		isActive
			? '!border-l-blue-500 !bg-blue-50/30 shadow-sm'
			: line.isHighlighted
				? '!border-l-blue-400 !bg-blue-50/20'
				: ''
	} ${line.isPlaying ? '!border-l-green-500 !bg-green-50/30 animate-pulse' : ''}`}
	onclick={() => onLineClick(lineIndex)}
	onkeydown={handleLineKeydown}
	role="button"
	tabindex="0"
>
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
			{#if line.hasChanges}
				<span
					class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700 border border-orange-200"
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
			{:else if line.isCommitted}
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
			{:else if line.edited}
				<span
					class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200"
					title="This line has modifications but not committed"
				>
					<svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
						<path
							d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"
						/>
					</svg>
					Modified
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
		<div class="mt-2 text-xs text-gray-500 flex flex-wrap gap-4">
			<span
				><kbd class="px-1 py-0.5 bg-gray-100 rounded text-xs">Enter</kbd> or
				<kbd class="px-1 py-0.5 bg-gray-100 rounded text-xs">E</kbd> Edit text</span
			>
			<span><kbd class="px-1 py-0.5 bg-gray-100 rounded text-xs">S</kbd> Edit speaker</span>
			<span><kbd class="px-1 py-0.5 bg-gray-100 rounded text-xs">T</kbd> Edit timestamp</span>
			<span><kbd class="px-1 py-0.5 bg-gray-100 rounded text-xs">U</kbd> Previous + 1s</span>
			<span><kbd class="px-1 py-0.5 bg-gray-100 rounded text-xs">C</kbd> Mark as edited</span>
			<span><kbd class="px-1 py-0.5 bg-gray-100 rounded text-xs">O</kbd> New line before</span>
			<span><kbd class="px-1 py-0.5 bg-gray-100 rounded text-xs">o</kbd> New line after</span>
			<span><kbd class="px-1 py-0.5 bg-gray-100 rounded text-xs">J</kbd> Next line</span>
			<span><kbd class="px-1 py-0.5 bg-gray-100 rounded text-xs">K</kbd> Previous line</span>
		</div>
	{:else if isEditingText}
		<div class="mt-2 text-xs text-gray-500 flex flex-wrap gap-4">
			<span><kbd class="px-1 py-0.5 bg-gray-100 rounded text-xs">Enter</kbd> Save & next</span>
			<span><kbd class="px-1 py-0.5 bg-gray-100 rounded text-xs">Cmd/Ctrl+S</kbd> Save only</span>
			<span><kbd class="px-1 py-0.5 bg-gray-100 rounded text-xs">Esc</kbd> Cancel</span>
		</div>
	{/if}
</div>
