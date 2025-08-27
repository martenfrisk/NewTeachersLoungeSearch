import type { SearchHitType, SearchStats, SearchFilters } from '../types/search';
import { searchService } from '../services/SearchService';

function createSearchState() {
	let query = $state('');
	let hits = $state<SearchHitType[]>([]);
	let stats = $state<SearchStats | null>(null);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let hasMore = $state(false);

	const isEmpty = $derived(hits.length === 0);
	const hasResults = $derived(hits.length > 0);
	const isSearching = $derived(loading && hits.length === 0);
	const isLoadingMore = $derived(loading && hits.length > 0);

	async function search(searchQuery: string, filters?: SearchFilters): Promise<void> {
		if (!searchQuery.trim()) {
			clearResults();
			return;
		}

		query = searchQuery.trim();
		loading = true;
		error = null;

		try {
			const filterStrings: string[] = [];
			if (filters?.seasons) {
				filters.seasons.forEach((season) => filterStrings.push(`season = "${season}"`));
			}
			if (filters?.episodes) {
				filters.episodes.forEach((episode) => filterStrings.push(`episode = "${episode}"`));
			}

			const result = await searchService.search(query, {
				filter: filterStrings,
				editedOnly: filters?.editedOnly || false,
				offset: 20
			});

			hits = result.items;
			stats = result.stats;
			hasMore = result.hasMore;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Search failed';
			hits = [];
			stats = null;
			hasMore = false;
		} finally {
			loading = false;
		}
	}

	async function loadMore(): Promise<void> {
		if (!hasMore || loading || !query) return;

		loading = true;

		try {
			const result = await searchService.searchMore(query, hits);
			hits = result.hits;
			hasMore = result.hasMore;
			stats = result.stats;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load more results';
		} finally {
			loading = false;
		}
	}

	function clearResults(): void {
		hits = [];
		stats = null;
		hasMore = false;
		error = null;
	}

	function clearError(): void {
		error = null;
	}

	function reset(): void {
		query = '';
		hits = [];
		stats = null;
		loading = false;
		error = null;
		hasMore = false;
	}

	return {
		get query() {
			return query;
		},
		set query(value: string) {
			query = value;
		},
		get hits() {
			return hits;
		},
		set hits(value: SearchHitType[]) {
			hits = value;
		},
		get stats() {
			return stats;
		},
		set stats(value: SearchStats | null) {
			stats = value;
		},
		get loading() {
			return loading;
		},
		set loading(value: boolean) {
			loading = value;
		},
		get error() {
			return error;
		},
		set error(value: string | null) {
			error = value;
		},
		get hasMore() {
			return hasMore;
		},
		set hasMore(value: boolean) {
			hasMore = value;
		},
		get isEmpty() {
			return isEmpty;
		},
		get hasResults() {
			return hasResults;
		},
		get isSearching() {
			return isSearching;
		},
		get isLoadingMore() {
			return isLoadingMore;
		},
		search,
		loadMore,
		clearResults,
		clearError,
		reset
	};
}

export const searchState = createSearchState();
