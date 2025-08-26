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

	// Initialize state from props
	if (initialQuery) {
		searchState.query = initialQuery;
	}
	if (initialHits.length > 0) searchState.hits = initialHits;
	filtersState.setFromArray(initialFilters);
	filtersState.editedOnly = initialEditedOnly;

	// Local reactive variable to track the current input value
	let inputValue = $state(searchState.query);

	async function handleSearch() {
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

	// Debounced search to reduce API calls
	let searchTimeoutId: ReturnType<typeof setTimeout> | undefined;

	function debouncedSearch() {
		clearTimeout(searchTimeoutId);
		searchTimeoutId = setTimeout(() => {
			// Update searchState.query from input value when actually performing search
			searchState.query = inputValue;
			if (inputValue.trim()) {
				handleSearch();
			} else {
				searchState.clearResults();
				updateURL();
			}
		}, 150);
	}

	// Effect for input changes with debouncing - only triggers search, doesn't affect input display
	$effect(() => {
		// Track input value changes
		void inputValue;
		debouncedSearch();
	});

	// Effect for filter changes - immediate search since these are deliberate actions
	$effect(() => {
		// Track filter changes
		void filtersState.seasons;
		void filtersState.episodes;
		void filtersState.editedOnly;

		// Clear debounce and search immediately for filter changes
		clearTimeout(searchTimeoutId);
		if (searchState.query.trim()) {
			handleSearch();
		} else {
			updateURL();
		}
	});
</script>

<div class="w-full max-w-6xl mx-auto px-4 py-6 space-y-6">
	<SearchInput bind:query={inputValue} placeholder="Search podcast transcripts..." />
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
