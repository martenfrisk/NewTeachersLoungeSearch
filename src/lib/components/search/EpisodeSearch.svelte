<script lang="ts">
	import Fuse, { type FuseResult } from 'fuse.js';
	import type { Episode } from '$lib/types/episode';
	import EpisodeCard from '$lib/components/episode/EpisodeCard.svelte';

	interface Props {
		episodes: Episode[];
		placeholder?: string;
		compact?: boolean;
		onSearchChange?: (hasQuery: boolean) => void;
	}

	let {
		episodes,
		placeholder = 'Search episodes, titles, descriptions...',
		compact = false,
		onSearchChange
	}: Props = $props();

	const fuse = new Fuse(episodes, {
		keys: [
			{ name: 'title', weight: 10 },
			{ name: 'ep', weight: 3 },
			{ name: 'desc', weight: 1 }
		],
		includeScore: true,
		threshold: 0.4,
		distance: 100,
		minMatchCharLength: 2,
		shouldSort: true,
		findAllMatches: false,
		ignoreLocation: true
	});

	let query = $state('');
	let results: FuseResult<Episode>[] = $state([]);

	async function search() {
		const rawResults = fuse.search(query);

		results = rawResults.sort((a, b) => {
			const aTitle = a.item.title.toLowerCase();
			const bTitle = b.item.title.toLowerCase();
			const searchTerm = query.toLowerCase();

			const aExactMatch = aTitle === searchTerm;
			const bExactMatch = bTitle === searchTerm;
			if (aExactMatch && !bExactMatch) return -1;
			if (bExactMatch && !aExactMatch) return 1;

			const aStartsWith = aTitle.startsWith(searchTerm);
			const bStartsWith = bTitle.startsWith(searchTerm);
			if (aStartsWith && !bStartsWith) return -1;
			if (bStartsWith && !aStartsWith) return 1;

			const aContains = aTitle.includes(searchTerm);
			const bContains = bTitle.includes(searchTerm);
			if (aContains && !bContains) return -1;
			if (bContains && !aContains) return 1;

			return (a.score || 0) - (b.score || 0);
		});

		onSearchChange?.(!!query);
	}

	const searchResults = $derived.by((): Episode[] => {
		if (!query) return [];
		return results.map((result) => result.item);
	});

	function clearSearch() {
		query = '';
		results = [];
		onSearchChange?.(false);
	}
</script>

<div class="max-w-2xl mx-auto mb-8">
	<div class="relative">
		<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
			<svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
				/>
			</svg>
		</div>
		<input
			type="text"
			class="block w-full pl-10 pr-12 py-4 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
			{placeholder}
			bind:value={query}
			oninput={search}
		/>
		{#if query}
			<button
				class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
				onclick={clearSearch}
				aria-label="Clear search"
			>
				<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M6 18L18 6M6 6l12 12"
					/>
				</svg>
			</button>
		{/if}
	</div>

	{#if query && searchResults.length > 0}
		<div class="mt-4 text-center text-gray-600">
			Found {searchResults.length} episode{searchResults.length !== 1 ? 's' : ''}
		</div>
	{/if}
</div>

{#if query}
	<div class="py-8">
		{#if searchResults.length > 0}
			<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{#each searchResults as episode (episode.ep)}
					<EpisodeCard {episode} {compact} />
				{/each}
			</div>
		{:else}
			<div class="text-center py-12">
				<svg
					class="mx-auto h-12 w-12 text-gray-400"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
					/>
				</svg>
				<h3 class="mt-2 text-lg font-medium text-gray-900">No episodes found</h3>
				<p class="mt-1 text-gray-500">
					Try adjusting your search terms or browse by season instead.
				</p>
				<button
					class="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
					onclick={clearSearch}
				>
					Clear search
				</button>
			</div>
		{/if}
	</div>
{/if}
