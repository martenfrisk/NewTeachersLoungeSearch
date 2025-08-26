<script lang="ts">
	import type { PageData } from './$types';
	import { page } from '$app/state';
	import TranscriptQualityBanner from '$lib/components/episode/TranscriptQualityBanner.svelte';
	import EpisodeHeader from '$lib/components/episode/EpisodeHeader.svelte';
	import SearchInstructions from '$lib/components/episode/SearchInstructions.svelte';
	import TranscriptLine from '$lib/components/episode/TranscriptLine.svelte';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const { hits, transcriptStats, episodeInfo } = data;
	const epScript = hits.default;

	const targetHash = $derived(page.url?.hash?.slice(1));

	const hitIsActive = (timeString: string) => {
		if (!targetHash) return false;
		const expectedId = `t-${timeString.replaceAll(':', '')}`;
		return expectedId === targetHash;
	};
</script>

<svelte:head>
	<title>
		Episode transcript for "{episodeInfo?.title}" ({episodeInfo?.ep}) - Seekers' Lounge ☕ The
		Teachers' Lounge Search Engine - seekerslounge.pcast.site
	</title>
</svelte:head>

<div class="mt-4 max-w-4xl mx-auto">
	<header class="mb-8">
		<TranscriptQualityBanner {transcriptStats} />
		<EpisodeHeader {episodeInfo} />
		<SearchInstructions />
	</header>

	<main class="space-y-3">
		{#each epScript as hit (hit.id || hit.time)}
			<TranscriptLine {hit} isActive={hitIsActive(hit.time)} />
		{/each}
	</main>
</div>
