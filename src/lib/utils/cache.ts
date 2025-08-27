import type { CacheEntry } from '../types/common';

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

export const searchCache = new Cache(5 * 60 * 1000);
export const episodeCache = new Cache(60 * 60 * 1000);
export const transcriptCache = new Cache(30 * 60 * 1000);
