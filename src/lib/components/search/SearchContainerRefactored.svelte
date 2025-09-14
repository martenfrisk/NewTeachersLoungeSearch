<script lang="ts">
	import { createSearchContext, setSearchContext } from '$lib/contexts/SearchContext';
	import { filtersState } from '$lib/states/FiltersState.svelte';
	import { searchHistoryStore } from '$lib/stores/searchHistory.svelte';
	import SearchInput from './SearchInput.svelte';
	import SearchFilters from './SearchFilters.svelte';
	import SearchResults from './SearchResults.svelte';
	import type { SearchHitType } from '$lib/types/search';

	interface Props {
		initialQuery?: string;
		initialHits?: SearchHitType[];
		initialFilters?: string[];
		initialEditedOnly?: boolean;
	}

	let {
		initialQuery = '',
		initialHits = [],
		initialFilters = [],
		initialEditedOnly = false
	}: Props = $props();

	// Create and set search context
	const searchContext = createSearchContext();
	setSearchContext(searchContext);

	// Initialize state
	if (initialQuery) {
		// Set initial data without triggering search
		searchContext.query = initialQuery;
	}
	if (initialHits.length > 0) {
		searchContext.hits = initialHits;
	}
	filtersState.setFromArray(initialFilters);
	filtersState.editedOnly = initialEditedOnly;

	let inputValue = $state(searchContext.query);
	let hasInitialized = false;

	async function handleSearch(query?: string) {
		if (query !== undefined) {
			inputValue = query;
		}

		const searchQuery = inputValue.trim();
		if (searchQuery) {
			await searchContext.search(searchQuery, filtersState.asSearchFilters);

			// Add to search history
			searchHistoryStore.addSearch(searchQuery, searchContext.stats?.estimatedTotalHits || 0, {
				seasons: filtersState.seasons.length > 0 ? [...filtersState.seasons] : undefined,
				episodes: filtersState.episodes.length > 0 ? [...filtersState.episodes] : undefined
			});
		}
		searchContext.updateURL();
	}

	function handleLoadMore() {
		searchContext.loadMore();
	}

	function handleRetry() {
		searchContext.retry();
	}

	function handleClearError() {
		searchContext.clearError();
	}

	let searchTimeoutId: ReturnType<typeof setTimeout> | undefined;

	function debouncedSearch() {
		clearTimeout(searchTimeoutId);
		searchTimeoutId = setTimeout(() => {
			if (inputValue.trim()) {
				handleSearch();
			} else {
				searchContext.clearResults();
				searchContext.updateURL();
			}
		}, 150);
	}

	// Reactive search when input changes
	$effect(() => {
		void inputValue;

		if (!hasInitialized) {
			hasInitialized = true;
			if (initialHits.length > 0) {
				return;
			}
		}

		debouncedSearch();
	});

	// Reactive search when filters change
	$effect(() => {
		void filtersState.seasons;
		void filtersState.episodes;
		void filtersState.editedOnly;

		if (!hasInitialized && initialHits.length > 0) {
			return;
		}

		clearTimeout(searchTimeoutId);
		if (inputValue.trim()) {
			handleSearch();
		} else {
			searchContext.updateURL();
		}
	});
</script>

<div class="w-full px-4 mb-24 max-w-6xl mx-auto space-y-6">
	<SearchInput
		bind:query={inputValue}
		placeholder="Search podcast transcripts..."
		onSearch={handleSearch}
	/>
	<SearchFilters facets={searchContext.stats?.facets || []} />
	<SearchResults
		hits={searchContext.hits}
		stats={searchContext.stats}
		loading={searchContext.loading}
		error={searchContext.error}
		hasMore={searchContext.hasMore}
		onLoadMore={handleLoadMore}
		onRetry={handleRetry}
		onClearError={handleClearError}
	/>
</div>
