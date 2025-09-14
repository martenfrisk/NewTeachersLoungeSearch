<script lang="ts">
	import type { SearchHitType } from '../../types/search';
	import { epName } from '../../utils';
	import Tooltip from '../Tooltip.svelte';
	import Icon from '../ui/Icon.svelte';

	interface Props {
		hit: SearchHitType;
	}

	let { hit }: Props = $props();

	const hitEpisode = $derived(epName(hit.episode.replace('.json', '')));
	// Format speaker name to handle numeric/unidentified speakers
	function formatSpeaker(speaker: string): string {
		// Check if speaker is just a number or starts with 'spk_'
		if (/^\d+$/.test(speaker) || /^spk_\d+$/.test(speaker)) {
			return 'Unknown Speaker';
		}
		return speaker;
	}
</script>

<!-- Speaker and Time -->
<div class="flex px-3 py-2 text-xs justify-between items-center">
	<span class="text-gray-600">{formatSpeaker(hit.speaker)}</span>
	<div class="flex items-center gap-2">
		<span class="text-gray-500">{hit.time}</span>
		<!-- Edited Status -->
		{#if hit.edited}
			<Tooltip side="left">
				{#snippet tooltip()}
					Edited
				{/snippet}
				{#snippet content()}
					<Icon name="check-badge" class="text-green-600 w-4 h-4" />
				{/snippet}
			</Tooltip>
		{:else}
			<Tooltip side="left">
				{#snippet tooltip()}
					Not edited
				{/snippet}
				{#snippet content()}
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="w-4 h-4 text-gray-500"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
				{/snippet}
			</Tooltip>
		{/if}
	</div>
</div>
<div class="px-3 flex gap-2 items-center py-2 bg-gray-50/80 text-xs text-gray-700 font-medium">
	<a
		class="px-1 py-0.5 text-xs text-blue-700 bg-blue-50 uppercase tracking-wide z-10"
		href="/ep/{hit.episode.replace('.json', '')}"
		aria-label="Go to episode {hit.episode.replace('.json', '')}"
	>
		{hit.episode.replace('.json', '')}
	</a>
	<span>
		{hitEpisode?.title || 'Unknown Episode'}
	</span>
</div>
