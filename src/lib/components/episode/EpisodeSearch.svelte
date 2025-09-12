<script lang="ts">
	import type { ProcessedTranscriptLine } from '$lib/types/episode';
	import EpisodeSearchResult from './EpisodeSearchResult.svelte';
	import { slide } from 'svelte/transition';

	interface Props {
		transcriptLines: ProcessedTranscriptLine[];
		highlightedTime?: string | null;
		onNavigateToResult?: (time: string) => void;
	}

	let { transcriptLines, highlightedTime = $bindable(), onNavigateToResult }: Props = $props();

	let query = $state('');
	let searchResults = $state<{ item: ProcessedTranscriptLine; score?: number }[]>([]);
	let isLoading = $state(false);
	let fuseInstance: {
		search: (
			query: string,
			options?: { limit: number }
		) => { item: ProcessedTranscriptLine; score?: number }[];
	} | null = $state(null);
	let inputElement: HTMLInputElement;

	const hasQuery = $derived(query.trim().length > 0);
	const hasResults = $derived(searchResults.length > 0);
	const showResults = $derived(hasQuery && (hasResults || !isLoading));

	async function initializeFuse() {
		if (fuseInstance) return fuseInstance;

		isLoading = true;
		try {
			const Fuse = (await import('fuse.js')).default;

			fuseInstance = new Fuse(transcriptLines, {
				keys: [
					{ name: 'line', weight: 0.8 },
					{ name: 'displaySpeaker', weight: 0.2 }
				],
				threshold: 0.3,
				includeScore: true,
				includeMatches: true,
				ignoreLocation: false,
				minMatchCharLength: 2,
				findAllMatches: true
			});

			return fuseInstance;
		} finally {
			isLoading = false;
		}
	}

	async function performSearch(searchQuery: string) {
		if (!searchQuery.trim()) {
			searchResults = [];
			return;
		}

		const fuse = await initializeFuse();
		const results = fuse.search(searchQuery, { limit: 20 });
		searchResults = results;
	}

	function handleInput(event: Event) {
		const target = event.target as HTMLInputElement;
		query = target.value;
		performSearch(query);
	}

	function handleClear() {
		query = '';
		searchResults = [];
		inputElement?.focus();
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			handleClear();
		}
	}
</script>

<div class="mb-6">
	<label for="episode-search" class="block text-sm font-medium text-gray-700 mb-2">
		Search this episode
	</label>

	<div class="relative">
		<input
			id="episode-search"
			bind:this={inputElement}
			type="text"
			placeholder="Search through transcript lines..."
			value={query}
			oninput={handleInput}
			onkeydown={handleKeydown}
			class="block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
			class:pr-10={hasQuery}
		/>

		{#if hasQuery}
			<button
				class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
				onclick={handleClear}
				aria-label="Clear search"
			>
				<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width={2}
						d="M6 18L18 6M6 6l12 12"
					/>
				</svg>
			</button>
		{/if}
	</div>

	{#if hasQuery}
		<div class="mt-1 text-sm text-gray-500">
			{#if isLoading}
				Loading search...
			{:else if hasResults}
				{searchResults.length} result{searchResults.length === 1 ? '' : 's'} found
			{:else}
				No results found for "{query}"
			{/if}
		</div>
	{/if}
</div>

{#if showResults}
	<div class="mt-4 space-y-2" transition:slide={{ duration: 200 }}>
		<h3 class="text-sm font-medium text-gray-700 border-b border-gray-200 pb-2">Search Results</h3>

		<div class="space-y-2 max-h-96 overflow-y-auto">
			{#each searchResults as result (result.item.time)}
				<EpisodeSearchResult
					{result}
					bind:highlightedTime
					searchQuery={query}
					{onNavigateToResult}
				/>
			{/each}
		</div>
	</div>
{/if}
