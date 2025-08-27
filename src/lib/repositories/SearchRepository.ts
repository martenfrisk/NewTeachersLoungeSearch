import type { SearchResult, SearchParams, SearchStats, SearchHitType } from '../types/search';
import type { PaginatedResponse } from '../types/common';
import { MeiliSearch, type SearchParams as MeiliSearchParams } from 'meilisearch';
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
			const validation = validateSearchParams(params);
			if (!validation.valid) {
				throw new SearchError(validation.error!);
			}

			const { query, filter, offset, editedOnly } = params;
			const index = this.client.index('teachers');

			const hasSeasonOrEpisodeFilters = this.hasSeasonOrEpisodeFilters(filter);
			let filterString = '';
			if (filter.length > 0) {
				filterString = filter.length > 1 ? filter.join(' OR ') : filter[0];
			}
			if (editedOnly) {
				filterString = filterString ? `(${filterString}) AND edited=true` : 'edited=true';
			}

			const resultsSearchOptions: MeiliSearchParams = {
				attributesToHighlight: ['line'],
				facets: ['season', 'episode'],
				limit: offset
			};

			if (filterString) {
				resultsSearchOptions.filter = filterString;
			}

			const resultsPromise = index.search(query, resultsSearchOptions);
			let facetsPromise: Promise<SearchResult> | null = null;
			if (hasSeasonOrEpisodeFilters) {
				const facetsFilterString = editedOnly ? 'edited=true' : '';
				const facetsSearchOptions: MeiliSearchParams = {
					facets: ['season', 'episode'],
					limit: 0
				};

				if (facetsFilterString) {
					facetsSearchOptions.filter = facetsFilterString;
				}

				facetsPromise = index.search(query, facetsSearchOptions);
			}

			const [resultsRaw, facetsRaw] = await Promise.all([resultsPromise, facetsPromise]);

			const searchResult: SearchResult = {
				...resultsRaw,
				offset: resultsRaw.offset ?? 0,
				limit: resultsRaw.limit ?? offset
			} as SearchResult;
			const facetsToUse = facetsRaw?.facetDistribution || searchResult.facetDistribution || {};
			const facets = this.processFacets(facetsToUse);

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

	private hasSeasonOrEpisodeFilters(filters: string[]): boolean {
		return filters.some((filter) => filter.includes('season = ') || filter.includes('episode = '));
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

export class SupabaseSearchRepository implements ISearchRepository {
	async search(
		params: SearchParams
	): Promise<PaginatedResponse<SearchHitType> & { stats: SearchStats }> {
		// TODO: Implement Supabase search logic
		console.log('Search params:', params);
		throw new Error('SupabaseSearchRepository not implemented yet');
	}
}
