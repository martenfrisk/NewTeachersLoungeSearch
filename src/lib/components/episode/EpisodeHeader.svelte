<script lang="ts">
	import Button from '../ui/Button.svelte';
	import EpisodeHistoryBadge from './EpisodeHistoryBadge.svelte';
	import type { EpisodeHistoryStatsType } from '../../types/history';

	interface Props {
		episodeInfo?: {
			ep: string;
			title: string;
			desc?: string;
			date?: string;
		};
		handlePlayEpisode?: () => void;
		historyStats?: EpisodeHistoryStatsType | null;
		onHistoryClick?: () => void;
	}

	let { episodeInfo, handlePlayEpisode, historyStats, onHistoryClick }: Props = $props();

	function formatDate(dateString?: string): string {
		if (!dateString) return '';

		try {
			const date = new Date(dateString);
			return date.toLocaleDateString('en-US', {
				year: 'numeric',
				month: 'long',
				day: 'numeric'
			});
		} catch {
			return dateString;
		}
	}
</script>

<div class="text-center mb-6">
	<div class="flex items-center justify-center gap-3 mb-2">
		<div class="text-sm font-semibold text-blue-600 uppercase tracking-wide">
			{episodeInfo?.ep}
		</div>
		{#if historyStats}
			<EpisodeHistoryBadge stats={historyStats} onClick={onHistoryClick} />
		{/if}
	</div>
	<h1 class="text-2xl md:text-3xl font-bold text-gray-900 mb-4">{episodeInfo?.title}</h1>

	{#if episodeInfo?.date}
		<div class="text-sm text-gray-500 mb-4">
			Originally aired: {formatDate(episodeInfo.date)}
		</div>
	{/if}

	{#if handlePlayEpisode}
		<div class="mb-4">
			<Button variant="primary" onclick={handlePlayEpisode}>
				<svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
					<path
						fill-rule="evenodd"
						d="M6.267 3.455a1 1 0 011.523-.859l8.485 5.545a1 1 0 010 1.708l-8.485 5.545a1 1 0 01-1.523-.859V3.455z"
						clip-rule="evenodd"
					/>
				</svg>
				Play Episode
			</Button>
		</div>
	{/if}

	{#if episodeInfo?.desc}
		<p class="text-gray-600 leading-relaxed max-w-2xl mx-auto">{episodeInfo?.desc}</p>
	{/if}
</div>
