// Debounce utility for search input with configurable delay
export function debounce<T extends (...args: any[]) => any>(
	func: T,
	delay: number
): (...args: Parameters<T>) => void {
	let timeoutId: NodeJS.Timeout;

	return function (this: any, ...args: Parameters<T>) {
		clearTimeout(timeoutId);
		timeoutId = setTimeout(() => func.apply(this, args), delay);
	};
}

// Search-specific debounce with immediate execution for cached results
export class SearchDebouncer {
	private searchFn: (query: string) => Promise<any>;
	private cache: Map<string, any> = new Map();
	private pendingTimeout: NodeJS.Timeout | null = null;

	constructor(
		searchFn: (query: string) => Promise<any>,
		private delay = 500
	) {
		this.searchFn = searchFn;
	}

	async search(query: string): Promise<any> {
		const trimmedQuery = query.trim().toLowerCase();

		// Return cached result immediately if available
		if (this.cache.has(trimmedQuery)) {
			return this.cache.get(trimmedQuery);
		}

		// Clear any pending search
		if (this.pendingTimeout) {
			clearTimeout(this.pendingTimeout);
		}

		// Return a promise that resolves after debounce delay
		return new Promise((resolve, reject) => {
			this.pendingTimeout = setTimeout(async () => {
				try {
					const result = await this.searchFn(trimmedQuery);
					this.cache.set(trimmedQuery, result);

					// Limit cache size to prevent memory leaks
					if (this.cache.size > 100) {
						const firstEntry = this.cache.keys().next();
						if (!firstEntry.done && firstEntry.value) {
							this.cache.delete(firstEntry.value);
						}
					}

					resolve(result);
				} catch (error) {
					reject(error);
				}
			}, this.delay);
		});
	}

	clearCache(): void {
		this.cache.clear();
	}
}
