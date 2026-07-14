import type { SearchHitType, SearchStats, SearchFilters } from '../types/search';
import { searchService } from '../services/SearchService';
import { SvelteSet } from 'svelte/reactivity';

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

			// Time the real round-trip: the service layer reports processingTime: 0
			// (it's never wired up), and server timing is meaningless on the 3-day
			// CDN cache anyway. What's honest and useful is what the user waited.
			const startedAt = performance.now();
			const result = await searchService.search(query, {
				filter: filterStrings,
				editedOnly: filters?.editedOnly || false,
				offset: 0
			});
			const elapsedMs = Math.max(1, Math.round(performance.now() - startedAt));

			hits = result.items;
			stats = { ...result.stats, processingTime: elapsedMs };
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
			const startedAt = performance.now();
			const result = await searchService.searchMore(query, hits);
			const elapsedMs = Math.max(1, Math.round(performance.now() - startedAt));
			hits = result.hits;
			hasMore = result.hasMore;
			stats = { ...result.stats, processingTime: elapsedMs };
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
			// Deduplicate by ID to prevent rendering duplicates
			const seen = new SvelteSet<string>();
			const deduped = value.filter((hit) => {
				if (seen.has(hit.id)) {
					console.warn('Duplicate hit detected and filtered:', hit.id);
					return false;
				}
				seen.add(hit.id);
				return true;
			});
			hits = deduped;
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
