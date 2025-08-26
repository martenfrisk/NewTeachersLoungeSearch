import type { SearchParams } from '../types/search';

export function validateSearchQuery(query: string): { valid: boolean; error?: string } {
	if (!query || typeof query !== 'string') {
		return { valid: false, error: 'Search query is required and must be a string' };
	}

	if (query.trim().length === 0) {
		return { valid: false, error: 'Search query cannot be empty' };
	}

	if (query.length > 500) {
		return { valid: false, error: 'Search query is too long (max 500 characters)' };
	}

	return { valid: true };
}

export function validateSearchParams(params: Partial<SearchParams>): {
	valid: boolean;
	error?: string;
} {
	if (params.query !== undefined) {
		const queryValidation = validateSearchQuery(params.query);
		if (!queryValidation.valid) {
			return queryValidation;
		}
	}

	if (params.offset !== undefined && (params.offset < 0 || params.offset > 10000)) {
		return { valid: false, error: 'Offset must be between 0 and 10000' };
	}

	if (params.filter && Array.isArray(params.filter)) {
		if (params.filter.length > 50) {
			return { valid: false, error: 'Too many filters (max 50)' };
		}
	}

	return { valid: true };
}

export function sanitizeSearchQuery(query: string): string {
	return query
		.trim()
		.replace(/[<>"'&]/g, '') // Remove potentially dangerous characters
		.replace(/\s+/g, ' ') // Normalize multiple spaces to single spaces
		.substring(0, 500); // Limit length
}

export function validateEmail(email: string): boolean {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email);
}

export function validateTimestamp(timestamp: string): boolean {
	const timeRegex = /^\d{1,2}:\d{2}:\d{2}$/;
	return timeRegex.test(timestamp);
}
