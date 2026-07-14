<script lang="ts">
	import { fade } from 'svelte/transition';
	import Icon from '../ui/Icon.svelte';
	import EpisodeHistoryBadge from './EpisodeHistoryBadge.svelte';
	import type { EpisodeHistoryStatsType } from '../../types/history';

	interface TranscriptStats {
		isFullyEdited: boolean;
		isMostlyEdited: boolean;
		editedLines: number;
		totalLines: number;
		editedPercentage: number;
	}

	interface Props {
		episodeInfo?: {
			ep: string;
			title: string;
			desc?: string;
			date?: string;
		};
		transcriptStats?: TranscriptStats;
		handlePlayEpisode?: () => void;
		// Streamed from the load function rather than awaited, so this small
		// badge doesn't block the rest of the page from rendering.
		historyStats?: Promise<EpisodeHistoryStatsType | null>;
		onHistoryClick?: () => void;
	}

	let { episodeInfo, transcriptStats, handlePlayEpisode, historyStats, onHistoryClick }: Props =
		$props();

	function formatDate(dateString?: string): string {
		if (!dateString) return '';
		try {
			return new Date(dateString).toLocaleDateString('en-US', {
				year: 'numeric',
				month: 'short',
				day: 'numeric'
			});
		} catch {
			return dateString;
		}
	}
</script>

<!-- Letterhead: reads like the masthead of a filed transcript -->
<header class="border-b border-gray-200 px-4 pt-3 pb-5 sm:px-6 sm:pt-4 sm:pb-6">
	<div class="min-w-0">
		<div class="mb-1 flex items-center gap-2">
			<span class="font-mono text-xs font-semibold tracking-wider text-blue-700 uppercase">
				{episodeInfo?.ep}
			</span>
			{#if historyStats}
				{#await historyStats then resolvedStats}
					{#if resolvedStats}
						<span transition:fade={{ duration: 200 }}>
							<EpisodeHistoryBadge stats={resolvedStats} onClick={onHistoryClick} />
						</span>
					{/if}
				{/await}
			{/if}
		</div>

		<h1 class="text-2xl leading-tight font-bold text-ink sm:text-3xl">
			{episodeInfo?.title}
		</h1>
	</div>

	<!-- Colophon: the record's provenance, one quiet mono line -->
	<p class="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs text-ink-muted">
		{#if episodeInfo?.date}
			<span>Aired {formatDate(episodeInfo.date)}</span>
			<span aria-hidden="true" class="text-gray-300">·</span>
		{/if}
		{#if transcriptStats}
			<span>{transcriptStats.totalLines.toLocaleString()} lines</span>
			<span aria-hidden="true" class="text-gray-300">·</span>
			{#if transcriptStats.isFullyEdited}
				<span
					class="inline-flex items-center gap-1 text-green-700"
					title="Reviewed and corrected for accuracy"
				>
					<Icon name="check-badge" size={13} aria-hidden={true} />
					Reviewed
				</span>
			{:else if transcriptStats.isMostlyEdited}
				<span
					class="text-amber-700"
					title="{transcriptStats.editedPercentage}% of lines reviewed for accuracy"
				>
					{transcriptStats.editedPercentage}% reviewed
				</span>
			{:else}
				<span class="text-ink-muted" title="Auto-transcribed, may contain errors">
					Auto-transcribed
				</span>
			{/if}
		{/if}
	</p>

	{#if episodeInfo?.desc}
		<p class="mt-3 max-w-2xl text-sm leading-relaxed text-ink-muted">
			{episodeInfo.desc}
		</p>
	{/if}

	{#if handlePlayEpisode}
		<!-- The page's primary action sits under the episode's details, full
		     reading-flow position instead of floating beside a wrapping title. -->
		<button
			onclick={handlePlayEpisode}
			class="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-blue-700 hover:shadow focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:outline-none"
		>
			<Icon name="play" size={16} aria-hidden={true} />
			Play episode
		</button>
	{/if}
</header>
