<script lang="ts">
	import SeasonSection from '$lib/components/episode/SeasonSection.svelte';
	import EpisodeCard from '$lib/components/episode/EpisodeCard.svelte';
	import SeasonNavigation from '$lib/components/episode/SeasonNavigation.svelte';
	import EpisodeStats from '$lib/components/episode/EpisodeStats.svelte';
	import EpisodeSearch from '$lib/components/search/EpisodeSearch.svelte';
	import SeasonScrollTracker from '$lib/components/episode/SeasonScrollTracker.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	// This route is fully prerendered (see +page.ts), so `data` is static
	// build-time output and genuinely never changes after initial load.
	// svelte-ignore state_referenced_locally
	let { episodes, seasonsData, navigationSeasons } = data;

	let showStats = $state(true);
	let hasSearchQuery = $state(false);
	let highlightedSeasonId = $state<string | null>(null);

	const handleSearchChange = (hasQuery: boolean) => {
		hasSearchQuery = hasQuery;
	};

	// Briefly highlight the season section a nav button scrolled to, so it's
	// clear where the page landed - mirrors the transcript line highlight on
	// /ep/[id] for hash-anchor and search navigation.
	const handleSeasonNavigate = (seasonId: string) => {
		highlightedSeasonId = seasonId;
		setTimeout(() => {
			if (highlightedSeasonId === seasonId) highlightedSeasonId = null;
		}, 1500);
	};
</script>

<svelte:head>
	<title>Episode Guide | Seekers' Lounge ☕ Teachers' Lounge Search</title>
	<meta
		name="description"
		content="Complete episode guide for The Teachers' Lounge podcast. Browse episodes by season, search transcripts, and discover your next favorite episode."
	/>

	<!-- Open Graph Tags -->
	<meta property="og:title" content="Episode Guide | Seekers' Lounge" />
	<meta
		property="og:description"
		content="Complete episode guide for The Teachers' Lounge podcast. Browse episodes by season, search transcripts, and discover your next favorite episode."
	/>
	<meta property="og:url" content="https://seekerslounge.pcast.site/episodes" />
	<meta property="og:image" content="https://seekerslounge.pcast.site/og-episodes.png" />

	<!-- Twitter Card Tags -->
	<meta name="twitter:title" content="Episode Guide | Seekers' Lounge" />
	<meta
		name="twitter:description"
		content="Complete episode guide for The Teachers' Lounge podcast. Browse episodes by season, search transcripts, and discover your next favorite episode."
	/>
	<meta name="twitter:image" content="https://seekerslounge.pcast.site/og-episodes.png" />

	<!-- Canonical URL -->
	<link rel="canonical" href="https://seekerslounge.pcast.site/episodes" />
</svelte:head>

<div class="min-h-screen">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-1 pb-3 md:py-4">
		<h1 class="text-xl text-center mb-3 md:mb-6 font-bold text-ink sm:text-3xl">
			Teachers' Lounge Episode Guide
		</h1>

		<EpisodeSearch {episodes} onSearchChange={handleSearchChange} />
	</div>

	{#if !hasSearchQuery}
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<SeasonNavigation
				seasons={navigationSeasons}
				sticky={true}
				onSeasonNavigate={handleSeasonNavigate}
			/>

			<div class="py-4 md:py-6">
				<div class="space-y-4">
					{#each seasonsData as season (season.id)}
						<SeasonSection
							{season}
							isExpanded={false}
							isHighlighted={highlightedSeasonId === season.id}
							id="season-{season.id}"
						>
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

				<!-- Reference material, not navigation - lives below the episodes -->
				{#if showStats}
					<div class="mt-8">
						<EpisodeStats {episodes} />
					</div>
				{/if}
			</div>
		</div>

		<SeasonScrollTracker seasons={seasonsData} />
	{/if}
</div>
