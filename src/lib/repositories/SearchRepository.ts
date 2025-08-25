import type { SearchResult, SearchParams, SearchStats, SearchHitType } from '../types/search';
import type { PaginatedResponse } from '../types/common';
import { MeiliSearch } from 'meilisearch';
import { MeiliKey } from '$lib/Env';
import { SearchError, NetworkError, createErrorHandler } from '../utils/errors';
import { validateSearchParams } from '../utils/validation';

export interface ISearchRepository {
	search(params: SearchParams): Promise<PaginatedResponse<SearchHitType> & { stats: SearchStats }>;
}

export class MeiliSearchRepository implements ISearchRepository {
	private client: MeiliSearch;
	private readonly handleError = createErrorHandler('MeiliSearchRepository');

	constructor() {
		this.client = new MeiliSearch({
			host: 'https://ts.pcast.site/',
			apiKey: MeiliKey
		});
	}

	async search(
		params: SearchParams
	): Promise<PaginatedResponse<SearchHitType> & { stats: SearchStats }> {
		try {
			// Validate parameters
			const validation = validateSearchParams(params);
			if (!validation.valid) {
				throw new SearchError(validation.error!);
			}

			const { query, filter, offset, editedOnly } = params;
			const index = this.client.index('teachers');

			let searchResult: SearchResult;

			// Build filter string
			let filterString = '';
			if (filter.length > 0) {
				filterString = filter.length > 1 ? filter.join(' OR ') : filter[0];
			}
			if (editedOnly) {
				filterString = filterString ? `(${filterString}) AND edited=true` : 'edited=true';
			}

			// Perform search
			const searchOptions: any = {
				attributesToHighlight: ['line'],
				facets: ['season', 'episode'],
				limit: offset
			};

			if (filterString) {
				searchOptions.filter = filterString;
			}

			const rawResult = await index.search(query, searchOptions);
			searchResult = {
				...rawResult,
				offset: rawResult.offset ?? 0,
				limit: rawResult.limit ?? offset
			} as SearchResult;

			// Process facets
			const facets = this.processFacets(searchResult.facetDistribution || {});

			return {
				items: searchResult.hits,
				total: searchResult.estimatedTotalHits,
				page: Math.floor(offset / 20) + 1,
				limit: offset,
				hasMore: searchResult.hits.length === offset,
				stats: {
					estimatedTotalHits: searchResult.estimatedTotalHits,
					processingTime: searchResult.processingTimeMs,
					facets
				}
			};
		} catch (error) {
			if (error instanceof SearchError) {
				throw error;
			}
			if (error instanceof Error && error.message.includes('fetch')) {
				throw new NetworkError('Failed to connect to search service');
			}
			throw this.handleError(error);
		}
	}

	private processFacets(facetDistribution: { [key: string]: { [key: string]: number } }) {
		const facets: Array<{ facetName: string; facetHits: Array<{ ep: string; hits: number }> }> = [];

		Object.entries(facetDistribution).forEach(([facetKey, facetValue]) => {
			const facetHits = Object.entries(facetValue)
				.map(([key, value]) => ({ ep: key, hits: value }))
				.sort((a, b) => b.hits - a.hits)
				.slice(0, 9);

			facets.push({ facetName: facetKey, facetHits });
		});

		return facets;
	}
}

// Future Supabase repository implementation
export class SupabaseSearchRepository implements ISearchRepository {
	async search(
		params: SearchParams
	): Promise<PaginatedResponse<SearchHitType> & { stats: SearchStats }> {
		// TODO: Implement Supabase search logic
		throw new Error('SupabaseSearchRepository not implemented yet');
	}
}
