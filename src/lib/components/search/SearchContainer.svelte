<script lang="ts">
	import { replaceState } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { searchState } from '$lib/states/SearchState.svelte';
	import { filtersState } from '$lib/states/FiltersState.svelte';
	import { searchHistoryStore } from '$lib/stores/searchHistory.svelte';
	import SearchInput from './SearchInput.svelte';
	import SearchFilters from './SearchFilters.svelte';
	import SearchResults from './SearchResults.svelte';
	import type { SearchHitType } from '$lib/types/search';

	// resolve()'s overloads are keyed per literal route, so they reject the
	// current page's pathname, which is only known at runtime. The argument
	// (not the resolve() call itself) is cast to bypass overload matching, so
	// eslint's svelte/no-navigation-without-resolve still sees a direct call.

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

	// Seed global search/filter state from SSR-provided initial props exactly
	// once at mount - intentionally not reactive, since re-running this on
	// every prop change would blow away the user's in-progress search.
	// svelte-ignore state_referenced_locally
	if (initialQuery) {
		searchState.query = initialQuery;
	}
	// svelte-ignore state_referenced_locally
	if (initialHits.length > 0) searchState.hits = initialHits;
	// svelte-ignore state_referenced_locally
	filtersState.setFromArray(initialFilters);
	// svelte-ignore state_referenced_locally
	filtersState.editedOnly = initialEditedOnly;
	let inputValue = $state(searchState.query);
	// Each effect below needs its own flag - they both guard against
	// re-searching when SSR already provided initialHits, but a shared flag
	// let the first effect's mount run flip it before the second effect's
	// mount run ever read it, silently defeating that guard and causing a
	// redundant client-side re-search (bypassing the /api/search CDN cache)
	// on every single page load.
	let hasInitializedSearchEffect = false;
	let hasInitializedFiltersEffect = false;

	async function handleSearch(query?: string) {
		if (query !== undefined) {
			searchState.query = query;
			inputValue = query;
		}

		const searchQuery = searchState.query.trim();
		if (searchQuery) {
			await searchState.search(searchQuery, filtersState.asSearchFilters);

			// Add to search history with results count
			searchHistoryStore.addSearch(searchQuery, searchState.stats?.estimatedTotalHits || 0, {
				seasons: filtersState.seasons.length > 0 ? [...filtersState.seasons] : undefined,
				episodes: filtersState.episodes.length > 0 ? [...filtersState.episodes] : undefined
			});
		}
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

		const newUrl = `${window.location.pathname}?${params.toString()}`;
		// Shallow routing, deliberately: results are already in hand from the
		// client-side search above, so this call only needs to make the URL
		// shareable. goto() would additionally re-run the server load, which
		// re-queries Supabase *and* writes a per-query entry to Vercel's ISR
		// cache - and since every `?s=` value is a unique key, every keystroke
		// was a guaranteed cache miss. replaceState updates the address bar
		// without touching the server. It also needs no keepFocus/noScroll,
		// because it isn't a navigation and so never moves focus or scroll.
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		replaceState(resolve(newUrl as any), {});
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

		if (!hasInitializedSearchEffect) {
			hasInitializedSearchEffect = true;
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
		if (!hasInitializedFiltersEffect) {
			hasInitializedFiltersEffect = true;
			if (initialHits.length > 0) {
				return;
			}
		}

		clearTimeout(searchTimeoutId);
		if (searchState.query.trim()) {
			handleSearch();
		} else {
			updateURL();
		}
	});
</script>

<div class="w-full px-4 mb-16 max-w-6xl mx-auto space-y-4">
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
