import { describe, it, expect } from 'vitest';
import {
	normalizeTitle,
	stripEpisodePrefix,
	createTitleVariations,
	titlesMatch,
	findBestTitleMatch
} from './titleNormalization';

describe('titleNormalization', () => {
	describe('normalizeTitle', () => {
		it('converts double quotes to single quotes', () => {
			expect(normalizeTitle('Episode "What\'s the Deal"')).toBe("episode 'what's the deal'");
		});

		it('trims whitespace and converts to lowercase', () => {
			expect(normalizeTitle('  Title With Spaces  ')).toBe('title with spaces');
		});

		it('handles mixed quotes correctly', () => {
			expect(normalizeTitle('Mini 01: "What\'s the Dealio?"')).toBe(
				"mini 01: 'what's the dealio?'"
			);
		});
	});

	describe('stripEpisodePrefix', () => {
		it('strips Mini episode prefixes', () => {
			expect(stripEpisodePrefix("Mini 01: What's the Dealio?")).toBe("What's the Dealio?");
			expect(stripEpisodePrefix('Mini 123: Title')).toBe('Title');
		});

		it('strips season episode prefixes', () => {
			expect(stripEpisodePrefix('S9BE28: White Nectar')).toBe('White Nectar');
			expect(stripEpisodePrefix('S1BE01: First Episode')).toBe('First Episode');
		});

		it('strips generic episode prefixes', () => {
			expect(stripEpisodePrefix('Episode 5: Title')).toBe('Title');
			expect(stripEpisodePrefix('15: Simple Title')).toBe('Simple Title');
		});

		it('handles titles without prefixes', () => {
			expect(stripEpisodePrefix('Simple Title')).toBe('Simple Title');
		});
	});

	describe('createTitleVariations', () => {
		it('creates normalized and stripped variations', () => {
			const variations = createTitleVariations('Mini 01: "What\'s the Deal"');
			expect(variations).toContain("mini 01: 'what's the deal'");
			expect(variations).toContain("'what's the deal'");
		});

		it('removes duplicates', () => {
			const variations = createTitleVariations('Simple Title');
			expect(variations.length).toBe(1);
			expect(variations[0]).toBe('simple title');
		});
	});

	describe('titlesMatch', () => {
		it('matches exact titles after normalization', () => {
			expect(titlesMatch("What's the Deal", "WHAT'S THE DEAL")).toBe(true);
			expect(titlesMatch('"What\'s the Deal"', "'What's the Deal'")).toBe(true);
		});

		it('matches titles with different prefixes', () => {
			expect(titlesMatch("Mini 01: What's the Deal", "What's the Deal")).toBe(true);
			expect(titlesMatch('S9BE28: White Nectar', 'White Nectar')).toBe(true);
		});

		it('matches using substring matching', () => {
			expect(titlesMatch("What's the Deal", "Full Title: What's the Deal")).toBe(true);
			expect(titlesMatch('Long Episode Title Here', 'Episode Title')).toBe(true);
		});

		it('handles quote differences between RSS and JSON', () => {
			// RSS might have: "What's the Deal" (double quotes)
			// JSON has: 'What\'s the Deal' (single quotes, escaped)
			expect(titlesMatch('"What\'s the Deal"', "What's the Deal")).toBe(true);
			expect(titlesMatch('Mini 01: "Don\'t Listen"', "Don't Listen")).toBe(true);
		});

		it('returns false for unrelated titles', () => {
			expect(titlesMatch('Completely Different', 'Totally Unrelated')).toBe(false);
		});
	});

	describe('findBestTitleMatch', () => {
		const byTitle = (t: string) => t;

		// The Art19 feed is newest-first, so an older episode's title is reached
		// after the newer one that merely contains it.
		const feed = [
			'S8E04: The Bleachers Lounge - The Lawn Ranger with Mom Carrol Jerreau (Tami Sagher)',
			"S5E4: The Preacher's Lounge - Moses's Ark with Reverend Samuel Ezekiel (Echo Kellum)",
			'S6E4: The Bleachers Lounge',
			"S4E5: The Preacher's Lounge"
		];

		it('prefers an exact match over an earlier substring match', () => {
			expect(findBestTitleMatch(feed, byTitle, "S4E5: The Preacher's Lounge")).toBe(
				"S4E5: The Preacher's Lounge"
			);
		});

		it('matches once episode prefixes are stripped from both sides', () => {
			expect(findBestTitleMatch(feed, byTitle, "Mini 01: The Preacher's Lounge")).toBe(
				"S4E5: The Preacher's Lounge"
			);
		});

		// Regression: a recurring segment name used to resolve to whichever season
		// the feed listed first, so newer episodes stole older ones' audio.
		it('does not let a newer episode hijack a recurring segment name', () => {
			expect(findBestTitleMatch(feed, byTitle, "The Preacher's Lounge")).toBe(
				"S4E5: The Preacher's Lounge"
			);
			expect(findBestTitleMatch(feed, byTitle, 'The Bleachers Lounge')).toBe(
				'S6E4: The Bleachers Lounge'
			);
		});

		it('is independent of feed ordering', () => {
			const reversed = [...feed].reverse();
			expect(findBestTitleMatch(reversed, byTitle, "The Preacher's Lounge")).toBe(
				"S4E5: The Preacher's Lounge"
			);
		});

		it('folds typographic punctuation the feed uses but local titles do not', () => {
			expect(
				findBestTitleMatch(
					['S2E1: We’re All Just Trying to Not Be Our Dad'],
					byTitle,
					"We're All Just Trying to Not Be Our Dad"
				)
			).toBe('S2E1: We’re All Just Trying to Not Be Our Dad');
		});

		it('collapses runs of whitespace', () => {
			expect(
				findBestTitleMatch(
					['Mini 19: Hamilton In The Park: A Good Play Experience'],
					byTitle,
					'Hamilton In The Park:  A Good Play Experience'
				)
			).toBe('Mini 19: Hamilton In The Park: A Good Play Experience');
		});

		it('refuses rather than guessing when candidates are indistinguishable', () => {
			const ambiguous = ['S1E1: Assembly - Part A', 'S2E1: Assembly - Part B'];
			expect(findBestTitleMatch(ambiguous, byTitle, 'Assembly')).toBeUndefined();
		});

		it('returns undefined when nothing matches', () => {
			expect(findBestTitleMatch(feed, byTitle, 'An Episode That Does Not Exist')).toBeUndefined();
		});

		it('handles an empty candidate list', () => {
			expect(findBestTitleMatch([], byTitle, 'Anything')).toBeUndefined();
		});
	});
});
