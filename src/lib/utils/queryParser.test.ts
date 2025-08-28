import { describe, it, expect } from 'vitest';
import { parseSearchQuery, buildPostgresQuery } from './queryParser';

describe('queryParser', () => {
	describe('parseSearchQuery', () => {
		it('should parse simple terms', () => {
			const result = parseSearchQuery('hello world');
			expect(result.terms).toEqual(['hello', 'world']);
			expect(result.exactPhrases).toEqual([]);
			expect(result.excludedTerms).toEqual([]);
			expect(result.excludedPhrases).toEqual([]);
		});

		it('should parse exact phrases with quotes', () => {
			const result = parseSearchQuery('"hello world" test');
			expect(result.terms).toEqual(['test']);
			expect(result.exactPhrases).toEqual(['hello world']);
			expect(result.excludedTerms).toEqual([]);
			expect(result.excludedPhrases).toEqual([]);
		});

		it('should parse excluded terms with hyphens', () => {
			const result = parseSearchQuery('hello -world');
			expect(result.terms).toEqual(['hello']);
			expect(result.exactPhrases).toEqual([]);
			expect(result.excludedTerms).toEqual(['world']);
			expect(result.excludedPhrases).toEqual([]);
		});

		it('should parse excluded phrases with hyphens and quotes', () => {
			const result = parseSearchQuery('hello -"bad phrase"');
			expect(result.terms).toEqual(['hello']);
			expect(result.exactPhrases).toEqual([]);
			expect(result.excludedTerms).toEqual([]);
			expect(result.excludedPhrases).toEqual(['bad phrase']);
		});

		it('should parse complex queries', () => {
			const result = parseSearchQuery('test "exact match" -exclude -"excluded phrase" another');
			expect(result.terms).toEqual(['test', 'another']);
			expect(result.exactPhrases).toEqual(['exact match']);
			expect(result.excludedTerms).toEqual(['exclude']);
			expect(result.excludedPhrases).toEqual(['excluded phrase']);
		});
	});

	describe('buildPostgresQuery', () => {
		it('should build basic query', () => {
			const parsed = {
				terms: ['hello', 'world'],
				exactPhrases: [],
				excludedTerms: [],
				excludedPhrases: []
			};
			const result = buildPostgresQuery(parsed);
			expect(result).toBe('hello world');
		});

		it('should build query with exact phrases', () => {
			const parsed = {
				terms: ['hello'],
				exactPhrases: ['exact match'],
				excludedTerms: [],
				excludedPhrases: []
			};
			const result = buildPostgresQuery(parsed);
			expect(result).toBe('hello "exact match"');
		});

		it('should build query with exclusions', () => {
			const parsed = {
				terms: ['hello'],
				exactPhrases: [],
				excludedTerms: ['bad'],
				excludedPhrases: ['bad phrase']
			};
			const result = buildPostgresQuery(parsed);
			expect(result).toBe('hello -bad -"bad phrase"');
		});
	});
});
