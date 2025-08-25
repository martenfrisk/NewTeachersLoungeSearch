import type { SearchParams, SearchHitType, SearchStats } from '../types/search';
import type { PaginatedResponse } from '../types/common';
import type { ISearchRepository } from '../repositories/SearchRepository';
import { MeiliSearchRepository } from '../repositories/SearchRepository';
import { searchCache } from '../utils/cache';
import { validateSearchQuery, sanitizeSearchQuery } from '../utils/validation';
import { SearchError, createErrorHandler } from '../utils/errors';

export class SearchService {
	private repository: ISearchRepository;
	private readonly handleError = createErrorHandler('SearchService');

	constructor(repository?: ISearchRepository) {
		this.repository = repository || new MeiliSearchRepository();
	}

	async search(
		query: string,
		options: {
			filter?: string[];
			offset?: number;
			editedOnly?: boolean;
			useCache?: boolean;
		} = {}
	): Promise<PaginatedResponse<SearchHitType> & { stats: SearchStats }> {
		try {
			// Validate and sanitize query
			const validation = validateSearchQuery(query);
			if (!validation.valid) {
				throw new SearchError(validation.error!);
			}

			const sanitizedQuery = sanitizeSearchQuery(query);
			const params: SearchParams = {
				query: sanitizedQuery,
				filter: options.filter || [],
				offset: options.offset || 20,
				editedOnly: options.editedOnly || false
			};

			// Check cache first
			const cacheKey = this.getCacheKey(params);
			if (options.useCache !== false) {
				const cached = searchCache.get(cacheKey) as
					| (PaginatedResponse<SearchHitType> & { stats: SearchStats })
					| null;
				if (cached) {
					return cached;
				}
			}

			// Perform search
			const result = await this.repository.search(params);

			// Cache the result
			if (options.useCache !== false) {
				searchCache.set(cacheKey, result, 5 * 60 * 1000); // 5 minutes
			}

			return result;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	async searchMore(
		query: string,
		currentHits: SearchHitType[],
		options: {
			filter?: string[];
			editedOnly?: boolean;
		} = {}
	): Promise<{ hits: SearchHitType[]; hasMore: boolean; stats: SearchStats }> {
		try {
			const nextOffset = currentHits.length + 20;
			const result = await this.search(query, {
				...options,
				offset: nextOffset,
				useCache: false // Don't cache pagination requests
			});

			return {
				hits: [...currentHits, ...result.items],
				hasMore: result.hasMore,
				stats: result.stats
			};
		} catch (error) {
			throw this.handleError(error);
		}
	}

	clearCache(): void {
		searchCache.clear();
	}

	private getCacheKey(params: SearchParams): string {
		return `search_${params.query}_${params.filter.join(',')}_${params.offset}_${params.editedOnly}`;
	}
}

// Global singleton instance
export const searchService = new SearchService();
