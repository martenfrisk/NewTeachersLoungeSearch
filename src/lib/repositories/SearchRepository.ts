import type { SearchParams, SearchStats, SearchHitType } from '../types/search';
import type { PaginatedResponse } from '../types/common';
import type {
	TypedSupabaseClient,
	SupabaseSearchResultType,
	SupabaseFacetResultType
} from '../types/supabase';
import { BaseService } from '../services/BaseService';
import { SearchError } from '../utils/errors';
import { validateSearchParams } from '../utils/validation';
import { highlightSearchTerms } from '../utils/highlighting';

export interface ISearchRepository {
	search(params: SearchParams): Promise<PaginatedResponse<SearchHitType> & { stats: SearchStats }>;
}

export class SupabaseSearchRepository extends BaseService implements ISearchRepository {
	private supabase: TypedSupabaseClient | null = null;

	constructor() {
		super('SupabaseSearchRepository');
		this.initializeSupabase();
	}

	private async initializeSupabase(): Promise<void> {
		if (!this.supabase) {
			const { supabase } = await import('$lib/supabase');
			this.supabase = supabase as unknown as TypedSupabaseClient;
		}
	}

	async search(
		params: SearchParams
	): Promise<PaginatedResponse<SearchHitType> & { stats: SearchStats }> {
		return this.executeWithErrorHandling(
			async () => {
				await this.initializeSupabase();

				if (!this.supabase) {
					throw new SearchError('Supabase client not initialized');
				}

				// Validate input parameters
				this.validateInput(params, validateSearchParams, 'search parameters');

				const { query, originalQuery, filter, offset, editedOnly } = params;

				// Parse filters with better type safety
				const { seasonFilters, episodeFilters } = this.parseFilters(filter);

				// Execute search query
				const searchResult = await this.executeSearchQuery(
					query,
					seasonFilters,
					episodeFilters,
					editedOnly,
					params.limit || 20,
					offset
				);

				// Execute facets query in parallel
				const facetResult = await this.executeFacetsQuery(query, editedOnly);

				// Process and return results
				return this.processSearchResults(
					searchResult,
					facetResult,
					originalQuery,
					params.limit || 20,
					offset
				);
			},
			'search',
			{
				query: params.query,
				filters: params.filter.length,
				offset: params.offset,
				editedOnly: params.editedOnly
			}
		);
	}

	private parseFilters(filter: string[]): { seasonFilters: string[]; episodeFilters: string[] } {
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

		return { seasonFilters, episodeFilters };
	}

	private async executeSearchQuery(
		query: string,
		seasonFilters: string[],
		episodeFilters: string[],
		editedOnly: boolean,
		limit: number,
		offset: number
	): Promise<SupabaseSearchResultType[]> {
		if (!this.supabase) {
			throw new SearchError('Supabase client not initialized');
		}

		const { data: searchResults, error: searchError } = await this.supabase.rpc(
			'optimized_search_transcripts',
			{
				search_query: query,
				season_filter: seasonFilters.length > 0 ? seasonFilters : null,
				episode_filter: episodeFilters.length > 0 ? episodeFilters : null,
				edited_only_filter: editedOnly,
				limit_count: limit,
				offset_count: offset
			}
		);

		if (searchError) {
			throw new SearchError(`Search query failed: ${searchError.message}`);
		}

		return searchResults || [];
	}

	private async executeFacetsQuery(
		query: string,
		editedOnly: boolean
	): Promise<SupabaseFacetResultType[]> {
		if (!this.supabase) {
			throw new SearchError('Supabase client not initialized');
		}

		const { data: facetResults, error: facetError } = await this.supabase.rpc(
			'optimized_search_facets',
			{
				search_query: query,
				edited_only_filter: editedOnly
			}
		);

		if (facetError) {
			this.log('warn', 'Facet query failed', { error: facetError.message });
			return [];
		}

		return facetResults || [];
	}

	private processSearchResults(
		searchResults: SupabaseSearchResultType[],
		facetResults: SupabaseFacetResultType[],
		originalQuery: string | undefined,
		limit: number,
		offset: number
	): PaginatedResponse<SearchHitType> & { stats: SearchStats } {
		// Transform search results
		const hits: SearchHitType[] = searchResults.map((result) => ({
			id: result.id,
			season: result.season,
			time: result.timestamp_str,
			speaker: result.speaker,
			line: result.line,
			highlightedLine: originalQuery
				? highlightSearchTerms(result.line, originalQuery)
				: result.line,
			episode: result.episode,
			edited: result.edited
		}));

		// Process facets
		const facets = this.processFacets(facetResults);

		// Get total count from first result
		const totalHits = searchResults.length > 0 ? searchResults[0].total_count || 0 : 0;

		return {
			items: hits,
			total: totalHits,
			page: Math.floor(offset / limit) + 1,
			limit,
			hasMore: hits.length === limit,
			stats: {
				estimatedTotalHits: totalHits,
				processingTime: 0, // This will be set by BaseService
				facets
			}
		};
	}

	private processFacets(facetResults: SupabaseFacetResultType[]) {
		const facets: Array<{ facetName: string; facetHits: Array<{ ep: string; hits: number }> }> = [];

		// Group facets by type
		const seasonFacets = new Map<string, number>();
		const episodeFacets = new Map<string, number>();

		facetResults.forEach((facet) => {
			if (facet.facet_type === 'season') {
				seasonFacets.set(facet.facet_value, facet.count);
			} else if (facet.facet_type === 'episode') {
				episodeFacets.set(facet.facet_value, facet.count);
			}
		});

		// Convert to search facet format
		if (seasonFacets.size > 0) {
			const seasonHits = Array.from(seasonFacets.entries())
				.map(([key, value]) => ({ ep: key, hits: value }))
				.sort((a, b) => b.hits - a.hits)
				.slice(0, 9);

			facets.push({ facetName: 'season', facetHits: seasonHits });
		}

		if (episodeFacets.size > 0) {
			const episodeHits = Array.from(episodeFacets.entries())
				.map(([key, value]) => ({ ep: key, hits: value }))
				.sort((a, b) => b.hits - a.hits)
				.slice(0, 9);

			facets.push({ facetName: 'episode', facetHits: episodeHits });
		}

		return facets;
	}
}
