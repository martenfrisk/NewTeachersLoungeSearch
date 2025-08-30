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
		onCommitLine?: (index: number) => void;
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
		onCommitLine
	}: Props = $props();
</script>

<!-- Main Content - Full Width Transcript -->
<div class={controlsCollapsed ? 'pr-4' : 'pr-84'}>
	{#if transcriptLines.length === 0}
		<div class="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center">
			<p class="text-gray-600">No transcript lines found for this episode.</p>
		</div>
	{:else}
		<div class="bg-white rounded-lg border border-gray-200 shadow-sm">
			<div class="sticky top-0 z-10 bg-white p-4 border-b border-gray-200">
				<div class="flex items-center justify-between">
					<h3 class="font-medium text-gray-900">
						Transcript ({transcriptLines.length} lines)
					</h3>
					<div class="text-sm text-gray-600">
						Line {currentLineIndex + 1} of {transcriptLines.length}
					</div>
				</div>
			</div>

			<!-- Document-style transcript with line spacing -->
			<div class="p-6">
				<div class="space-y-1">
					{#each transcriptLines as line, lineIndex (line.id || lineIndex)}
						<div data-line-index={lineIndex}>
							<EditableTranscriptLine
								{line}
								{speakers}
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
								{onCommitLine}
							/>
						</div>
					{/each}
				</div>
			</div>
		</div>
	{/if}
</div>
