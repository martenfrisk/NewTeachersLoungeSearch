// Search context for eliminating prop drilling and centralizing search state
import { getContext, setContext } from 'svelte';
import { goto } from '$app/navigation';
import type { SearchHitType, SearchStats } from '$lib/types/search';

interface SearchFiltersType {
	seasons?: string[];
	editedOnly?: boolean;
}

interface SearchContextType {
	// Search state
	query: string;
	hits: SearchHitType[];
	stats: SearchStats | null;
	loading: boolean;
	error: string | null;
	hasMore: boolean;

	// Search actions
	search: (query: string, filters?: SearchFiltersType) => Promise<void>;
	loadMore: () => Promise<void>;
	clearResults: () => void;
	clearError: () => void;
	retry: () => Promise<void>;

	// URL state management
	updateURL: () => void;
}

const SEARCH_CONTEXT_KEY = Symbol('search-context');

export function createSearchContext(): SearchContextType {
	let query = $state('');
	let hits = $state<SearchHitType[]>([]);
	let stats = $state<SearchStats | null>(null);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let hasMore = $state(false);

	// Store last search params for retry
	let lastSearchParams: { query: string; filters?: SearchFiltersType } | null = null;

	async function search(searchQuery: string, filters?: SearchFiltersType) {
		try {
			loading = true;
			error = null;
			lastSearchParams = { query: searchQuery, filters };

			// Import search service dynamically to avoid circular imports
			const { searchService } = await import('$lib/services/SearchService');

			const result = await searchService.search(searchQuery, {
				filter: filters?.seasons || [],
				offset: 0,
				editedOnly: filters?.editedOnly || false
			});

			query = searchQuery;
			hits = result.items;
			stats = result.stats;
			hasMore = result.hasMore;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Search failed';
			console.error('Search error:', err);
		} finally {
			loading = false;
		}
	}

	async function loadMore() {
		if (!hasMore || loading || !lastSearchParams) return;

		try {
			loading = true;
			error = null;

			const { searchService } = await import('$lib/services/SearchService');

			const result = await searchService.searchMore(lastSearchParams.query, hits, {
				filter: lastSearchParams.filters?.seasons || [],
				editedOnly: lastSearchParams.filters?.editedOnly || false
			});

			hits = result.hits;
			stats = result.stats;
			hasMore = result.hasMore;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Load more failed';
			console.error('Load more error:', err);
		} finally {
			loading = false;
		}
	}

	function clearResults() {
		hits = [];
		stats = null;
		hasMore = false;
		error = null;
		lastSearchParams = null;
	}

	function clearError() {
		error = null;
	}

	async function retry() {
		if (lastSearchParams) {
			await search(lastSearchParams.query, lastSearchParams.filters);
		}
	}

	function updateURL() {
		if (typeof window === 'undefined') return;

		const params = new URLSearchParams(window.location.search);

		if (query) {
			params.set('s', query);
		} else {
			params.delete('s');
		}

		// Handle other URL params from filters context
		const url = params.toString() ? `?${params.toString()}` : '';
		goto(url, {
			keepFocus: true,
			noScroll: true,
			replaceState: true
		});
	}

	return {
		// State getters
		get query() {
			return query;
		},
		get hits() {
			return hits;
		},
		get stats() {
			return stats;
		},
		get loading() {
			return loading;
		},
		get error() {
			return error;
		},
		get hasMore() {
			return hasMore;
		},

		// Actions
		search,
		loadMore,
		clearResults,
		clearError,
		retry,
		updateURL
	};
}

export function setSearchContext(context: SearchContextType) {
	setContext(SEARCH_CONTEXT_KEY, context);
}

export function getSearchContext(): SearchContextType {
	const context = getContext<SearchContextType>(SEARCH_CONTEXT_KEY);
	if (!context) {
		throw new Error(
			'Search context not found. Make sure to call setSearchContext in a parent component.'
		);
	}
	return context;
}

// Hook-style composable for components
export function useSearchContext() {
	return getSearchContext();
}
