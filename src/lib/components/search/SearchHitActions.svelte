<script lang="ts">
	import type { SearchHitType } from '../../types/search';
	import { audioService } from '../../services/AudioService';
	import { epName } from '../../utils';
	import Tooltip from '../Tooltip.svelte';

	interface Props {
		hit: SearchHitType;
		showContext: boolean;
		loadingContext: boolean;
		onToggleContext: () => void;
	}

	let { hit, showContext, loadingContext, onToggleContext }: Props = $props();

	const hitEpisode = $derived(epName(hit.episode.replace('.json', '')));

	async function handlePlayAudio() {
		if (hitEpisode?.feedTitle) {
			await audioService.playTimestamp({
				timestamp: hit.time,
				episode: hitEpisode.feedTitle
			});
			audioService.play();
		}
	}
</script>

<!-- Compact Footer -->
<div class="pb-3 px-3 pt-2 border-t border-gray-100 flex justify-between items-center">
	<!-- Actions -->
	<div class="flex items-center gap-2">
		<!-- Transcript Link -->
		<Tooltip>
			{#snippet tooltip()}
				Go to transcript
			{/snippet}
			{#snippet content()}
				<a
					href="/ep/{hitEpisode?.ep}#t-{hit.time.replaceAll(':', '')}"
					class="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
				>
					<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
						/>
					</svg>
					<span>Episode</span>
				</a>
			{/snippet}
		</Tooltip>

		<!-- Audio Play Button -->
		{#if hitEpisode?.hasAudio}
			<button
				class="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-green-600 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 transition-colors"
				onclick={handlePlayAudio}
			>
				<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
					<path d="M8 5v14l11-7z" />
				</svg>
				<span class="hidden sm:inline">Listen</span>
				<span class="sm:hidden">Play</span>
			</button>
		{/if}
	</div>

	<!-- Context Toggle Button -->
	<button
		onclick={onToggleContext}
		disabled={loadingContext}
		class="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
		aria-label="{showContext ? 'Hide' : 'Show'} context"
	>
		{#if loadingContext}
			<div
				class="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin"
			></div>
			Loading...
		{:else}
			<svg
				class="w-3 h-3 transition-transform {showContext ? 'rotate-180' : ''}"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
			</svg>
			{showContext ? 'Hide' : 'Show'} context
		{/if}
	</button>
</div>
