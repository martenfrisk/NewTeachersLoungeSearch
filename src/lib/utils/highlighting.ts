/**
 * Search query highlighting utilities
 */

/**
 * Parse a search query to extract highlighting terms, handling quoted phrases and exclusions
 */
export function parseHighlightTerms(query: string): string[] {
	if (!query.trim()) return [];

	const terms: string[] = [];

	// Match quoted phrases first
	const quotedMatches = query.match(/"([^"]+)"/g);
	if (quotedMatches) {
		quotedMatches.forEach((match) => {
			const phrase = match.slice(1, -1); // Remove quotes
			if (!phrase.startsWith('-')) {
				terms.push(phrase);
			}
		});
	}

	// Remove quoted phrases from query and get individual words
	const withoutQuotes = query.replace(/"[^"]+"/g, '');
	const words = withoutQuotes.split(/\s+/).filter((word) => {
		const trimmed = word.trim();
		// Skip empty words and exclusions (words starting with -)
		return trimmed.length > 0 && !trimmed.startsWith('-');
	});

	terms.push(...words);

	return terms.filter((term, index, arr) => arr.indexOf(term) === index); // Remove duplicates
}

/**
 * Highlight search terms in text using <em> tags
 */
export function highlightSearchTerms(text: string, searchQuery: string): string {
	const terms = parseHighlightTerms(searchQuery);

	if (terms.length === 0) return text;

	let highlightedText = text;

	// Sort terms by length (longest first) to avoid partial matches
	const sortedTerms = terms.sort((a, b) => b.length - a.length);

	sortedTerms.forEach((term) => {
		if (!term.trim()) return;

		// Escape special regex characters
		const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

		// Create regex for case-insensitive matching
		const regex = new RegExp(`(${escapedTerm})`, 'gi');

		// Replace matches with highlighted version
		highlightedText = highlightedText.replace(regex, '<em>$1</em>');
	});

	return highlightedText;
}

/**
 * Get highlighted parts for component rendering (returns array of parts)
 * This is useful for Svelte components that need granular control over highlighting
 */
export function getHighlightedParts(
	text: string,
	searchQuery: string
): Array<{ text: string; highlighted: boolean }> {
	const terms = parseHighlightTerms(searchQuery);

	if (terms.length === 0) {
		return [{ text, highlighted: false }];
	}

	let parts = [{ text, highlighted: false }];

	// Sort terms by length (longest first) to avoid partial matches
	const sortedTerms = terms.sort((a, b) => b.length - a.length);

	// Process each term
	sortedTerms.forEach((term) => {
		if (!term.trim()) return;

		// Escape special regex characters
		const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		const regex = new RegExp(`(${escapedTerm})`, 'gi');

		const newParts: { text: string; highlighted: boolean }[] = [];

		parts.forEach((part) => {
			if (part.highlighted) {
				newParts.push(part);
			} else {
				const matches = [...part.text.matchAll(regex)];
				if (matches.length === 0) {
					newParts.push(part);
				} else {
					let lastIndex = 0;
					matches.forEach((match) => {
						if (match.index !== undefined) {
							if (match.index > lastIndex) {
								newParts.push({
									text: part.text.slice(lastIndex, match.index),
									highlighted: false
								});
							}
							newParts.push({ text: match[0], highlighted: true });
							lastIndex = match.index + match[0].length;
						}
					});
					if (lastIndex < part.text.length) {
						newParts.push({ text: part.text.slice(lastIndex), highlighted: false });
					}
				}
			}
		});

		parts = newParts;
	});

	return parts;
}
