import { describe, it, expect } from 'vitest';
import { highlightSearchTerms } from './highlighting';

describe('highlightSearchTerms', () => {
	it('wraps a single matched word in <em>', () => {
		expect(highlightSearchTerms('I object to that', 'object')).toBe('I <em>object</em> to that');
	});

	it('merges consecutive matched words into one continuous <em> run', () => {
		// Each word matches individually, but the swipe should not break at the
		// spaces — the whitespace moves inside a single <em>.
		expect(highlightSearchTerms('I see you in court', 'see you in court')).toBe(
			'I <em>see you in court</em>'
		);
	});

	it('does not merge matches separated by an unmatched word', () => {
		expect(highlightSearchTerms('see the you', 'see you')).toBe('<em>see</em> the <em>you</em>');
	});

	it('returns the text unchanged when nothing matches', () => {
		expect(highlightSearchTerms('nothing here', 'absent')).toBe('nothing here');
	});
});
