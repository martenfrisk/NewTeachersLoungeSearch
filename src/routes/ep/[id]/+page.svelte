<script lang="ts">
	import type { PageData } from './$types';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import TranscriptQualityBanner from '$lib/components/episode/TranscriptQualityBanner.svelte';
	import EpisodeHeader from '$lib/components/episode/EpisodeHeader.svelte';
	import EpisodeSearch from '$lib/components/episode/EpisodeSearch.svelte';
	import VirtualTranscriptList from '$lib/components/episode/VirtualTranscriptList.svelte';
	import type { EpisodePageData } from '$lib/types/episode';
	import TranscriptLine from '$lib/components/episode/TranscriptLine.svelte';
	import AudioPlayer from '$lib/components/audio/AudioPlayer.svelte';
	import { audioStore } from '$lib/stores/audio';
	import { audioService } from '$lib/services/AudioService';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	// Ensure we have the correct data structure
	const episodeData = data as EpisodePageData;
	const { hits, transcriptStats, episodeInfo } = episodeData;
	const transcript = hits.default;

	let highlightedTime = $state<string | undefined>(undefined);
	let virtualListRef = $state<VirtualTranscriptList>();
	let isLoading = $state(false);
	let error = $state<string | null>(null);

	const audioState = $derived($audioStore);

	const targetHash = $derived(page.url?.hash?.slice(1) || undefined);

	// Enhanced error boundaries
	onMount(() => {
		try {
			if (!transcript || !Array.isArray(transcript)) {
				throw new Error('Invalid transcript data');
			}
			if (transcript.length === 0) {
				console.warn('Empty transcript for episode');
			}
		} catch (err) {
			console.error('Episode page initialization error:', err);
			error = err instanceof Error ? err.message : 'Failed to load episode';
		}
	});

	// Handle hash-based navigation
	$effect(() => {
		if (targetHash && virtualListRef) {
			const timeString = targetHash.replace('t-', '').replace(/(\d{2})(\d{2})(\d{2})/, '$1:$2:$3');
			virtualListRef.scrollToTime(timeString);
		}
	});

	// Handle search results navigation
	function handleSearchNavigation(time: string) {
		highlightedTime = time;
		if (virtualListRef) {
			virtualListRef.scrollToTime(time);
		}
	}

	// Handle audio playback
	async function handlePlayEpisode() {
		if (!episodeInfo?.title) {
			console.warn('No episode title available for audio playback');
			return;
		}

		try {
			await audioService.playTimestamp({
				episode: episodeInfo.title,
				timestamp: '0:00:00'
			});
		} catch (error) {
			console.error('Failed to start episode playback:', error);
		}
	}
</script>

<svelte:head>
	<title>
		Episode transcript for "{episodeInfo?.title}" ({episodeInfo?.ep}) - Seekers' Lounge ☕ The
		Teachers' Lounge Search Engine - seekerslounge.pcast.site
	</title>
</svelte:head>

<div class="mt-4 max-w-4xl px-2 mx-auto overflow-x-hidden">
	{#if error}
		<div class="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-4">
			<h3 class="font-medium">Error loading episode</h3>
			<p class="text-sm mt-1">{error}</p>
		</div>
	{:else if isLoading}
		<div class="flex items-center justify-center py-12">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
			<span class="ml-3 text-gray-600">Loading transcript...</span>
		</div>
	{:else}
		<header class="mb-8">
			<TranscriptQualityBanner {transcriptStats} />
			<EpisodeHeader {episodeInfo} {handlePlayEpisode} />
		</header>

		<EpisodeSearch
			transcriptLines={transcript}
			bind:highlightedTime
			onNavigateToResult={handleSearchNavigation}
		/>

		<main class="mt-6">
			<!-- Regular rendering for all transcripts -->
			<div class="space-y-3">
				{#each transcript as hit (hit.id || hit.time)}
					<TranscriptLine
						{hit}
						isActive={targetHash === `t-${hit.time.replaceAll(':', '')}`}
						isHighlighted={highlightedTime === hit.time}
					/>
				{/each}
			</div>
		</main>
	{/if}
</div>

<!-- Audio Player - Show when audio is available -->
{#if audioState.currentTimestamp}
	<AudioPlayer currEpTitle={episodeInfo?.title || ''} />
{/if}
