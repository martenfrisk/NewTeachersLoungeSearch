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
	import ReturnToActiveButton from '$lib/components/audio/ReturnToActiveButton.svelte';
	import { audioStore, currentPlaybackTime, syncEnabled, isPlaying } from '$lib/stores/audio';
	import { audioService } from '$lib/services/AudioService';
	import {
		findCurrentTranscriptLine,
		throttle,
		transcriptTimeToAudioSeconds
	} from '$lib/utils/audioSync';

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
	let showReturnButton = $state(false);
	let currentActiveElement: HTMLElement | null = $state(null);

	const audioState = $derived($audioStore);
	const currentTime = $derived($currentPlaybackTime);
	const syncMode = $derived($syncEnabled);
	const playing = $derived($isPlaying);

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

	// Sync effect - triggers when audio time changes and sync is enabled
	$effect(() => {
		if (syncMode && playing && currentTime) {
			syncToCurrentLine();
		}
	});

	// Setup scroll listener effect
	$effect(() => {
		if (typeof window === 'undefined') return;

		if (syncMode && playing) {
			window.addEventListener('scroll', handleScroll);
			return () => {
				window.removeEventListener('scroll', handleScroll);
			};
		} else {
			showReturnButton = false;
		}
	});

	// Handle search results navigation
	function handleSearchNavigation(time: string) {
		highlightedTime = time;
		if (virtualListRef) {
			virtualListRef.scrollToTime(time);
		}
		// Disable sync when user manually navigates
		if (syncMode) {
			audioStore.setSyncEnabled(false);
		}
	}

	// Throttled sync function to prevent excessive updates
	const syncToCurrentLine = throttle(() => {
		if (!syncMode || !playing || !currentTime || !transcript.length) {
			currentActiveElement = null;
			showReturnButton = false;
			return;
		}

		const currentLine = findCurrentTranscriptLine(transcript, currentTime);
		if (currentLine && currentLine.time !== highlightedTime) {
			highlightedTime = currentLine.time;

			// Get the current line element and track it
			const element = document.getElementById(`t-${currentLine.time.replaceAll(':', '')}`);
			if (element) {
				currentActiveElement = element;

				// Only auto-scroll if the return button isn't being shown
				// (user hasn't manually scrolled away)
				if (!showReturnButton) {
					element.scrollIntoView({
						behavior: 'smooth',
						block: 'center',
						inline: 'nearest'
					});
				}
			}
		}
	}, 1000); // Update at most once per second

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

	// Handle clicking on transcript lines to jump to that timestamp when sync is enabled
	function handleLineClick(time: string) {
		if (syncMode && audioState.currentTimestamp) {
			const audioSeconds = transcriptTimeToAudioSeconds(time, audioState.episodeStartingTime);
			audioService.seek(audioSeconds);
		}
	}

	// Check if the currently active line is visible in the viewport
	function isElementInViewport(element: HTMLElement): boolean {
		const rect = element.getBoundingClientRect();
		const windowHeight = window.innerHeight || document.documentElement.clientHeight;
		const threshold = windowHeight * 0.3; // Element should be within 30% of viewport

		return rect.top >= -threshold && rect.bottom <= windowHeight + threshold;
	}

	// Throttled scroll detection to determine if return button should be shown
	const handleScroll = throttle(() => {
		if (!syncMode || !playing || !currentActiveElement) {
			showReturnButton = false;
			return;
		}

		const isVisible = isElementInViewport(currentActiveElement);
		showReturnButton = !isVisible;
	}, 100);

	// Return to the currently active line
	function returnToActiveLine() {
		if (currentActiveElement) {
			currentActiveElement.scrollIntoView({
				behavior: 'smooth',
				block: 'center',
				inline: 'nearest'
			});
			showReturnButton = false;
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
						syncEnabled={syncMode && !!audioState.currentTimestamp}
						onLineClick={handleLineClick}
					/>
				{/each}
			</div>
		</main>
	{/if}
</div>

<!-- Return to Active Line Button -->
<ReturnToActiveButton visible={showReturnButton} onReturnToActive={returnToActiveLine} />
