<script lang="ts">
	import { resolve } from '$app/paths';
	import type { EpisodeNavLink } from '$lib/types/episode';

	interface Props {
		prevEpisode?: EpisodeNavLink;
		nextEpisode?: EpisodeNavLink;
		seasonName?: string;
		seasonEpisodes?: EpisodeNavLink[];
	}

	let { prevEpisode, nextEpisode, seasonName, seasonEpisodes = [] }: Props = $props();

	const epHref = (ep: string) => resolve('/ep/[id]', { id: ep });
</script>

{#if prevEpisode || nextEpisode}
	<div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
		{#if prevEpisode}
			<a
				href={epHref(prevEpisode.ep)}
				class="group rounded-xl bg-surface p-3 shadow-card transition-all hover:shadow-card-hover"
			>
				<div class="flex items-center gap-1.5 text-xs font-medium text-ink-muted">
					<svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M15 19l-7-7 7-7"
						/>
					</svg>
					Previous
					<span class="font-mono uppercase">{prevEpisode.ep}</span>
				</div>
				<p class="mt-1 truncate text-sm font-semibold text-ink group-hover:text-blue-700">
					{prevEpisode.title}
				</p>
			</a>
		{:else}
			<div></div>
		{/if}

		{#if nextEpisode}
			<a
				href={epHref(nextEpisode.ep)}
				class="group rounded-xl bg-surface p-3 text-right shadow-card transition-all hover:shadow-card-hover"
			>
				<div class="flex items-center justify-end gap-1.5 text-xs font-medium text-ink-muted">
					<span class="font-mono uppercase">{nextEpisode.ep}</span>
					Next
					<svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 5l7 7-7 7"
						/>
					</svg>
				</div>
				<p class="mt-1 truncate text-sm font-semibold text-ink group-hover:text-blue-700">
					{nextEpisode.title}
				</p>
			</a>
		{/if}
	</div>
{/if}

{#if seasonEpisodes.length > 0 && seasonName}
	<div class="mt-4">
		<h2 class="mb-2 text-xs font-semibold tracking-wide text-ink-muted uppercase">
			More from {seasonName}
		</h2>
		<div class="scrollbar-thin flex gap-2 overflow-x-auto pb-1">
			{#each seasonEpisodes as ep (ep.ep)}
				<a
					href={epHref(ep.ep)}
					class="flex shrink-0 items-center gap-2 rounded-xl bg-surface px-3 py-2 text-sm shadow-card transition-colors hover:bg-surface-hover"
				>
					<span class="font-mono text-xs font-semibold text-blue-700 uppercase">{ep.ep}</span>
					<span class="max-w-48 truncate text-ink-muted">{ep.title}</span>
				</a>
			{/each}
		</div>
	</div>
{/if}
