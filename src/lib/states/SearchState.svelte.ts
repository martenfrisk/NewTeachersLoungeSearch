import type { SearchHitType, SearchStats, SearchFilters } from '../types/search';
import { searchService } from '../services/SearchService';

export class SearchState {
	query = $state('');
	hits = $state<SearchHitType[]>([]);
	stats = $state<SearchStats | null>(null);
	loading = $state(false);
	error = $state<string | null>(null);
	hasMore = $state(false);

	get isEmpty() {
		return this.hits.length === 0;
	}

	get hasResults() {
		return this.hits.length > 0;
	}

	get isSearching() {
		return this.loading && this.hits.length === 0;
	}

	get isLoadingMore() {
		return this.loading && this.hits.length > 0;
	}

	async search(query: string, filters?: SearchFilters): Promise<void> {
		if (!query.trim()) {
			this.clearResults();
			return;
		}

		this.query = query.trim();
		this.loading = true;
		this.error = null;

		try {
			const result = await searchService.search(this.query, {
				filter: filters ? [...(filters.seasons || []), ...(filters.episodes || [])] : [],
				editedOnly: filters?.editedOnly || false,
				offset: 20
			});

			this.hits = result.items;
			this.stats = result.stats;
			this.hasMore = result.hasMore;
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Search failed';
			this.hits = [];
			this.stats = null;
			this.hasMore = false;
		} finally {
			this.loading = false;
		}
	}

	async loadMore(): Promise<void> {
		if (!this.hasMore || this.loading || !this.query) return;

		this.loading = true;

		try {
			const result = await searchService.searchMore(this.query, this.hits);
			this.hits = result.hits;
			this.hasMore = result.hasMore;
			this.stats = result.stats;
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Failed to load more results';
		} finally {
			this.loading = false;
		}
	}

	clearResults(): void {
		this.hits = [];
		this.stats = null;
		this.hasMore = false;
		this.error = null;
	}

	clearError(): void {
		this.error = null;
	}

	reset(): void {
		this.query = '';
		this.hits = [];
		this.stats = null;
		this.loading = false;
		this.error = null;
		this.hasMore = false;
	}
}

// Global instance
export const searchState = new SearchState();
