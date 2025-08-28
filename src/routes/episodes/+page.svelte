<script lang="ts">
	import SeasonSection from '$lib/components/episode/SeasonSection.svelte';
	import EpisodeCard from '$lib/components/episode/EpisodeCard.svelte';
	import SeasonNavigation from '$lib/components/episode/SeasonNavigation.svelte';
	import EpisodeStats from '$lib/components/episode/EpisodeStats.svelte';
	import EpisodeSearch from '$lib/components/search/EpisodeSearch.svelte';
	import SeasonScrollTracker from '$lib/components/episode/SeasonScrollTracker.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let { episodes, seasonsData, navigationSeasons } = data;

	let showStats = $state(true);
	let hasSearchQuery = $state(false);

	const handleSearchChange = (hasQuery: boolean) => {
		hasSearchQuery = hasQuery;
	};
</script>

<svelte:head>
	<title>Episode Guide - Seekers' Lounge ☕ The Teachers' Lounge Search Engine</title>
	<meta
		name="description"
		content="Complete episode guide for The Teachers' Lounge podcast. Browse episodes by season, search transcripts, and discover your next favorite episode."
	/>
</svelte:head>

<div class="min-h-screen">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		<h1 class="text-3xl text-center font-bold text-gray-900 sm:text-4xl">
			Teachers' Lounge Episode Guide
		</h1>

		<EpisodeSearch {episodes} onSearchChange={handleSearchChange} />
	</div>

	{#if !hasSearchQuery}
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<SeasonNavigation seasons={navigationSeasons} sticky={true} />

			<div class="py-6">
				{#if showStats}
					<div class="mb-8">
						<EpisodeStats {episodes} />
					</div>
				{/if}

				<div class="space-y-6">
					{#each seasonsData as season (season.id)}
						<SeasonSection {season} isExpanded={false} id="season-{season.id}">
							{#snippet children(episodes)}
								<div class="p-4 grid grid-cols-1 lg:grid-cols-2 gap-4 mobile-single-col">
									{#each episodes as episode (episode.ep)}
										<EpisodeCard {episode} compact={episodes.length > 10} />
									{/each}
								</div>
							{/snippet}
						</SeasonSection>
					{/each}
				</div>
			</div>
		</div>

		<SeasonScrollTracker seasons={seasonsData} />
	{/if}
</div>
