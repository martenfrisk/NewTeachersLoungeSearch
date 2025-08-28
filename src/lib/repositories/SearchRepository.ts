import type { SearchParams, SearchStats, SearchHitType } from '../types/search';
import type { PaginatedResponse } from '../types/common';
import { SearchError, NetworkError, createErrorHandler } from '../utils/errors';
import { validateSearchParams } from '../utils/validation';
import { highlightSearchTerms } from '../utils/highlighting';

export interface ISearchRepository {
	search(params: SearchParams): Promise<PaginatedResponse<SearchHitType> & { stats: SearchStats }>;
}

export class SupabaseSearchRepository implements ISearchRepository {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	private supabase: any = null;
	private readonly handleError = createErrorHandler('SupabaseSearchRepository');

	constructor() {
		// Dynamic import to avoid issues with SSR/client-side differences
		this.initializeSupabase();
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

			const validation = validateSearchParams(params);
			if (!validation.valid) {
				throw new SearchError(validation.error!);
			}

			const { query, originalQuery, filter, offset, editedOnly } = params;

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

			// Use optimized FTS function - track actual response time
			const searchStart = performance.now();
			const { data: searchResults, error: searchError } = await this.supabase.rpc(
				'optimized_search_transcripts',
				{
					search_query: query,
					season_filter: seasonFilters.length > 0 ? seasonFilters : null,
					episode_filter: episodeFilters.length > 0 ? episodeFilters : null,
					edited_only_filter: editedOnly,
					limit_count: params.limit || 20,
					offset_count: offset
				}
			);
			const searchTime = performance.now() - searchStart;

			if (searchError) {
				throw new SearchError(`Supabase search error: ${searchError.message}`);
			}

			// Get facets
			const facetStart = performance.now();
			const { data: facetResults, error: facetError } = await this.supabase.rpc(
				'optimized_search_facets',
				{
					search_query: query,
					edited_only_filter: editedOnly
				}
			);
			const facetTime = performance.now() - facetStart;

			if (facetError) {
				console.warn('Facet query error:', facetError.message);
			}
			// Process results
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
					highlightedLine: originalQuery
						? highlightSearchTerms(result.line, originalQuery)
						: result.line,
					episode: result.episode,
					edited: result.edited
				})
			);

			// Process facets and prepare final result
			const facets = this.processFacets(facetResults || []);
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
					processingTime: Math.round(searchTime + facetTime),
					facets
				}
			};

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
