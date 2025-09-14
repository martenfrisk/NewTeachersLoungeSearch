import { BaseService } from './BaseService';
import { CacheError } from '../utils/errors';

interface CacheItem<T = unknown> {
	value: T;
	expiresAt: number;
	source: CacheSourceType;
}

export type CacheSourceType = 'static' | 'edge' | 'memory' | 'none';

interface CacheBackend {
	get<T>(key: string): Promise<T | null>;
	set<T>(key: string, value: T, ttlMs?: number): Promise<void>;
	delete(key: string): Promise<void>;
	clear(): Promise<void>;
}

class MemoryCacheBackend implements CacheBackend {
	private cache = new Map<string, CacheItem>();

	async get<T>(key: string): Promise<T | null> {
		const item = this.cache.get(key) as CacheItem<T> | undefined;
		if (!item) return null;

		if (Date.now() > item.expiresAt) {
			this.cache.delete(key);
			return null;
		}

		return item.value;
	}

	async set<T>(key: string, value: T, ttlMs: number = 300000): Promise<void> {
		this.cache.set(key, {
			value,
			expiresAt: Date.now() + ttlMs,
			source: 'memory'
		});
	}

	async delete(key: string): Promise<void> {
		this.cache.delete(key);
	}

	async clear(): Promise<void> {
		this.cache.clear();
	}
}

class EdgeCacheBackend implements CacheBackend {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	async get<T>(_key: string): Promise<T | null> {
		try {
			// This would integrate with Vercel Edge Config
			// For now, return null to indicate cache miss
			return null;
		} catch {
			return null;
		}
	}

	async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
		try {
			// This would integrate with Vercel Edge Config
			// For now, this is a no-op
			console.log(`Would cache to edge: ${key}`, { value, ttlMs });
		} catch (error) {
			throw new CacheError(`Failed to set edge cache: ${error}`);
		}
	}

	async delete(key: string): Promise<void> {
		console.log(`Would delete from edge cache: ${key}`);
	}

	async clear(): Promise<void> {
		console.log('Would clear edge cache');
	}
}

class StaticCacheBackend implements CacheBackend {
	private staticData: Map<string, unknown> = new Map();

	constructor() {
		this.loadStaticData();
	}

	private async loadStaticData(): Promise<void> {
		// This would load pre-built static cache data
		// For now, this is a placeholder
	}

	async get<T>(key: string): Promise<T | null> {
		return (this.staticData.get(key) as T) || null;
	}

	async set(): Promise<void> {
		// Static cache is read-only
		throw new CacheError('Cannot write to static cache');
	}

	async delete(): Promise<void> {
		throw new CacheError('Cannot delete from static cache');
	}

	async clear(): Promise<void> {
		throw new CacheError('Cannot clear static cache');
	}
}

export class CacheService extends BaseService {
	private backends: Record<CacheSourceType, CacheBackend>;
	private readonly defaultTtl = 300000; // 5 minutes

	constructor() {
		super('CacheService');
		this.backends = {
			memory: new MemoryCacheBackend(),
			edge: new EdgeCacheBackend(),
			static: new StaticCacheBackend(),
			none: new MemoryCacheBackend() // fallback
		};
	}

	async get<T>(
		key: string,
		sources: CacheSourceType[] = ['static', 'edge', 'memory']
	): Promise<{ value: T; source: CacheSourceType } | null> {
		return this.executeWithErrorHandling(
			async () => {
				for (const source of sources) {
					const backend = this.backends[source];
					const value = await backend.get<T>(key);

					if (value !== null) {
						this.log('debug', 'Cache hit', { key, source });
						return { value, source };
					}
				}

				this.log('debug', 'Cache miss', { key, searchedSources: sources });
				return null;
			},
			'get',
			{ key, sources }
		);
	}

	async set<T>(
		key: string,
		value: T,
		options: {
			ttlMs?: number;
			sources?: CacheSourceType[];
		} = {}
	): Promise<void> {
		const { ttlMs = this.defaultTtl, sources = ['memory'] } = options;

		return this.executeWithErrorHandling(
			async () => {
				const promises = sources.map(async (source) => {
					try {
						await this.backends[source].set(key, value, ttlMs);
						this.log('debug', 'Cache set', { key, source, ttl: ttlMs });
					} catch (error) {
						this.log('warn', 'Failed to set cache', { key, source, error });
					}
				});

				await Promise.allSettled(promises);
			},
			'set',
			{ key, ttlMs, sources }
		);
	}

	async delete(key: string, sources: CacheSourceType[] = ['memory', 'edge']): Promise<void> {
		return this.executeWithErrorHandling(
			async () => {
				const promises = sources.map(async (source) => {
					try {
						await this.backends[source].delete(key);
						this.log('debug', 'Cache deleted', { key, source });
					} catch (error) {
						this.log('warn', 'Failed to delete cache', { key, source, error });
					}
				});

				await Promise.allSettled(promises);
			},
			'delete',
			{ key, sources }
		);
	}

	async clear(sources: CacheSourceType[] = ['memory']): Promise<void> {
		return this.executeWithErrorHandling(
			async () => {
				const promises = sources.map(async (source) => {
					try {
						await this.backends[source].clear();
						this.log('info', 'Cache cleared', { source });
					} catch (error) {
						this.log('warn', 'Failed to clear cache', { source, error });
					}
				});

				await Promise.allSettled(promises);
			},
			'clear',
			{ sources }
		);
	}

	generateKey(prefix: string, params: Record<string, unknown>): string {
		const paramString = Object.entries(params)
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([key, value]) => `${key}:${JSON.stringify(value)}`)
			.join('|');

		return `${prefix}:${this.hashString(paramString)}`;
	}

	private hashString(str: string): string {
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			const char = str.charCodeAt(i);
			hash = (hash << 5) - hash + char;
			hash = hash & hash; // Convert to 32-bit integer
		}
		return Math.abs(hash).toString(36);
	}
}

export const cacheService = new CacheService();
