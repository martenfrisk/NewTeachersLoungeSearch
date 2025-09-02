<script lang="ts">
	import { goto } from '$app/navigation';
	import { searchState } from '$lib/states/SearchState.svelte';
	import { filtersState } from '$lib/states/FiltersState.svelte';
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

	if (initialQuery) {
		searchState.query = initialQuery;
	}
	if (initialHits.length > 0) searchState.hits = initialHits;
	filtersState.setFromArray(initialFilters);
	filtersState.editedOnly = initialEditedOnly;
	let inputValue = $state(searchState.query);
	let hasInitialized = false;

	async function handleSearch(query?: string) {
		if (query !== undefined) {
			searchState.query = query;
			inputValue = query;
		}
		await searchState.search(searchState.query, filtersState.asSearchFilters);
		updateURL();
	}

	function handleLoadMore() {
		searchState.loadMore();
	}

	function handleRetry() {
		handleSearch();
	}

	function handleClearError() {
		searchState.clearError();
	}

	function updateURL() {
		const params = new URL(window.location.href).searchParams;
		if (searchState.query) params.set('s', searchState.query);
		if (filtersState.activeFiltersArray.length > 0) {
			params.set(
				'f',
				filtersState.activeFiltersArray.map((f) => f.replaceAll(' = ', '=')).join(',')
			);
		}
		if (filtersState.editedOnly) params.set('edited', 'true');

		goto(`?${params.toString()}`, {
			keepFocus: true,
			noScroll: true,
			replaceState: true
		});
	}

	let searchTimeoutId: ReturnType<typeof setTimeout> | undefined;

	function debouncedSearch() {
		clearTimeout(searchTimeoutId);
		searchTimeoutId = setTimeout(() => {
			searchState.query = inputValue;
			if (inputValue.trim()) {
				handleSearch();
			} else {
				searchState.clearResults();
				updateURL();
			}
		}, 150);
	}

	// Only enable reactive search after initial hydration if we don't have initial hits
	$effect(() => {
		void inputValue;

		if (!hasInitialized) {
			hasInitialized = true;
			// If we have initial hits, don't search automatically
			if (initialHits.length > 0) {
				return;
			}
		}

		debouncedSearch();
	});

	$effect(() => {
		void filtersState.seasons;
		void filtersState.episodes;
		void filtersState.editedOnly;

		// Don't search automatically if we haven't initialized yet and have initial hits
		if (!hasInitialized && initialHits.length > 0) {
			return;
		}

		clearTimeout(searchTimeoutId);
		if (searchState.query.trim()) {
			handleSearch();
		} else {
			updateURL();
		}
	});
</script>

<div class="w-full max-w-6xl mx-auto space-y-6">
	<SearchInput
		bind:query={inputValue}
		placeholder="Search podcast transcripts..."
		onSearch={handleSearch}
	/>
	<SearchFilters facets={searchState.stats?.facets || []} />
	<SearchResults
		hits={searchState.hits}
		stats={searchState.stats}
		loading={searchState.loading}
		error={searchState.error}
		hasMore={searchState.hasMore}
		onLoadMore={handleLoadMore}
		onRetry={handleRetry}
		onClearError={handleClearError}
	/>
</div>
