import { describe, it, expect } from 'vitest';
import { validateSearchParams, sanitizeSearchQuery } from './validation';

describe('validation utils', () => {
	describe('validateSearchParams', () => {
		it('should validate correct search parameters', () => {
			const params = {
				query: 'test query',
				filter: [],
				offset: 20,
				editedOnly: false
			};

			const result = validateSearchParams(params);
			expect(result.valid).toBe(true);
		});

		it('should reject empty query', () => {
			const params = {
				query: '',
				filter: [],
				offset: 0,
				editedOnly: false
			};

			const result = validateSearchParams(params);
			expect(result.valid).toBe(false);
		});
	});

	describe('sanitizeSearchQuery', () => {
		it('should sanitize basic query', () => {
			const result = sanitizeSearchQuery('test query');
			expect(typeof result).toBe('string');
		});

		it('should handle empty string', () => {
			const result = sanitizeSearchQuery('');
			expect(result).toBe('');
		});
	});
});
