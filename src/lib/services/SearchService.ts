import type { SearchParams, SearchHitType, SearchStats } from '../types/search';
import type { PaginatedResponse } from '../types/common';
import type { ISearchRepository } from '../repositories/SearchRepository';
import { SearchProviderFactory } from './SearchProviderFactory';
import { validateSearchQuery, sanitizeSearchQuery } from '../utils/validation';
import { parseSearchQuery, buildPostgresQuery } from '../utils/queryParser';
import { SearchError, createErrorHandler } from '../utils/errors';
import {
	isRandomQuery,
	loadStaticCache,
	loadEdgeCache,
	generateCacheKey,
	shouldCache,
	createCacheData,
	type CacheResultType
} from '../utils/cache';

export class SearchService {
	private repository: ISearchRepository | null = null;
	private readonly handleError = createErrorHandler('SearchService');

	constructor(repository?: ISearchRepository) {
		// Allow injection of repository for testing
		this.repository = repository || null;
	}

	private async getRepository(): Promise<ISearchRepository> {
		if (this.repository) {
			return this.repository;
		}
		return await SearchProviderFactory.createSearchRepository();
	}

	async search(
		query: string,
		options: {
			filter?: string[];
			offset?: number;
			editedOnly?: boolean;
		} = {}
	): Promise<PaginatedResponse<SearchHitType> & { stats: SearchStats }> {
		try {
			const validation = validateSearchQuery(query);
			if (!validation.valid) {
				throw new SearchError(validation.error!);
			}

			const sanitizedQuery = sanitizeSearchQuery(query);

			// Skip caching for paginated requests (offset > 0)
			if ((options.offset || 0) === 0) {
				const cachedResult = await this.getCachedResult(sanitizedQuery, options);
				if (cachedResult) {
					// Log cache hit for Vercel analytics
					console.log(
						JSON.stringify({
							event: 'search_cache_hit',
							query: sanitizedQuery,
							source: cachedResult.source,
							responseTime: cachedResult.stats.cacheResponseTime,
							hits: cachedResult.hits.length,
							filters: options.filter?.length || 0,
							editedOnly: options.editedOnly || false,
							timestamp: new Date().toISOString()
						})
					);

					return {
						items: cachedResult.hits,
						total: cachedResult.stats.estimatedTotalHits,
						page: 1,
						limit: cachedResult.hits.length,
						hasMore: cachedResult.hasMore,
						stats: cachedResult.stats
					};
				}
			}

			const parsedQuery = parseSearchQuery(sanitizedQuery);
			const postgresQuery = buildPostgresQuery(parsedQuery);

			const params: SearchParams = {
				query: postgresQuery,
				originalQuery: sanitizedQuery,
				filter: options.filter || [],
				offset: options.offset || 0,
				editedOnly: options.editedOnly || false
			};

			const repository = await this.getRepository();
			const result = await repository.search(params);

			// Mark as non-cached result
			result.stats = {
				...result.stats,
				cacheHit: false,
				cacheSource: 'none'
			};

			// Log cache miss for Vercel analytics
			console.log(
				JSON.stringify({
					event: 'search_cache_miss',
					query: sanitizedQuery,
					source: 'database',
					responseTime: result.stats.processingTime,
					hits: result.items.length,
					filters: options.filter?.length || 0,
					editedOnly: options.editedOnly || false,
					offset: options.offset || 0,
					willCache: shouldCache(sanitizedQuery, result.stats),
					timestamp: new Date().toISOString()
				})
			);

			// Cache the result if it's a fresh search (offset = 0) and should be cached
			if ((options.offset || 0) === 0 && shouldCache(sanitizedQuery, result.stats)) {
				await this.setCachedResult(sanitizedQuery, options, {
					hits: result.items,
					stats: result.stats,
					hasMore: result.hasMore
				});
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
			const nextOffset = currentHits.length;
			const result = await this.search(query, {
				...options,
				offset: nextOffset
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

	private async getCachedResult(
		query: string,
		options: { filter?: string[]; editedOnly?: boolean }
	): Promise<CacheResultType | null> {
		try {
			// First try static cache for random queries
			if (isRandomQuery(query) && !options.filter?.length && !options.editedOnly) {
				const staticResult = await loadStaticCache(query);
				if (staticResult) {
					return staticResult;
				}
			}

			// Try edge cache for other queries
			const cacheKey = generateCacheKey(query, options.filter, options.editedOnly);
			return await loadEdgeCache(cacheKey);
		} catch (error) {
			console.warn('Failed to load cached result:', error);
			return null;
		}
	}

	private async setCachedResult(
		query: string,
		options: { filter?: string[]; editedOnly?: boolean },
		result: { hits: SearchHitType[]; stats: SearchStats; hasMore: boolean }
	): Promise<void> {
		try {
			// Only cache to Edge Config (don't duplicate random queries in static cache)
			if (isRandomQuery(query)) {
				return; // Random queries are handled by static cache
			}

			const cacheKey = generateCacheKey(query, options.filter, options.editedOnly);
			const cacheData = createCacheData(query, result);

			// Note: Setting to Edge Config requires server-side implementation
			// This is a placeholder for the actual Edge Config set operation
			// In practice, you'd need to implement an API endpoint to set cache values
			console.log(`Would cache result for key: ${cacheKey}`, cacheData);
		} catch (error) {
			console.warn('Failed to cache result:', error);
		}
	}
}

export const searchService = new SearchService();
