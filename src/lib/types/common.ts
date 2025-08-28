export interface ApiResponse<T> {
	data: T;
	error: string | null;
	loading: boolean;
}

export interface PaginatedResponse<T> {
	items: T[];
	total: number;
	page: number;
	limit: number;
	hasMore: boolean;
}

export interface CacheEntry<T> {
	data: T;
	timestamp: number;
	expiresIn: number;
}

export interface LoadingState {
	loading: boolean;
	error: string | null;
}

export type SortOrder = 'asc' | 'desc';

export interface SortOptions {
	field: string;
	order: SortOrder;
}
