<script lang="ts">
	import type { Episode, SeasonData } from '$lib/types/episode';
	import { getSeasonDisplayName as getCentralSeasonDisplayName } from '$lib/constants';

	interface Props {
		season: SeasonData;
		isExpanded?: boolean;
		showStats?: boolean;
		isHighlighted?: boolean;
		id?: string;
		children?: import('svelte').Snippet<[Episode[]]>;
	}

	let {
		season,
		isExpanded = false,
		showStats = true,
		isHighlighted = false,
		id,
		children
	}: Props = $props();

	// Seed local toggle state from the initial prop once, then let it diverge -
	// Expand All/Collapse All (SeasonNavigation) toggle sections via simulated
	// clicks, not by changing this prop, so it isn't meant to stay in sync.
	// svelte-ignore state_referenced_locally
	let expanded = $state(isExpanded);
	let sectionElement: HTMLElement | undefined = $state();

	const toggleExpanded = () => {
		expanded = !expanded;
	};

	// Auto-expand when a nav jump highlights this section - scrolling the
	// user to a collapsed box would leave them staring at a closed header.
	$effect(() => {
		if (isHighlighted) expanded = true;
	});

	const episodeCount = $derived(season.episodes.length);

	const getSeasonDisplayName = (id: string): string => getCentralSeasonDisplayName(id, season.name);

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
	class="mb-4 overflow-hidden rounded-xl bg-surface shadow-card transition-shadow duration-200 hover:shadow-card-hover {isHighlighted
		? 'ring-2 ring-blue-400 ring-offset-2'
		: ''}"
	{id}
>
	<header
		class="cursor-pointer select-none px-4 py-3 transition-colors duration-150 hover:bg-gray-50"
		onclick={toggleExpanded}
		role="button"
		tabindex="0"
		aria-expanded={expanded}
		onkeydown={(e) => (e.key === 'Enter' || e.key === ' ' ? toggleExpanded() : null)}
	>
		<!-- Title row: only the (short) title competes with the meta cluster;
		     the description gets the full card width below. -->
		<div class="flex items-center gap-3">
			<div class="shrink-0 transition-transform duration-200 {expanded ? 'rotate-90' : 'rotate-0'}">
				<svg class="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"
					></path>
				</svg>
			</div>

			<h2 class="min-w-0 flex-1 text-lg font-bold leading-snug text-ink">
				{getSeasonDisplayName(season.id)}
			</h2>

			{#if showStats}
				<div class="flex shrink-0 items-center gap-3 text-xs text-ink-muted">
					<span class="hidden font-mono sm:inline">{formatDateRange(season.episodes)}</span>

					{#if season.averageRating}
						<span class="flex items-center gap-0.5">
							<svg class="h-3.5 w-3.5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
								<path
									d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
								/>
							</svg>
							{season.averageRating.toFixed(1)}
						</span>
					{/if}

					<span
						class="rounded-full bg-blue-50 px-2 py-0.5 font-mono text-xs font-semibold text-blue-700"
					>
						{episodeCount} ep{episodeCount !== 1 ? 's' : ''}
					</span>
				</div>
			{/if}
		</div>

		{#if season.description || showStats}
			<div class="mt-0.5 pl-8">
				{#if season.description}
					<p class="text-sm text-ink-muted">
						{season.description}
						<span class="font-mono text-xs sm:hidden">· {formatDateRange(season.episodes)}</span>
					</p>
				{:else if showStats}
					<p class="font-mono text-xs text-ink-muted sm:hidden">
						{formatDateRange(season.episodes)}
					</p>
				{/if}
			</div>
		{/if}

		{#if season.hostNotes}
			<div class="mt-2 border-l-3 border-gray-300 pl-3 text-sm italic text-ink-muted">
				"{season.hostNotes}"
			</div>
		{/if}
	</header>

	{#if expanded}
		<div class="border-t border-gray-200">
			{#if children}
				{@render children(season.episodes)}
			{:else}
				<div class="p-4 text-gray-500 text-center">No episodes to display</div>
			{/if}
		</div>
	{/if}
</section>
