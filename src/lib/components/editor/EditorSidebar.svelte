<script lang="ts">
	import type { SpeakerType } from '$lib/types/editor';
	import SpeakerManager from './SpeakerManager.svelte';
	import EditorMouseControls from './EditorMouseControls.svelte';
	import MassActions from './MassActions.svelte';
	import Button from '../ui/Button.svelte';

	interface Props {
		selectedEpisode: string | null;
		speakers: SpeakerType[];
		shiftControlsCollapsed: boolean;
		mouseControlsCollapsed?: boolean;
		onToggleShiftControls: () => void;
		onToggleMouseControls?: () => void;
		onEpisodeSelect: (episodeId: string) => void;
		onSpeakersChange: (speakers: SpeakerType[]) => void;
		onAddSpeaker: (name: string) => void;
		onShiftAllLines: (shiftSeconds: number) => void;
		onSaveAllChanges: () => void;
		onKeyboardAction: (action: string) => void;
		changedLinesCount: number;
		currentLineIndex?: number;
		transcriptLinesLength?: number;
		isLoading?: boolean;
	}

	let {
		selectedEpisode,
		speakers,
		shiftControlsCollapsed,
		mouseControlsCollapsed = false,
		onToggleShiftControls,
		onToggleMouseControls,
		onEpisodeSelect,
		onSpeakersChange,
		onAddSpeaker,
		onShiftAllLines,
		onSaveAllChanges,
		onKeyboardAction,
		changedLinesCount,
		currentLineIndex = -1,
		transcriptLinesLength = 0,
		isLoading = false
	}: Props = $props();

	function handleShiftInputKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
			const value = parseFloat(e.target.value);
			if (!isNaN(value)) {
				onShiftAllLines(value);
				e.target.value = '';
			}
		}
	}
</script>

<!-- Editor Sidebar Frame - Now integrated into grid layout -->
<div class="w-80 h-full overflow-y-auto p-4 bg-gray-50 border-l border-gray-200">
	<div class="space-y-4">
		<!-- Mouse Controls -->
		<EditorMouseControls
			{onKeyboardAction}
			{currentLineIndex}
			{transcriptLinesLength}
			{isLoading}
			collapsed={mouseControlsCollapsed}
			onToggleCollapsed={onToggleMouseControls}
		/>

		<!-- Mass Actions -->
		<MassActions {transcriptLinesLength} {isLoading} />

		<!-- Episode info -->
		<div class="bg-white rounded-lg border border-gray-200 shadow-lg p-4">
			<h3 class="font-medium text-gray-900 mb-2">Current Episode</h3>
			<p class="text-sm text-gray-600 mb-2">{selectedEpisode}</p>
			<Button variant="outline" size="sm" onclick={() => onEpisodeSelect('')}>
				Change Episode
			</Button>
		</div>

		<!-- Save All Changes -->
		{#if changedLinesCount > 0}
			<div class="bg-white rounded-lg border border-gray-200 shadow-lg p-4">
				<h3 class="font-medium text-gray-900 mb-2">Save Changes</h3>
				<p class="text-sm text-gray-600 mb-3">
					{changedLinesCount} line{changedLinesCount === 1 ? '' : 's'} with unsaved changes
				</p>
				<Button variant="primary" size="sm" onclick={onSaveAllChanges} class="w-full">
					<svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
						<path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
					</svg>
					Save All Changes
				</Button>
			</div>
		{/if}

		<!-- Shift All Lines (Collapsible) -->
		<div class="bg-white rounded-lg border border-gray-200 shadow-lg">
			<div class="p-4 border-b border-gray-200">
				<div class="flex items-center justify-between">
					<h3 class="font-medium text-gray-900">Shift All Lines</h3>
					<button
						onclick={onToggleShiftControls}
						class="text-gray-400 hover:text-gray-600 transition-colors"
						aria-label={shiftControlsCollapsed ? 'Expand' : 'Collapse'}
					>
						<svg
							class={`w-5 h-5 transform transition-transform ${shiftControlsCollapsed ? 'rotate-180' : ''}`}
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="m19 9-7 7-7-7"
							/>
						</svg>
					</button>
				</div>
				{#if !shiftControlsCollapsed}
					<p class="text-xs text-gray-600 mt-1">
						Adjust all transcript timestamps by a fixed amount
					</p>
				{/if}
			</div>

			{#if !shiftControlsCollapsed}
				<div class="p-4">
					<div class="grid grid-cols-2 gap-2 mb-3">
						<Button variant="outline" size="sm" onclick={() => onShiftAllLines(-5)} class="text-xs">
							← 5s
						</Button>
						<Button variant="outline" size="sm" onclick={() => onShiftAllLines(5)} class="text-xs">
							5s →
						</Button>
						<Button variant="outline" size="sm" onclick={() => onShiftAllLines(-1)} class="text-xs">
							← 1s
						</Button>
						<Button variant="outline" size="sm" onclick={() => onShiftAllLines(1)} class="text-xs">
							1s →
						</Button>
					</div>
					<div class="flex items-center gap-2">
						<input
							type="number"
							step="0.1"
							class="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none"
							placeholder="Custom seconds"
							onkeydown={handleShiftInputKeydown}
						/>
						<span class="text-xs text-gray-500">⏎</span>
					</div>
				</div>
			{/if}
		</div>

		<!-- Speaker Manager -->
		<div class="bg-white rounded-lg border border-gray-200 shadow-lg">
			<SpeakerManager {speakers} {onSpeakersChange} {onAddSpeaker} />
		</div>
	</div>
</div>
