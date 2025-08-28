<script lang="ts">
	import type { Episode, SeasonData } from '$lib/types/episode';

	interface Props {
		season: SeasonData;
		isExpanded?: boolean;
		showStats?: boolean;
		id?: string;
		children?: import('svelte').Snippet<[Episode[]]>;
	}

	let { season, isExpanded = false, showStats = true, id, children }: Props = $props();

	let expanded = $state(isExpanded);
	let sectionElement: HTMLElement | undefined = $state();

	const toggleExpanded = () => {
		expanded = !expanded;
	};

	const episodeCount = $derived(season.episodes.length);

	const getSeasonDisplayName = (id: string): string => {
		const seasonMap: Record<string, string> = {
			s01: 'Season 1',
			s02: 'Season 2',
			s03: 'Season 3',
			s04: 'Season 4',
			s05: 'Season 5',
			s06: 'Season 6',
			s07: 'Season 7',
			s08: 'Season 8',
			s09: 'Season 9',
			s10: 'Season 10',
			s11: 'Season 11',
			mini: 'Mini Episodes',
			exit42: 'Exit 42',
			Peecast: 'Peecast',
			holidays: 'Holiday Specials',
			jesus: 'Jesus Chronicles',
			lastresort: 'Last Resort'
		};
		return seasonMap[id] || season.name || id;
	};

	const getSeasonColor = (id: string): string => {
		const colorMap: Record<string, string> = {
			s01: 'bg-blue-50 border-blue-200',
			s02: 'bg-green-50 border-green-200',
			s03: 'bg-purple-50 border-purple-200',
			s04: 'bg-orange-50 border-orange-200',
			s05: 'bg-red-50 border-red-200',
			s06: 'bg-indigo-50 border-indigo-200',
			s07: 'bg-pink-50 border-pink-200',
			s08: 'bg-yellow-50 border-yellow-200',
			s09: 'bg-teal-50 border-teal-200',
			s10: 'bg-cyan-50 border-cyan-200',
			s11: 'bg-emerald-50 border-emerald-200',
			mini: 'bg-gray-50 border-gray-200',
			exit42: 'bg-violet-50 border-violet-200',
			Peecast: 'bg-rose-50 border-rose-200',
			holidays: 'bg-red-100 border-red-300',
			jesus: 'bg-amber-50 border-amber-200',
			lastresort: 'bg-slate-50 border-slate-200'
		};
		return season.color || colorMap[id] || 'bg-gray-50 border-gray-200';
	};

	const formatDateRange = (episodes: Episode[]): string => {
		if (episodes.length === 0) return '';
		const dates = episodes.map((ep) => new Date(ep.date)).sort((a, b) => a.getTime() - b.getTime());
		const start = dates[0];
		const end = dates[dates.length - 1];

		if (start.getFullYear() === end.getFullYear()) {
			return `${start.getFullYear()}`;
		}
		return `${start.getFullYear()} - ${end.getFullYear()}`;
	};
</script>

<section
	bind:this={sectionElement}
	class="mb-6 rounded-lg border-2 {getSeasonColor(
		season.id
	)} overflow-hidden transition-all duration-200 hover:shadow-md"
	{id}
>
	<header
		class="p-4 cursor-pointer select-none transition-colors duration-150 hover:bg-opacity-80"
		onclick={toggleExpanded}
		role="button"
		tabindex="0"
		aria-expanded={expanded}
		onkeydown={(e) => (e.key === 'Enter' || e.key === ' ' ? toggleExpanded() : null)}
	>
		<div class="flex items-center justify-between">
			<div class="flex items-center space-x-3">
				<div
					class="transform transition-transform duration-200 {expanded ? 'rotate-90' : 'rotate-0'}"
				>
					<svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"
						></path>
					</svg>
				</div>

				<div>
					<h2 class="text-xl font-bold text-gray-800">
						{getSeasonDisplayName(season.id)}
					</h2>
					{#if season.description}
						<p class="text-sm text-gray-600 mt-1">{season.description}</p>
					{/if}
				</div>
			</div>

			{#if showStats}
				<div
					class="flex flex-col sm:flex-row items-end sm:items-center space-y-1 sm:space-y-0 sm:space-x-6 text-sm text-gray-600"
				>
					<div class="text-right sm:text-left">
						<span class="font-medium whitespace-nowrap"
							>{episodeCount} ep{episodeCount !== 1 ? 's' : ''}</span
						>
					</div>

					<!-- {#if hasAudioCount > 0}
						<div class="text-right sm:text-left">
							<span class="font-medium">{hasAudioCount} with audio</span>
						</div>
					{/if} -->

					<div class="text-right sm:text-left">
						<span class="text-xs">{formatDateRange(season.episodes)}</span>
					</div>

					{#if season.averageRating}
						<div class="text-right sm:text-left flex items-center">
							<svg class="w-4 h-4 text-yellow-400 mr-1" fill="currentColor" viewBox="0 0 20 20">
								<path
									d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
								/>
							</svg>
							<span class="font-medium">{season.averageRating.toFixed(1)}</span>
						</div>
					{/if}
				</div>
			{/if}
		</div>

		{#if season.hostNotes}
			<div class="mt-2 text-sm text-gray-600 italic border-l-3 border-gray-300 pl-3">
				"{season.hostNotes}"
			</div>
		{/if}
	</header>

	{#if expanded}
		<div class="border-t border-gray-200 bg-white bg-opacity-50 transition-all duration-300">
			{#if children}
				{@render children(season.episodes)}
			{:else}
				<div class="p-4 text-gray-500 text-center">No episodes to display</div>
			{/if}
		</div>
	{/if}
</section>
