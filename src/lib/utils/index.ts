// Comprehensive utility functions consolidated for better maintainability

// Re-export specific utilities for backward compatibility
export * from './errors';
export * from './highlighting';
export * from './queryParser';
export * from './titleNormalization';
export * from './audioSync';
export * from './speakerUtils';

// Validation utilities
import {
	validateSearchQuery,
	validateSearchParams,
	validateEmail,
	validateTimestamp,
	sanitizeSearchQuery
} from './validation';

export const ValidationUtils = {
	searchQuery: validateSearchQuery,
	searchParams: validateSearchParams,
	email: validateEmail,
	timestamp: validateTimestamp,
	sanitizeSearchQuery
} as const;

// String formatting utilities
export const StringUtils = {
	formatTime(seconds: number): string {
		if (isNaN(seconds)) return '0:00';
		const minutes = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${minutes}:${secs.toString().padStart(2, '0')}`;
	},

	formatTimeWithHours(seconds: number): string {
		if (isNaN(seconds)) return '0:00:00';
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		const secs = Math.floor(seconds % 60);
		return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
	},

	formatDuration(milliseconds: number): string {
		const seconds = Math.floor(milliseconds / 1000);
		if (seconds < 60) return `${seconds}s`;
		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = seconds % 60;
		if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
		const hours = Math.floor(minutes / 60);
		const remainingMinutes = minutes % 60;
		return `${hours}h ${remainingMinutes}m`;
	},

	truncate(text: string, maxLength: number, suffix: string = '...'): string {
		if (text.length <= maxLength) return text;
		return text.substring(0, maxLength - suffix.length) + suffix;
	},

	capitalize(text: string): string {
		return text.charAt(0).toUpperCase() + text.slice(1);
	},

	slugify(text: string): string {
		return text
			.toLowerCase()
			.replace(/[^\w\s-]/g, '')
			.replace(/[\s_-]+/g, '-')
			.replace(/^-+|-+$/g, '');
	}
} as const;

// Array utilities
export const ArrayUtils = {
	unique<T>(array: T[]): T[] {
		return [...new Set(array)];
	},

	groupBy<T, K extends string | number | symbol>(
		array: T[],
		keyFn: (item: T) => K
	): Record<K, T[]> {
		return array.reduce(
			(groups, item) => {
				const key = keyFn(item);
				if (!groups[key]) {
					groups[key] = [];
				}
				groups[key].push(item);
				return groups;
			},
			{} as Record<K, T[]>
		);
	},

	chunk<T>(array: T[], size: number): T[][] {
		const chunks: T[][] = [];
		for (let i = 0; i < array.length; i += size) {
			chunks.push(array.slice(i, i + size));
		}
		return chunks;
	},

	shuffle<T>(array: T[]): T[] {
		const shuffled = [...array];
		for (let i = shuffled.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
		}
		return shuffled;
	}
} as const;

// Object utilities
export const ObjectUtils = {
	pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
		const result = {} as Pick<T, K>;
		keys.forEach((key) => {
			if (key in obj) {
				result[key] = obj[key];
			}
		});
		return result;
	},

	omit<T, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
		const result = { ...obj };
		keys.forEach((key) => {
			delete result[key];
		});
		return result;
	},

	isEmpty(obj: unknown): boolean {
		if (obj === null || obj === undefined) return true;
		if (Array.isArray(obj)) return obj.length === 0;
		if (typeof obj === 'object') return Object.keys(obj).length === 0;
		if (typeof obj === 'string') return obj.trim() === '';
		return false;
	},

	deepMerge<T extends object>(target: T, source: Partial<T>): T {
		const result = { ...target };

		Object.keys(source).forEach((key) => {
			const sourceValue = source[key as keyof T];
			const targetValue = result[key as keyof T];

			if (
				sourceValue &&
				typeof sourceValue === 'object' &&
				!Array.isArray(sourceValue) &&
				targetValue &&
				typeof targetValue === 'object' &&
				!Array.isArray(targetValue)
			) {
				result[key as keyof T] = this.deepMerge(
					targetValue as object,
					sourceValue as object
				) as T[keyof T];
			} else if (sourceValue !== undefined) {
				result[key as keyof T] = sourceValue as T[keyof T];
			}
		});

		return result;
	}
} as const;

// URL utilities
export const UrlUtils = {
	parseQueryString(search: string): Record<string, string> {
		const params = new URLSearchParams(search);
		const result: Record<string, string> = {};
		for (const [key, value] of params) {
			result[key] = value;
		}
		return result;
	},

	buildQueryString(params: Record<string, unknown>): string {
		const urlParams = new URLSearchParams();
		Object.entries(params).forEach(([key, value]) => {
			if (value !== undefined && value !== null && value !== '') {
				urlParams.set(key, String(value));
			}
		});
		return urlParams.toString();
	},

	isValidUrl(url: string): boolean {
		try {
			new URL(url);
			return true;
		} catch {
			return false;
		}
	}
} as const;

// Performance utilities
export const PerformanceUtils = {
	debounce<T extends (...args: unknown[]) => unknown>(
		func: T,
		waitMs: number
	): (...args: Parameters<T>) => void {
		let timeoutId: ReturnType<typeof setTimeout>;
		return (...args: Parameters<T>) => {
			clearTimeout(timeoutId);
			timeoutId = setTimeout(() => func(...args), waitMs);
		};
	},

	throttle<T extends (...args: unknown[]) => unknown>(
		func: T,
		limitMs: number
	): (...args: Parameters<T>) => void {
		let inThrottle: boolean;
		return (...args: Parameters<T>) => {
			if (!inThrottle) {
				func(...args);
				inThrottle = true;
				setTimeout(() => (inThrottle = false), limitMs);
			}
		};
	},

	async measureAsync<T>(
		operation: () => Promise<T>,
		label?: string
	): Promise<{ result: T; duration: number }> {
		const start = performance.now();
		try {
			const result = await operation();
			const duration = performance.now() - start;
			if (label) {
				console.log(`${label}: ${duration.toFixed(2)}ms`);
			}
			return { result, duration };
		} catch (error) {
			const duration = performance.now() - start;
			if (label) {
				console.error(`${label} failed after: ${duration.toFixed(2)}ms`);
			}
			throw error;
		}
	}
} as const;

// Type guards
export const TypeGuards = {
	isString(value: unknown): value is string {
		return typeof value === 'string';
	},

	isNumber(value: unknown): value is number {
		return typeof value === 'number' && !isNaN(value);
	},

	isObject(value: unknown): value is Record<string, unknown> {
		return value !== null && typeof value === 'object' && !Array.isArray(value);
	},

	isArray(value: unknown): value is unknown[] {
		return Array.isArray(value);
	},

	isFunction(value: unknown): value is (...args: unknown[]) => unknown {
		return typeof value === 'function';
	},

	isNonEmptyString(value: unknown): value is string {
		return this.isString(value) && value.trim().length > 0;
	}
} as const;
