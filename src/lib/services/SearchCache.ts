// In-memory cache for search results with TTL and size limits
export interface CacheEntry<T> {
	data: T;
	timestamp: number;
	ttl: number;
}

export class SearchCache<T> {
	private cache = new Map<string, CacheEntry<T>>();
	private maxSize: number;
	private defaultTtl: number;

	constructor(maxSize = 100, defaultTtlMs = 5 * 60 * 1000) { // 5 minutes default
		this.maxSize = maxSize;
		this.defaultTtl = defaultTtlMs;
	}

	private generateKey(query: string, filters: string[], offset: number, editedOnly: boolean): string {
		return `${query.toLowerCase().trim()}|${filters.sort().join(',')}|${offset}|${editedOnly}`;
	}

	get(query: string, filters: string[], offset: number, editedOnly: boolean): T | null {
		const key = this.generateKey(query, filters, offset, editedOnly);
		const entry = this.cache.get(key);

		if (!entry) return null;

		// Check if expired
		if (Date.now() - entry.timestamp > entry.ttl) {
			this.cache.delete(key);
			return null;
		}

		return entry.data;
	}

	set(query: string, filters: string[], offset: number, editedOnly: boolean, data: T, ttlMs?: number): void {
		const key = this.generateKey(query, filters, offset, editedOnly);

		// Remove oldest entries if cache is full
		if (this.cache.size >= this.maxSize) {
			const firstEntry = this.cache.keys().next();
			if (!firstEntry.done && firstEntry.value) {
				this.cache.delete(firstEntry.value);
			}
		}

		this.cache.set(key, {
			data,
			timestamp: Date.now(),
			ttl: ttlMs || this.defaultTtl
		});
	}

	clear(): void {
		this.cache.clear();
	}

	// For popular queries, cache longer
	setPopular(query: string, filters: string[], offset: number, editedOnly: boolean, data: T): void {
		this.set(query, filters, offset, editedOnly, data, 15 * 60 * 1000); // 15 minutes
	}
}

// Global cache instances
export const searchResultCache = new SearchCache(200, 5 * 60 * 1000); // 5 minute cache
export const facetCache = new SearchCache(50, 10 * 60 * 1000);        // 10 minute cache for facets