<script lang="ts">
	import type { SpeakerType } from '$lib/types/editor';
	import SpeakerManager from './SpeakerManager.svelte';
	import Button from '../ui/Button.svelte';

	interface Props {
		selectedEpisode: string | null;
		speakers: SpeakerType[];
		controlsCollapsed: boolean;
		shiftControlsCollapsed: boolean;
		onToggleControls: () => void;
		onToggleShiftControls: () => void;
		onEpisodeSelect: (episodeId: string) => void;
		onSpeakersChange: (speakers: SpeakerType[]) => void;
		onAddSpeaker: (name: string) => void;
		onShiftAllLines: (shiftSeconds: number) => void;
	}

	let {
		selectedEpisode,
		speakers,
		controlsCollapsed,
		shiftControlsCollapsed,
		onToggleControls,
		onToggleShiftControls,
		onEpisodeSelect,
		onSpeakersChange,
		onAddSpeaker,
		onShiftAllLines
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

<!-- Floating Controls Panel - Hidden on smaller screens -->
<div
	class="hidden lg:block fixed top-20 right-4 z-50 w-80 max-h-[calc(100vh-6rem)] overflow-y-auto"
>
	<!-- Collapse Toggle Button -->
	<button
		onclick={onToggleControls}
		class="absolute -left-10 top-4 bg-white border border-gray-200 rounded-l-lg p-2 shadow-lg hover:bg-gray-50 transition-colors"
		aria-label={controlsCollapsed ? 'Expand controls' : 'Collapse controls'}
	>
		<svg
			class={`w-4 h-4 text-gray-600 transition-transform ${controlsCollapsed ? 'rotate-180' : ''}`}
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
		>
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
		</svg>
	</button>

	{#if !controlsCollapsed}
		<div class="space-y-4">
			<!-- Episode info -->
			<div class="bg-white rounded-lg border border-gray-200 shadow-lg p-4">
				<h3 class="font-medium text-gray-900 mb-2">Current Episode</h3>
				<p class="text-sm text-gray-600 mb-2">{selectedEpisode}</p>
				<Button variant="outline" size="sm" onclick={() => onEpisodeSelect('')}>
					Change Episode
				</Button>
			</div>

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
							<Button
								variant="outline"
								size="sm"
								onclick={() => onShiftAllLines(-5)}
								class="text-xs"
							>
								← 5s
							</Button>
							<Button
								variant="outline"
								size="sm"
								onclick={() => onShiftAllLines(5)}
								class="text-xs"
							>
								5s →
							</Button>
							<Button
								variant="outline"
								size="sm"
								onclick={() => onShiftAllLines(-1)}
								class="text-xs"
							>
								← 1s
							</Button>
							<Button
								variant="outline"
								size="sm"
								onclick={() => onShiftAllLines(1)}
								class="text-xs"
							>
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
	{/if}
</div>
