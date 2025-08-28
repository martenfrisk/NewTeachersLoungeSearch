import type {
	SearchResult,
	SearchParams,
	SearchStats,
	SearchHitType,
	SearchFacet
} from '../types/search';
import type { PaginatedResponse } from '../types/common';
import { MeiliSearch, type SearchParams as MeiliSearchParams } from 'meilisearch';
import { MeiliKey } from '$lib/Env';
import { SearchError, NetworkError, createErrorHandler } from '../utils/errors';
import { validateSearchParams } from '../utils/validation';
import { SearchCache } from '$lib/services/SearchCache';

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
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	private supabase: any = null;
	private readonly handleError = createErrorHandler('SupabaseSearchRepository');
	private searchCache?: SearchCache<PaginatedResponse<SearchHitType> & { stats: SearchStats }>;
	private facetCache?: SearchCache<SearchFacet[]>;

	constructor() {
		// Dynamic import to avoid issues with SSR/client-side differences
		this.initializeSupabase();
		// Import cache after initialization
		this.initializeCache();
	}

	private async initializeCache() {
		const { SearchCache } = await import('$lib/services/SearchCache');
		this.searchCache = new SearchCache(500, 10 * 60 * 1000); // 10 minute cache for good UX
		this.facetCache = new SearchCache(100, 15 * 60 * 1000); // 15 minute cache for facets
	}

	private async initializeSupabase() {
		if (!this.supabase) {
			const { supabase } = await import('$lib/supabase');
			this.supabase = supabase;
		}
	}

	async search(
		params: SearchParams
	): Promise<PaginatedResponse<SearchHitType> & { stats: SearchStats }> {
		try {
			await this.initializeSupabase();
			await this.initializeCache();

			const validation = validateSearchParams(params);
			if (!validation.valid) {
				throw new SearchError(validation.error!);
			}

			const { query, filter, offset, editedOnly } = params;

			// Check cache first for sub-second response times
			const cachedResult = this.searchCache?.get(query, filter, offset, editedOnly);
			if (cachedResult) {
				return cachedResult;
			}

			// Parse filter array into season and episode filters
			const seasonFilters: string[] = [];
			const episodeFilters: string[] = [];

			filter.forEach((f) => {
				if (f.includes('season = ')) {
					const season = f.replace('season = ', '').replace(/"/g, '');
					seasonFilters.push(season);
				} else if (f.includes('episode = ')) {
					const episode = f.replace('episode = ', '').replace(/"/g, '');
					episodeFilters.push(episode);
				}
			});

			// Use optimized function with timeout protection
			const searchPromise = this.supabase.rpc('optimized_search_transcripts', {
				search_query: query,
				season_filter: seasonFilters.length > 0 ? seasonFilters : null,
				episode_filter: episodeFilters.length > 0 ? episodeFilters : null,
				edited_only_filter: editedOnly,
				limit_count: params.limit || 20,
				offset_count: offset
			});

			// Race with 1-second timeout as agreed
			const timeoutPromise = new Promise((_, reject) =>
				setTimeout(() => reject(new Error('Search timeout after 1 second')), 1000)
			);

			const { data: searchResults, error: searchError } = await Promise.race([
				searchPromise,
				timeoutPromise
			]);

			if (searchError) {
				throw new SearchError(`Supabase search error: ${searchError.message}`);
			}

			// Get facets with caching
			const cachedFacets = this.facetCache?.get(query, [], 0, editedOnly);
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			let facetResults: any[] = [];

			if (cachedFacets) {
				// Use cached facets
				facetResults = this.convertFacetsToRawFormat(cachedFacets);
			} else {
				const { data: freshFacets, error: facetError } = await this.supabase.rpc(
					'optimized_search_facets',
					{
						search_query: query,
						edited_only_filter: editedOnly
					}
				);

				if (facetError) {
					console.warn('Facet query error:', facetError.message);
					facetResults = [];
				} else {
					facetResults = freshFacets || [];
					// Cache the processed facets
					const processedFacets = this.processFacets(facetResults);
					this.facetCache?.set(query, [], 0, editedOnly, processedFacets);
				}
			}

			// Process results to match MeiliSearch format
			const hits: SearchHitType[] = (searchResults || []).map(
				(result: {
					id: string;
					season: string;
					timestamp_str: string;
					speaker: string;
					line: string;
					episode: string;
					edited: boolean;
					total_count?: number;
				}) => ({
					id: result.id,
					season: result.season,
					time: result.timestamp_str,
					speaker: result.speaker,
					line: result.line,
					episode: result.episode,
					edited: result.edited,
					_formatted: {
						id: result.id,
						season: result.season,
						time: result.timestamp_str,
						speaker: result.speaker,
						line: result.line, // TODO: Add highlighting based on search query
						episode: result.episode,
						edited: result.edited
					}
				})
			);

			// Process facets and prepare final result
			const facets = this.processFacets(facetResults);
			const totalHits =
				searchResults && searchResults.length > 0 ? searchResults[0].total_count : 0;
			const limit = params.limit || 20;

			const result = {
				items: hits,
				total: totalHits,
				page: Math.floor(offset / limit) + 1,
				limit,
				hasMore: hits.length === limit,
				stats: {
					estimatedTotalHits: totalHits,
					processingTime: 0,
					facets
				}
			};

			// Cache the result for fast subsequent requests
			this.searchCache?.set(query, filter, offset, editedOnly, result);

			return result;
		} catch (error) {
			if (error instanceof SearchError) {
				throw error;
			}
			if (error instanceof Error && error.message.includes('fetch')) {
				throw new NetworkError('Failed to connect to Supabase');
			}
			throw this.handleError(error);
		}
	}

	private convertFacetsToRawFormat(
		facets: SearchFacet[]
	): Array<{ facet_type: string; facet_value: string; count: number }> {
		const rawFacets: Array<{ facet_type: string; facet_value: string; count: number }> = [];

		facets.forEach((facet) => {
			facet.facetHits.forEach((hit) => {
				rawFacets.push({
					facet_type: facet.facetName,
					facet_value: hit.ep,
					count: hit.hits
				});
			});
		});

		return rawFacets;
	}

	private processFacets(
		facetResults: Array<{ facet_type: string; facet_value: string; count: number }>
	) {
		const facets: Array<{ facetName: string; facetHits: Array<{ ep: string; hits: number }> }> = [];

		// Group facets by type
		const seasonFacets: { [key: string]: number } = {};
		const episodeFacets: { [key: string]: number } = {};

		facetResults.forEach((facet) => {
			if (facet.facet_type === 'season') {
				seasonFacets[facet.facet_value] = facet.count;
			} else if (facet.facet_type === 'episode') {
				episodeFacets[facet.facet_value] = facet.count;
			}
		});

		// Convert to MeiliSearch format
		if (Object.keys(seasonFacets).length > 0) {
			const seasonHits = Object.entries(seasonFacets)
				.map(([key, value]) => ({ ep: key, hits: value }))
				.sort((a, b) => b.hits - a.hits)
				.slice(0, 9);

			facets.push({ facetName: 'season', facetHits: seasonHits });
		}

		if (Object.keys(episodeFacets).length > 0) {
			const episodeHits = Object.entries(episodeFacets)
				.map(([key, value]) => ({ ep: key, hits: value }))
				.sort((a, b) => b.hits - a.hits)
				.slice(0, 9);

			facets.push({ facetName: 'episode', facetHits: episodeHits });
		}

		return facets;
	}
}
