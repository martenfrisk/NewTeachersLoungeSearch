import { describe, it, expect, vi } from 'vitest';
import {
	debounceFn,
	highlight,
	secToMins,
	getRandomInt,
	timeToUrl,
	newRandom,
	createSearchParams,
	searchMeili,
	randomQuery
} from './utils';

describe('utils', () => {
	describe('debounceFn', () => {
		it('should return a debounce function', () => {
			const mockFn = vi.fn();
			const debouncedFn = debounceFn(100, mockFn);

			expect(typeof debouncedFn).toBe('function');
		});

		it('should delay function execution', async () => {
			const mockFn = vi.fn();
			const debouncedFn = debounceFn(10, mockFn);

			debouncedFn('test');

			// Should not be called immediately
			expect(mockFn).not.toHaveBeenCalled();

			// Wait for the debounce delay
			await new Promise((resolve) => setTimeout(resolve, 15));

			expect(mockFn).toHaveBeenCalledTimes(1);
			expect(mockFn).toHaveBeenCalledWith('test');
		});
	});

	describe('highlight', () => {
		it('should highlight search terms in text', () => {
			const result = highlight('test', 'This is a test string');
			expect(result).toBe('This is a <em>test</em> string');
		});

		it('should be case insensitive', () => {
			const result = highlight('TEST', 'This is a test string');
			expect(result).toBe('This is a <em>test</em> string');
		});

		it('should highlight multiple occurrences', () => {
			const result = highlight('test', 'test TEST test');
			expect(result).toBe('<em>test</em> <em>TEST</em> <em>test</em>');
		});

		it('should handle special regex characters', () => {
			const result = highlight('test.', 'This is a test. string');
			expect(result).toBe('This is a <em>test.</em> string');
		});

		it('should return original string if needle not found', () => {
			const result = highlight('xyz', 'This is a test string');
			expect(result).toBe('This is a test string');
		});
	});

	describe('secToMins', () => {
		it('should convert seconds to minutes format', () => {
			expect(secToMins(90)).toBe('1:50');
			expect(secToMins(120)).toBe('2:00');
			expect(secToMins(65)).toBe('1:08');
		});

		it('should handle zero seconds', () => {
			expect(secToMins(0)).toBe('0:00');
		});

		it('should handle fractional seconds', () => {
			expect(secToMins(75.5)).toBe('1:26');
		});

		it('should handle large values', () => {
			expect(secToMins(3661)).toBe('61:02'); // Over an hour
		});
	});

	describe('getRandomInt', () => {
		it('should return number within range', () => {
			const result = getRandomInt(10);
			expect(result).toBeGreaterThanOrEqual(0);
			expect(result).toBeLessThan(10);
			expect(Number.isInteger(result)).toBe(true);
		});

		it('should handle max value of 1', () => {
			const result = getRandomInt(1);
			expect(result).toBe(0);
		});

		it('should return 0 for max value of 0', () => {
			const result = getRandomInt(0);
			expect(result).toBe(0);
		});
	});

	describe('timeToUrl', () => {
		it('should create URLSearchParams with time parameter', () => {
			const result = timeToUrl('10:30');
			expect(result.toString()).toBe('t=10%3A30');
		});

		it('should handle different time formats', () => {
			const result = timeToUrl('1:05:30');
			expect(result.toString()).toBe('t=1%3A05%3A30');
		});
	});

	describe('newRandom', () => {
		it('should return a random query from the list', () => {
			const result = newRandom();
			expect(typeof result).toBe('string');
			expect(randomQuery).toContain(result);
		});
	});

	describe('createSearchParams', () => {
		it('should create URLSearchParams with query', () => {
			const params = createSearchParams({ query: 'test query' });
			expect(params.get('q')).toBe('test query');
		});

		it('should include offset when provided', () => {
			const params = createSearchParams({ query: 'test', offset: 40 });
			expect(params.get('q')).toBe('test');
			expect(params.get('o')).toBe('40');
		});

		it('should include filters when provided', () => {
			const params = createSearchParams({
				query: 'test',
				filter: ['season = 1', 'episode = 101']
			});
			expect(params.get('q')).toBe('test');
			expect(params.get('f')).toBe('season = 1,episode = 101');
		});

		it('should include editedOnly flag when true', () => {
			const params = createSearchParams({
				query: 'test',
				editedOnly: true
			});
			expect(params.get('q')).toBe('test');
			expect(params.get('e')).toBe('true');
		});

		it('should not include editedOnly when false', () => {
			const params = createSearchParams({
				query: 'test',
				editedOnly: false
			});
			expect(params.get('q')).toBe('test');
			expect(params.has('e')).toBe(false);
		});

		it('should handle all parameters together', () => {
			const params = createSearchParams({
				query: 'test query',
				offset: 60,
				filter: ['season = 2'],
				editedOnly: true
			});
			expect(params.get('q')).toBe('test query');
			expect(params.get('o')).toBe('60');
			expect(params.get('f')).toBe('season = 2');
			expect(params.get('e')).toBe('true');
		});
	});

	describe('searchMeili', () => {
		it('should be a function that accepts search parameters', () => {
			// Core search function exists and has correct signature
			expect(typeof searchMeili).toBe('function');
			expect(searchMeili.length).toBe(1); // Takes one parameter object
		});

		// Note: Full searchMeili integration tests should be done in E2E tests
		// to avoid complex MeiliSearch mocking in unit tests
	});

	describe('randomQuery array', () => {
		it('should contain expected queries', () => {
			expect(randomQuery).toContain('guinness');
			expect(randomQuery).toContain('ridiculous voice');
			expect(randomQuery).toContain('bronco');
			expect(randomQuery.length).toBeGreaterThan(20);
		});

		it('should contain only strings', () => {
			randomQuery.forEach((query) => {
				expect(typeof query).toBe('string');
				expect(query.length).toBeGreaterThan(0);
			});
		});
	});
});
