import type { SearchParams, SearchHitType, SearchStats } from '../types/search';
import type { PaginatedResponse } from '../types/common';
import type { ISearchRepository } from '../repositories/SearchRepository';
import { SupabaseSearchRepository } from '../repositories/SearchRepository';
import { BaseService } from './BaseService';
import { validateSearchQuery, sanitizeSearchQuery } from '../utils/validation';
import { parseSearchQuery, buildPostgresQuery } from '../utils/queryParser';

export class SearchService extends BaseService {
	private repository: ISearchRepository | null = null;

	constructor(repository?: ISearchRepository) {
		super('SearchService');
		this.repository = repository || null;
	}

	private getRepository(): ISearchRepository {
		if (!this.repository) {
			this.repository = new SupabaseSearchRepository();
		}
		return this.repository;
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
				this.validateInput(query, validateSearchQuery, 'search query');
				const sanitizedQuery = sanitizeSearchQuery(query);

				return await this.executeSearch(sanitizedQuery, options);
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

		const repository = this.getRepository();
		return await repository.search(params);
	}
}

export const searchService = new SearchService();
