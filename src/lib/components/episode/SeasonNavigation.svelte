<script lang="ts">
	import type { Season } from '$lib/types/episode';

	interface Props {
		seasons: Season[];
		selectedSeason?: string;
		onSeasonSelect?: (seasonId: string) => void;
		showEpisodeCounts?: boolean;
		sticky?: boolean;
		class?: string;
	}

	let {
		seasons,
		selectedSeason = '',
		onSeasonSelect,
		showEpisodeCounts = true,
		sticky = false,
		class: className = ''
	}: Props = $props();

	let showMobileNav = $state(false);

	const getSeasonDisplayName = (id: string): string => {
		const seasonMap: Record<string, string> = {
			s01: 'S1',
			s02: 'S2',
			s03: 'S3',
			s04: 'S4',
			s05: 'S5',
			s06: 'S6',
			s07: 'S7',
			s08: 'S8',
			s09: 'S9',
			s10: 'S10',
			s11: 'S11',
			mini: 'Minis',
			exit42: 'Exit 42',
			Peecast: 'Peecast',
			holidays: 'Holidays',
			jesus: 'Jesus',
			lastresort: 'Last Resort'
		};
		return seasonMap[id] || id;
	};

	const scrollToSeason = (seasonId: string) => {
		const element = document.getElementById(`season-${seasonId}`);
		if (element) {
			element.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}
	};

	const handleSeasonClick = (seasonId: string) => {
		// Only scroll to season, don't filter
		if (seasonId !== '') {
			setTimeout(() => scrollToSeason(seasonId), 100);
		} else {
			// Scroll to top for "Show All"
			window.scrollTo({ top: 0, behavior: 'smooth' });
		}
	};

	const handleShowAll = () => {
		handleSeasonClick('');
	};

	const handleKeydown = (event: KeyboardEvent, seasonId: string) => {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			handleSeasonClick(seasonId);
		}
	};

	const totalEpisodes = $derived(seasons.reduce((sum, season) => sum + season.episodeCount, 0));
</script>

<nav
	class="bg-white border-b border-gray-200 {sticky
		? 'sticky top-0 z-10 shadow-sm'
		: ''} {className}"
	aria-label="Season navigation"
>
	<div class="px-4 py-3">
		<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-2">
			<h2 class="text-lg font-semibold text-gray-900">Episodes by Season</h2>
			{#if showEpisodeCounts}
				<div class="text-sm text-gray-600">
					{totalEpisodes} total episodes
				</div>
			{/if}
		</div>

		<!-- Mobile: Collapsible dropdown -->
		<div class="sm:hidden">
			<button
				class="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-300 rounded-lg text-left font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
				onclick={() => (showMobileNav = !showMobileNav)}
				aria-expanded={showMobileNav}
			>
				<span class="flex items-center">
					<svg class="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4 6h16M4 10h16M4 14h16M4 18h16"
						/>
					</svg>
					Jump to Season
				</span>
				<svg
					class="w-5 h-5 transform transition-transform {showMobileNav ? 'rotate-180' : ''}"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M19 9l-7 7-7-7"
					/>
				</svg>
			</button>

			{#if showMobileNav}
				<div
					class="mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto"
				>
					<button
						class="flex items-center justify-between w-full px-4 py-3 text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50 text-gray-700"
						onclick={() => {
							handleShowAll();
							showMobileNav = false;
						}}
					>
						<span class="flex items-center">
							<svg class="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M4 6h16M4 10h16M4 14h16M4 18h16"
								/>
							</svg>
							All Seasons
						</span>
						<span class="text-xs px-2 py-1 bg-gray-100 rounded-full text-gray-600"
							>{totalEpisodes}</span
						>
					</button>
					{#each seasons as season (season.id)}
						<button
							class="flex items-center justify-between w-full px-4 py-3 text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50 text-gray-700 border-t border-gray-100"
							onclick={() => {
								handleSeasonClick(season.id);
								showMobileNav = false;
							}}
						>
							<span>{season.name}</span>
							<span class="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full"
								>{season.episodeCount}</span
							>
						</button>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Desktop: Horizontal button layout -->
		<div class="hidden sm:block">
			<div class="flex flex-wrap gap-2 mb-3">
				<button
					class="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
					onclick={handleShowAll}
					onkeydown={(e) => handleKeydown(e, '')}
				>
					<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4 6h16M4 10h16M4 14h16M4 18h16"
						/>
					</svg>
					Show All
					{#if showEpisodeCounts}
						<span class="ml-2 px-2 py-1 text-xs rounded-full bg-gray-200 text-gray-600">
							{totalEpisodes}
						</span>
					{/if}
				</button>
			</div>

			<div class="flex flex-wrap gap-2">
				{#each seasons as season (season.id)}
					<button
						class="inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 whitespace-nowrap {season.isSpecial
							? 'bg-purple-100 text-purple-800 hover:bg-purple-200 focus:ring-purple-500 border border-purple-200'
							: 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-blue-500 border border-gray-200'}"
						onclick={() => handleSeasonClick(season.id)}
						onkeydown={(e) => handleKeydown(e, season.id)}
						aria-label="Jump to {season.name}"
					>
						{getSeasonDisplayName(season.id)}
						{#if showEpisodeCounts}
							<span class="ml-2 px-2 py-1 text-xs rounded-full bg-gray-200 text-gray-600">
								{season.episodeCount}
							</span>
						{/if}
					</button>
				{/each}
			</div>
		</div>

		<div class="mt-3 flex flex-col sm:flex-row gap-2 text-xs">
			<div class="flex flex-wrap gap-2">
				<button
					class="text-blue-600 hover:text-blue-800 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded px-2 py-1 min-h-[32px]"
					onclick={() => {
						seasons.forEach((season) => {
							const element = document.getElementById(`season-${season.id}`);
							const sectionHeader = element?.querySelector('header');
							if (sectionHeader && !element?.querySelector('[aria-expanded="true"]')) {
								sectionHeader.click();
							}
						});
					}}
				>
					Expand All
				</button>

				<button
					class="text-gray-600 hover:text-gray-800 hover:underline focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 rounded px-2 py-1 min-h-[32px]"
					onclick={() => {
						seasons.forEach((season) => {
							const element = document.getElementById(`season-${season.id}`);
							const sectionHeader = element?.querySelector('header');
							if (sectionHeader && element?.querySelector('[aria-expanded="true"]')) {
								sectionHeader.click();
							}
						});
					}}
				>
					Collapse All
				</button>
			</div>
		</div>
	</div>
</nav>
