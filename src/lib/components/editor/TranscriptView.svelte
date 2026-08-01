<script lang="ts">
	import type { EditableTranscriptLineType, SpeakerType } from '$lib/types/editor';
	import { groupIntoTurns, findSuspectBoundaries } from '$lib/utils/transcriptSegments';
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
		onMoveBoundary?: (index: number, direction: 'up' | 'down') => void;
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
		onMoveBoundary,
		selectedLineIndices = [],
		onSelectionChange
	}: Props = $props();

	// Built once per roster change rather than per row. Keyed lowercased so a line
	// reading `howard` finds the roster's `Howard`.
	let speakerLookup = $derived(
		new Map(speakers.map((speaker) => [speaker.name.trim().toLowerCase(), speaker]))
	);

	const SPEAKER_DATALIST_ID = 'editor-speaker-names';
	const VIEW_MODE_KEY = 'editor_view_mode';

	/**
	 * Lines view is the original flat list; turns view groups consecutive
	 * same-speaker lines and names the speaker once, as dedicated transcription
	 * tools do. Offered as a toggle rather than a replacement so the two can be
	 * compared on a real episode.
	 */
	let viewMode = $state<'lines' | 'turns'>('lines');

	// Restore the choice, but only in the browser - this component also renders
	// during SSR, where localStorage does not exist.
	$effect(() => {
		if (typeof localStorage === 'undefined') return;
		const stored = localStorage.getItem(VIEW_MODE_KEY);
		if (stored === 'lines' || stored === 'turns') viewMode = stored;
	});

	function setViewMode(mode: 'lines' | 'turns') {
		viewMode = mode;
		if (typeof localStorage !== 'undefined') localStorage.setItem(VIEW_MODE_KEY, mode);
	}

	let turns = $derived(groupIntoTurns(transcriptLines));

	/**
	 * Boundaries where a sentence appears to be broken across a speaker change.
	 * A detector, not a fixer - see findSuspectBoundaries. Surfaced so a
	 * line-by-line pass can go straight to the boundaries that need judgement.
	 */
	let suspectBoundaries = $derived(findSuspectBoundaries(transcriptLines));
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
						<!-- Layout toggle: flat lines, or grouped into speaker turns. -->
						<div
							class="flex rounded border border-gray-300 text-xs"
							role="group"
							aria-label="Layout"
						>
							<button
								onclick={() => setViewMode('lines')}
								class={`px-2 py-1 ${viewMode === 'lines' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
								aria-pressed={viewMode === 'lines'}
							>
								Lines
							</button>
							<button
								onclick={() => setViewMode('turns')}
								class={`px-2 py-1 ${viewMode === 'turns' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
								aria-pressed={viewMode === 'turns'}
							>
								Turns ({turns.length})
							</button>
						</div>

						{#if suspectBoundaries.size > 0}
							<span
								class="text-xs text-amber-700"
								title="A sentence appears to be split across a speaker change at these points. Check which side each fragment belongs to."
							>
								{suspectBoundaries.size} suspect boundar{suspectBoundaries.size === 1 ? 'y' : 'ies'}
							</span>
						{/if}

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
				{#if viewMode === 'turns'}
					<!--
						Turns view: consecutive same-speaker lines share one block and the
						speaker is named once. Purely presentational - lineIndex still
						refers to the real position in the transcript array.
					-->
					<div class="space-y-4">
						{#each turns as turn, turnIndex (turn.lineIndices[0])}
							{@const info = speakerLookup?.get(turn.speaker.trim().toLowerCase())}
							<section class="border-l-2 border-gray-200 pl-3">
								<header class="mb-1 flex items-center gap-2">
									<span
										class={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${info?.color ?? 'border-gray-200 bg-gray-100 text-gray-700'}`}
									>
										{info?.displayName ?? turn.speaker}
									</span>
									<span class="text-xs text-gray-400">
										{turn.lineIndices.length} line{turn.lineIndices.length === 1 ? '' : 's'}
									</span>
								</header>

								<div class="space-y-1">
									{#each turn.lineIndices as lineIndex (transcriptLines[lineIndex].id || lineIndex)}
										{@const line = transcriptLines[lineIndex]}
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
							</section>

							{#if suspectBoundaries.has(turn.lineIndices[turn.lineIndices.length - 1]) && turnIndex < turns.length - 1}
								{@render suspectMarker(turn.lineIndices[turn.lineIndices.length - 1])}
							{/if}
						{/each}
					</div>
				{:else}
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
							{#if suspectBoundaries.has(lineIndex)}
								{@render suspectMarker(lineIndex)}
							{/if}
						{/each}
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>

{#snippet suspectMarker(lineIndex: number)}
	<!--
		A sentence appears to run across this speaker change.

		Both repairs move text verbatim; which one is right depends on who is
		speaking, which the detector cannot know. So it offers both and the editor
		picks - that judgement is the whole reason this is not automated.
	-->
	<div class="flex items-center gap-2 py-1 pl-8 text-xs">
		<span class="h-px w-4 bg-amber-300"></span>
		<span class="text-amber-700">sentence runs across this speaker change</span>
		<button
			onclick={() => onMoveBoundary?.(lineIndex, 'up')}
			class="rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 font-medium text-amber-800 hover:bg-amber-100"
			title="Move the next line's opening sentence up onto this line"
		>
			↑ join up
		</button>
		<button
			onclick={() => onMoveBoundary?.(lineIndex, 'down')}
			class="rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 font-medium text-amber-800 hover:bg-amber-100"
			title="Move this line's trailing fragment down onto the next line"
		>
			↓ join down
		</button>
		<span class="h-px flex-1 bg-amber-300"></span>
	</div>
{/snippet}
