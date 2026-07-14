<script lang="ts">
	import type { Season } from '$lib/types/episode';
	import { getSeasonShortName } from '$lib/constants';

	interface Props {
		seasons: Season[];
		showEpisodeCounts?: boolean;
		sticky?: boolean;
		class?: string;
		onSeasonNavigate?: (seasonId: string) => void;
	}

	let {
		seasons,
		showEpisodeCounts = true,
		sticky = false,
		class: className = '',
		onSeasonNavigate
	}: Props = $props();

	let navEl = $state<HTMLElement>();

	// scrollIntoView({block: 'start'}) puts the target flush with the top of
	// the viewport, but the site header and (when sticky) this nav itself
	// stay pinned there too, so the target ends up hidden behind them. Scroll
	// to an explicit position that clears both, measured live since their
	// heights differ between mobile and desktop layouts.
	const scrollToSeason = (seasonId: string) => {
		const element = document.getElementById(`season-${seasonId}`);
		if (!element) return;

		const header = document.querySelector('header');
		const stickyBottom = Math.max(
			header?.getBoundingClientRect().bottom ?? 0,
			navEl?.getBoundingClientRect().bottom ?? 0
		);
		const targetTop = element.getBoundingClientRect().top + window.scrollY - stickyBottom - 16;
		window.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
		onSeasonNavigate?.(seasonId);
	};

	const handleSeasonClick = (seasonId: string) => {
		if (seasonId !== '') {
			setTimeout(() => scrollToSeason(seasonId), 100);
		} else {
			window.scrollTo({ top: 0, behavior: 'smooth' });
		}
	};

	const setAllExpanded = (expand: boolean) => {
		seasons.forEach((season) => {
			const element = document.getElementById(`season-${season.id}`);
			const sectionHeader = element?.querySelector('header');
			const isExpanded = !!element?.querySelector('[aria-expanded="true"]');
			if (sectionHeader && isExpanded !== expand) {
				sectionHeader.click();
			}
		});
	};

	const totalEpisodes = $derived(seasons.reduce((sum, season) => sum + season.episodeCount, 0));
</script>

<!-- One compact strip: horizontally scrollable chips on mobile, wrapping on
     desktop. Sticks below the site header (h-16) so it stays reachable while
     scrolling long season lists. -->
<nav
	bind:this={navEl}
	class="border-b border-gray-200 bg-surface {sticky
		? 'sticky top-16 z-10 shadow-sm'
		: ''} {className}"
	aria-label="Season navigation"
>
	<div class="py-2">
		<div
			class="scrollbar-thin flex items-center gap-1.5 overflow-x-auto px-4 pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0"
		>
			<button
				class="shrink-0 rounded-full bg-blue-700 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
				onclick={() => handleSeasonClick('')}
				aria-label="Scroll to top, all seasons"
			>
				All
				{#if showEpisodeCounts}
					<span class="ml-1 font-mono text-[10px] opacity-75">{totalEpisodes}</span>
				{/if}
			</button>

			{#each seasons as season (season.id)}
				<button
					class="shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 {season.isSpecial
						? 'border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100'
						: 'border-gray-300 bg-surface text-gray-700 hover:bg-surface-hover'}"
					onclick={() => handleSeasonClick(season.id)}
					aria-label="Jump to {season.name}"
				>
					{getSeasonShortName(season.id)}
					{#if showEpisodeCounts}
						<span class="ml-1 font-mono text-[10px] text-ink-muted">{season.episodeCount}</span>
					{/if}
				</button>
			{/each}
		</div>

		<div class="mt-1 flex gap-4 px-4 text-xs">
			<button
				class="rounded px-1 py-0.5 text-blue-700 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500"
				onclick={() => setAllExpanded(true)}
			>
				Expand all
			</button>
			<button
				class="rounded px-1 py-0.5 text-ink-muted hover:underline focus:outline-none focus:ring-2 focus:ring-gray-500"
				onclick={() => setAllExpanded(false)}
			>
				Collapse all
			</button>
		</div>
	</div>
</nav>
