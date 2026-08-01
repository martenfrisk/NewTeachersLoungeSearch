<script lang="ts">
	import type { EditableTranscriptLineType, SpeakerType } from '$lib/types/editor';
	import EditableTranscriptLine from './EditableTranscriptLine.svelte';

	interface Props {
		transcriptLines: EditableTranscriptLineType[];
		speakers: SpeakerType[];
		currentLineIndex: number;
		controlsCollapsed: boolean;
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
		selectedLineIndices?: number[];
		onSelectionChange?: (
			index: number,
			selected: boolean,
			shiftKey?: boolean,
			ctrlKey?: boolean
		) => void;
	}

	let {
		transcriptLines,
		speakers,
		currentLineIndex,
		controlsCollapsed,
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
		selectedLineIndices = [],
		onSelectionChange
	}: Props = $props();

	// Built once per roster change rather than per row. Keyed lowercased so a line
	// reading `howard` finds the roster's `Howard`.
	let speakerLookup = $derived(
		new Map(speakers.map((speaker) => [speaker.name.trim().toLowerCase(), speaker]))
	);

	const SPEAKER_DATALIST_ID = 'editor-speaker-names';
</script>

<!--
	One datalist for the whole transcript. Every line's speaker input references it
	by id, so the roster is rendered once rather than once per line.

	`value` is the string written to the database; `label` is what the browser
	shows alongside it, so a machine label reads "Unknown Speaker #2" in the
	dropdown while still storing `spk_0`.
-->
<datalist id={SPEAKER_DATALIST_ID}>
	{#each speakers as speaker (speaker.id)}
		<option value={speaker.name} label={speaker.displayName}></option>
	{/each}
</datalist>

<!-- Main Content - Full Width Transcript -->
<div class={controlsCollapsed ? 'pr-4' : 'pr-0'}>
	{#if transcriptLines.length === 0}
		<div class="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center">
			<p class="text-gray-600">No transcript lines found for this episode.</p>
		</div>
	{:else}
		<div class="bg-white rounded-lg border border-gray-200 shadow-sm">
			<div class="bg-white p-4 border-b border-gray-200">
				<div class="flex items-center justify-between">
					<h3 class="font-medium text-gray-900">
						Transcript ({transcriptLines.length} lines)
						{#if selectedLineIndices.length > 0}
							<span class="text-blue-600 text-sm font-normal">
								({selectedLineIndices.length} selected)
							</span>
						{/if}
					</h3>
					<div class="flex items-center gap-3">
						{#if selectedLineIndices.length > 0}
							<button
								onclick={() => onSelectionChange?.(-1, false)}
								class="text-xs text-gray-600 hover:text-gray-800"
								title="Clear selection"
							>
								Clear selection
							</button>
						{/if}
						<button
							onclick={() =>
								onSelectionChange?.(-2, selectedLineIndices.length < transcriptLines.length)}
							class="text-xs text-blue-600 hover:text-blue-800"
							title={selectedLineIndices.length === transcriptLines.length
								? 'Deselect all'
								: 'Select all'}
						>
							{selectedLineIndices.length === transcriptLines.length
								? 'Deselect all'
								: 'Select all'}
						</button>
						<div class="text-sm text-gray-600">
							Line {currentLineIndex + 1} of {transcriptLines.length}
						</div>
					</div>
				</div>
			</div>

			<!-- Document-style transcript with line spacing -->
			<div class="p-6 pb-64">
				<div class="space-y-1">
					{#each transcriptLines as line, lineIndex (line.id || lineIndex)}
						<div data-line-index={lineIndex}>
							<EditableTranscriptLine
								{line}
								{speakerLookup}
								speakerDatalistId={SPEAKER_DATALIST_ID}
								isActive={lineIndex === currentLineIndex}
								{lineIndex}
								{onTextEdit}
								{onSpeakerEdit}
								{onTimestampEdit}
								{onLineClick}
								{onSplitLine}
								{onAddNewLineBefore}
								{onAddNewLineAfter}
								{onStartEditing}
								{onStopEditing}
								{onNavigateAndEdit}
								{onKeyboardAction}
								transcriptLinesLength={transcriptLines.length}
								isSelected={selectedLineIndices.includes(lineIndex)}
								{onSelectionChange}
							/>
						</div>
					{/each}
				</div>
			</div>
		</div>
	{/if}
</div>
