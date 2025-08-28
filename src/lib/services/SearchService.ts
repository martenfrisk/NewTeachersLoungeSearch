import type { SearchParams, SearchHitType, SearchStats } from '../types/search';
import type { PaginatedResponse } from '../types/common';
import type { ISearchRepository } from '../repositories/SearchRepository';
import { SearchProviderFactory } from './SearchProviderFactory';
import { validateSearchQuery, sanitizeSearchQuery } from '../utils/validation';
import { parseSearchQuery, buildPostgresQuery } from '../utils/queryParser';
import { SearchError, createErrorHandler } from '../utils/errors';

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
			return await repository.search(params);
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
}

export const searchService = new SearchService();
