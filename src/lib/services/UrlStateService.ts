import { BaseService } from './BaseService';
import { goto } from '$app/navigation';
import { browser } from '$app/environment';
import { UrlUtils } from '../utils/index';

export interface SearchUrlState {
	query: string;
	filters: string[];
	editedOnly: boolean;
	page?: number;
}

export interface NavigationOptions {
	keepFocus?: boolean;
	noScroll?: boolean;
	replaceState?: boolean;
	invalidateAll?: boolean;
}

export class UrlStateService extends BaseService {
	private readonly DEFAULT_OPTIONS: NavigationOptions = {
		keepFocus: true,
		noScroll: true,
		replaceState: true,
		invalidateAll: false
	};

	constructor() {
		super('UrlStateService', { enableLogging: false }); // Disable logging for URL operations
	}

	/**
	 * Parse search state from current URL
	 */
	parseSearchStateFromUrl(url?: string): SearchUrlState {
		try {
			const targetUrl = url || (browser ? window.location.href : '');
			if (!targetUrl) {
				return this.getEmptyState();
			}

			const urlParams = UrlUtils.parseQueryString(new URL(targetUrl).search);

			return {
				query: urlParams.s || '',
				filters: this.parseFiltersFromUrl(urlParams.f),
				editedOnly: urlParams.edited === 'true',
				page: urlParams.page ? parseInt(urlParams.page, 10) : undefined
			};
		} catch (error) {
			this.log('warn', 'Failed to parse URL state', { error, url });
			return this.getEmptyState();
		}
	}

	/**
	 * Update URL with search state
	 */
	async updateSearchUrl(
		state: Partial<SearchUrlState>,
		options: NavigationOptions = {}
	): Promise<void> {
		return this.executeWithErrorHandling(
			async () => {
				if (!browser) return;

				const currentState = this.parseSearchStateFromUrl();
				const newState = { ...currentState, ...state };
				const queryParams = this.buildSearchQueryParams(newState);

				const currentUrl = new URL(window.location.href);
				const newUrl = `${currentUrl.pathname}?${queryParams}`;

				// Only navigate if URL actually changed
				if (newUrl !== currentUrl.pathname + currentUrl.search) {
					await goto(newUrl, { ...this.DEFAULT_OPTIONS, ...options });
				}
			},
			'updateSearchUrl',
			{ state, options }
		);
	}

	/**
	 * Clear search URL parameters
	 */
	async clearSearchUrl(options: NavigationOptions = {}): Promise<void> {
		return this.executeWithErrorHandling(
			async () => {
				if (!browser) return;

				const currentUrl = new URL(window.location.href);
				await goto(currentUrl.pathname, { ...this.DEFAULT_OPTIONS, ...options });
			},
			'clearSearchUrl',
			{ options }
		);
	}

	/**
	 * Get URL for sharing search results
	 */
	buildShareableUrl(state: SearchUrlState, baseUrl?: string): string {
		try {
			const base = baseUrl || (browser ? window.location.origin : '');
			const queryParams = this.buildSearchQueryParams(state);
			return queryParams ? `${base}/?${queryParams}` : base;
		} catch (error) {
			this.log('warn', 'Failed to build shareable URL', { error, state, baseUrl });
			return baseUrl || (browser ? window.location.origin : '');
		}
	}

	/**
	 * Check if current URL has search parameters
	 */
	hasSearchParams(url?: string): boolean {
		try {
			const state = this.parseSearchStateFromUrl(url);
			return !!(state.query || state.filters.length > 0 || state.editedOnly);
		} catch (error) {
			this.log('warn', 'Failed to check search params', { error, url });
			return false;
		}
	}

	/**
	 * Navigate to episode page with context
	 */
	async navigateToEpisode(
		episodeId: string,
		context?: { timestamp?: string; searchQuery?: string },
		options: NavigationOptions = {}
	): Promise<void> {
		return this.executeWithErrorHandling(
			async () => {
				if (!browser) return;

				const params: Record<string, string> = {};
				if (context?.timestamp) params.t = context.timestamp;
				if (context?.searchQuery) params.q = context.searchQuery;

				const queryString = UrlUtils.buildQueryString(params);
				const url = `/ep/${episodeId}${queryString ? `?${queryString}` : ''}`;

				await goto(url, { ...this.DEFAULT_OPTIONS, ...options });
			},
			'navigateToEpisode',
			{ episodeId, context, options }
		);
	}

	private parseFiltersFromUrl(filterParam: string | undefined): string[] {
		if (!filterParam) return [];

		try {
			return filterParam
				.split(',')
				.map((f) => f.replace('=', ' = '))
				.filter((f) => f.length > 0);
		} catch {
			return [];
		}
	}

	private buildSearchQueryParams(state: SearchUrlState): string {
		const params: Record<string, unknown> = {};

		if (state.query?.trim()) {
			params.s = state.query.trim();
		}

		if (state.filters.length > 0) {
			params.f = state.filters.map((f) => f.replaceAll(' = ', '=')).join(',');
		}

		if (state.editedOnly) {
			params.edited = 'true';
		}

		if (state.page && state.page > 1) {
			params.page = state.page.toString();
		}

		return UrlUtils.buildQueryString(params);
	}

	private getEmptyState(): SearchUrlState {
		return {
			query: '',
			filters: [],
			editedOnly: false
		};
	}
}
