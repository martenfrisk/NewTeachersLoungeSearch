/**
 * Normalizes episode titles for consistent matching between RSS feed and local data
 */
export function normalizeTitle(title: string): string {
	return title
		.trim()
		.replace(/"/g, "'") // Convert double quotes to single quotes
		.toLowerCase();
}

/**
 * Strips common episode prefixes to improve matching
 * Examples: "Mini 01: Title" -> "Title", "S9BE28: Title" -> "Title"
 */
export function stripEpisodePrefix(title: string): string {
	return title
		.replace(/^(Mini\s+\d+:\s*)/i, '')
		.replace(/^(S\d+BE\d+:\s*)/i, '')
		.replace(/^(Episode\s+\d+:\s*)/i, '')
		.replace(/^(\d+:\s*)/i, '')
		.trim();
}

/**
 * Creates multiple normalized variations of a title for flexible matching
 */
export function createTitleVariations(title: string): string[] {
	const normalized = normalizeTitle(title);
	const withoutPrefix = stripEpisodePrefix(normalized);

	const variations = [normalized, withoutPrefix];

	// Remove duplicates
	return [...new Set(variations)];
}

/**
 * Checks if two titles match using various strategies
 */
export function titlesMatch(title1: string, title2: string): boolean {
	const variations1 = createTitleVariations(title1);
	const variations2 = createTitleVariations(title2);

	// Try exact matches first
	for (const var1 of variations1) {
		for (const var2 of variations2) {
			if (var1 === var2) {
				return true;
			}
		}
	}

	// Try substring matches
	for (const var1 of variations1) {
		for (const var2 of variations2) {
			if (var1.includes(var2) || var2.includes(var1)) {
				return true;
			}
		}
	}

	return false;
}
