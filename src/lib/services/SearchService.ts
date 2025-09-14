import type { SearchParams, SearchHitType, SearchStats } from '../types/search';
import type { PaginatedResponse } from '../types/common';
import type { ISearchRepository } from '../repositories/SearchRepository';
import { BaseService } from './BaseService';
import { CacheService, type CacheSourceType } from './CacheService';
import { SearchProviderFactory } from './SearchProviderFactory';
import { validateSearchQuery, sanitizeSearchQuery } from '../utils/validation';
import { parseSearchQuery, buildPostgresQuery } from '../utils/queryParser';

export class SearchService extends BaseService {
	private repository: ISearchRepository | null = null;
	private readonly cacheService: CacheService;

	constructor(repository?: ISearchRepository, cacheService?: CacheService) {
		super('SearchService');
		this.repository = repository || null;
		this.cacheService = cacheService || new CacheService();
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
		return this.executeWithErrorHandling(
			async () => {
				// Validate and sanitize input
				this.validateInput(query, validateSearchQuery, 'search query');
				const sanitizedQuery = sanitizeSearchQuery(query);

				// Check cache for initial requests only
				if ((options.offset || 0) === 0) {
					const cachedResult = await this.getCachedResult(sanitizedQuery, options);
					if (cachedResult) {
						return this.formatCachedResult(cachedResult, sanitizedQuery, options);
					}
				}

				// Execute search
				const result = await this.executeSearch(sanitizedQuery, options);

				// Cache result if appropriate
				if ((options.offset || 0) === 0 && this.shouldCache(result)) {
					await this.setCachedResult(sanitizedQuery, options, result);
				}

				return result;
			},
			'search',
			{
				query: query.substring(0, 50),
				filters: options.filter?.length || 0,
				offset: options.offset || 0,
				editedOnly: options.editedOnly || false
			}
		);
	}

	async searchMore(
		query: string,
		currentHits: SearchHitType[],
		options: {
			filter?: string[];
			editedOnly?: boolean;
		} = {}
	): Promise<{ hits: SearchHitType[]; hasMore: boolean; stats: SearchStats }> {
		return this.executeWithErrorHandling(
			async () => {
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
			},
			'searchMore',
			{ query: query.substring(0, 50), currentHits: currentHits.length }
		);
	}

	private async executeSearch(
		sanitizedQuery: string,
		options: { filter?: string[]; offset?: number; editedOnly?: boolean }
	): Promise<PaginatedResponse<SearchHitType> & { stats: SearchStats }> {
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

		return result;
	}

	private async getCachedResult(
		query: string,
		options: { filter?: string[]; editedOnly?: boolean }
	): Promise<{
		hits: SearchHitType[];
		stats: SearchStats;
		hasMore: boolean;
		source: CacheSourceType;
	} | null> {
		try {
			const cacheKey = this.cacheService.generateKey('search', {
				query,
				filters: options.filter || [],
				editedOnly: options.editedOnly || false
			});

			// Determine cache sources to check
			const sources: CacheSourceType[] =
				this.isRandomQuery(query) && !options.filter?.length && !options.editedOnly
					? ['static', 'edge', 'memory']
					: ['edge', 'memory'];

			const cached = await this.cacheService.get<{
				hits: SearchHitType[];
				stats: SearchStats;
				hasMore: boolean;
			}>(cacheKey, sources);

			if (cached) {
				return {
					...cached.value,
					source: cached.source
				};
			}

			return null;
		} catch (error) {
			this.log('warn', 'Cache retrieval failed', { error });
			return null;
		}
	}

	private async setCachedResult(
		query: string,
		options: { filter?: string[]; editedOnly?: boolean },
		result: PaginatedResponse<SearchHitType> & { stats: SearchStats }
	): Promise<void> {
		try {
			// Don't cache random queries (they're handled by static cache)
			if (this.isRandomQuery(query)) {
				return;
			}

			const cacheKey = this.cacheService.generateKey('search', {
				query,
				filters: options.filter || [],
				editedOnly: options.editedOnly || false
			});

			const cacheData = {
				hits: result.items,
				stats: result.stats,
				hasMore: result.hasMore
			};

			await this.cacheService.set(cacheKey, cacheData, {
				ttlMs: 300000, // 5 minutes
				sources: ['memory', 'edge']
			});
		} catch (error) {
			this.log('warn', 'Cache storage failed', { error });
		}
	}

	private formatCachedResult(
		cachedResult: {
			hits: SearchHitType[];
			stats: SearchStats;
			hasMore: boolean;
			source: CacheSourceType;
		},
		query: string,
		options: { filter?: string[]; editedOnly?: boolean }
	): PaginatedResponse<SearchHitType> & { stats: SearchStats } {
		// Update stats to indicate cache hit
		const stats: SearchStats = {
			...cachedResult.stats,
			cacheHit: true,
			cacheSource: cachedResult.source as 'static' | 'edge'
		};

		this.log('info', 'Search cache hit', {
			query,
			source: cachedResult.source,
			hits: cachedResult.hits.length,
			filters: options.filter?.length || 0,
			editedOnly: options.editedOnly || false
		});

		return {
			items: cachedResult.hits,
			total: stats.estimatedTotalHits,
			page: 1,
			limit: cachedResult.hits.length,
			hasMore: cachedResult.hasMore,
			stats
		};
	}

	private shouldCache(result: PaginatedResponse<SearchHitType> & { stats: SearchStats }): boolean {
		// Cache if we have results and processing time is reasonable
		return result.items.length > 0 && result.stats.processingTime < 5000;
	}

	private isRandomQuery(query: string): boolean {
		const randomWords = ['random', 'surprise', 'any', 'anything'];
		const normalizedQuery = query.toLowerCase().trim();
		return randomWords.includes(normalizedQuery);
	}
}

export const searchService = new SearchService();
