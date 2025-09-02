import { get } from '@vercel/edge-config';
import { randomQuery } from '../utils';
import type { CacheEntry } from '../types/common';
import type { SearchHitType, SearchStats } from '../types/search';
import { highlightSearchTerms } from './highlighting';

export interface CacheDataType {
	query: string;
	timestamp: number;
	expiresAt: number;
	result: {
		hits: SearchHitType[];
		stats: SearchStats;
		hasMore: boolean;
	};
}

export interface CacheResultType {
	hits: SearchHitType[];
	stats: SearchStats;
	hasMore: boolean;
	cached: boolean;
	source: 'static' | 'edge' | 'none';
}

export class Cache<T> {
	private cache = new Map<string, CacheEntry<T>>();
	private defaultTTL: number;

	constructor(defaultTTL: number = 5 * 60 * 1000) {
		this.defaultTTL = defaultTTL;
	}

	set(key: string, data: T, ttl?: number): void {
		const expiresIn = ttl ?? this.defaultTTL;
		const entry: CacheEntry<T> = {
			data,
			timestamp: Date.now(),
			expiresIn
		};
		this.cache.set(key, entry);
	}

	get(key: string): T | null {
		const entry = this.cache.get(key);
		if (!entry) return null;

		const now = Date.now();
		if (now - entry.timestamp > entry.expiresIn) {
			this.cache.delete(key);
			return null;
		}

		return entry.data;
	}

	has(key: string): boolean {
		return this.get(key) !== null;
	}

	delete(key: string): void {
		this.cache.delete(key);
	}

	clear(): void {
		this.cache.clear();
	}

	size(): number {
		this.cleanup();
		return this.cache.size;
	}

	private cleanup(): void {
		const now = Date.now();
		for (const [key, entry] of this.cache.entries()) {
			if (now - entry.timestamp > entry.expiresIn) {
				this.cache.delete(key);
			}
		}
	}
}

export const episodeCache = new Cache(60 * 60 * 1000);
export const transcriptCache = new Cache(30 * 60 * 1000);

/**
 * Check if a query is one of the predefined random queries
 */
export function isRandomQuery(query: string): boolean {
	return randomQuery.includes(query.toLowerCase());
}

/**
 * Generate cache key for Edge Config storage
 */
export function generateCacheKey(query: string, filter?: string[], editedOnly?: boolean): string {
	const baseKey = `search:${query.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
	const filterKey = filter && filter.length > 0 ? `:f:${filter.sort().join(',')}` : '';
	const editedKey = editedOnly ? ':edited' : '';
	return `${baseKey}${filterKey}${editedKey}`;
}

/**
 * Load cached search result from static file (for random queries)
 */
export async function loadStaticCache(query: string): Promise<CacheResultType | null> {
	const startTime = performance.now();

	try {
		// Generate filename same way as pre-warm script
		const fileName = query
			.toLowerCase()
			.replace(/[^a-z0-9]/g, '-')
			.replace(/-+/g, '-')
			.replace(/^-|-$/g, '');

		// In browser/server context, fetch from static cache
		const response = await fetch(`/cache/${fileName}.json`);

		if (!response.ok) {
			return null;
		}

		const cacheData: CacheDataType = await response.json();

		// Check if cache is expired
		if (Date.now() > cacheData.expiresAt) {
			console.warn(`Static cache expired for query: ${query}`);
			return null;
		}

		const cacheResponseTime = Math.round(performance.now() - startTime);

		// Apply highlighting to cached results
		const highlightedHits = cacheData.result.hits.map((hit) => ({
			...hit,
			highlightedLine: highlightSearchTerms(hit.line, query)
		}));

		return {
			...cacheData.result,
			hits: highlightedHits,
			stats: {
				...cacheData.result.stats,
				cacheHit: true,
				cacheResponseTime,
				cacheSource: 'static'
			},
			cached: true,
			source: 'static'
		};
	} catch (error) {
		console.warn(`Failed to load static cache for query: ${query}`, error);
		return null;
	}
}

/**
 * Load cached search result from Vercel Edge Config
 */
export async function loadEdgeCache(cacheKey: string): Promise<CacheResultType | null> {
	const startTime = performance.now();

	try {
		const cacheData = await get<CacheDataType>(cacheKey);

		if (!cacheData) {
			return null;
		}

		// Check if cache is expired
		if (Date.now() > cacheData.expiresAt) {
			console.warn(`Edge cache expired for key: ${cacheKey}`);
			return null;
		}

		const cacheResponseTime = Math.round(performance.now() - startTime);

		return {
			...cacheData.result,
			stats: {
				...cacheData.result.stats,
				cacheHit: true,
				cacheResponseTime,
				cacheSource: 'edge'
			},
			cached: true,
			source: 'edge'
		};
	} catch (error) {
		console.warn(`Failed to load edge cache for key: ${cacheKey}`, error);
		return null;
	}
}

/**
 * Determine if a query should be cached based on frequency/popularity
 */
export function shouldCache(query: string, stats?: SearchStats): boolean {
	// Always cache random queries (handled by static cache)
	if (isRandomQuery(query)) {
		return false; // Don't duplicate in edge cache
	}

	// Cache queries that return results and are longer than 2 characters
	return query.trim().length > 2 && (stats?.estimatedTotalHits ?? 0) > 0;
}

/**
 * Create cache data structure
 */
export function createCacheData(
	query: string,
	result: { hits: SearchHitType[]; stats: SearchStats; hasMore: boolean },
	ttlHours = 24
): CacheDataType {
	return {
		query,
		timestamp: Date.now(),
		expiresAt: Date.now() + ttlHours * 60 * 60 * 1000,
		result
	};
}

/**
 * Get cache statistics for monitoring
 */
export function getCacheStats() {
	return {
		randomQueries: randomQuery.length,
		staticCacheEnabled: true,
		edgeCacheEnabled: Boolean(process.env.EDGE_CONFIG)
	};
}
