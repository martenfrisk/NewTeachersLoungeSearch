/**
 * Normalizes episode titles for consistent matching between RSS feed and local data
 */
export function normalizeTitle(title: string): string {
	return (
		title
			// The feed uses typographic punctuation ("We’re", "don’t") where our
			// local titles use ASCII. Folding these is what makes S2E1 and S2E5
			// match at all.
			.replace(/[‘’‛]/g, "'")
			.replace(/[“”]/g, "'")
			.replace(/"/g, "'")
			.replace(/[–—]/g, '-')
			// Collapses the stray double space in Mini 19's title.
			.replace(/\s+/g, ' ')
			.trim()
			.toLowerCase()
	);
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
 * Picks the single best feed entry for `target` out of `candidates`.
 *
 * `titlesMatch` ranks exact above substring, but only *within one pair* - a
 * caller doing `list.find(titlesMatch)` still takes whichever entry it reaches
 * first, so a loose substring hit early in the feed beats an exact hit later.
 * The Art19 feed is newest-first and segment names recur across seasons, so
 * that ordering is what makes "The Preacher's Lounge" (S4E5) resolve to the
 * newer S5E4 entry that merely contains it. Ranking has to happen across the
 * whole candidate list, which is what this does.
 */
export function findBestTitleMatch<T>(
	candidates: T[],
	getTitle: (candidate: T) => string,
	target: string
): T | undefined {
	const targetNormalized = normalizeTitle(target);
	const targetStripped = stripEpisodePrefix(targetNormalized);

	// Tier 1: the whole normalized title is identical.
	const exact = candidates.find((c) => normalizeTitle(getTitle(c)) === targetNormalized);
	if (exact) return exact;

	// Tier 2: identical once each side's "S4E5:" / "Mini 19:" prefix is removed.
	const stripped = candidates.find(
		(c) => stripEpisodePrefix(normalizeTitle(getTitle(c))) === targetStripped
	);
	if (stripped) return stripped;

	// Tier 3: fall back to containment, which is the only tier that can bridge a
	// truncated guest name ("Alana J" for "Alana Johnston"). It is also the tier
	// that produced the wrong-episode bug, so it needs an explicit policy for
	// what to do when several feed entries contain the target.
	const partial = candidates.filter((c) => {
		const candidateStripped = stripEpisodePrefix(normalizeTitle(getTitle(c)));
		return candidateStripped.includes(targetStripped) || targetStripped.includes(candidateStripped);
	});

	if (partial.length <= 1) return partial[0];

	// Prefer entries that only *append* to the target, which is the feed's actual
	// pattern: "S4E5: The Preacher's Lounge" grows into "S5E4: The Preacher's
	// Lounge - Moses's Ark with ...", never the reverse.
	const anchored = partial.filter((c) =>
		stripEpisodePrefix(normalizeTitle(getTitle(c))).startsWith(targetStripped)
	);
	const pool = anchored.length > 0 ? anchored : partial;

	// Least surplus text wins. Length distance is deliberately used instead of
	// feed position: the feed is newest-first, so position-based tie-breaking is
	// what let a newly published episode steal an older one's audio, and it would
	// silently re-break every time the show publishes.
	const ranked = pool
		.map((candidate) => ({
			candidate,
			surplus: Math.abs(
				stripEpisodePrefix(normalizeTitle(getTitle(candidate))).length - targetStripped.length
			)
		}))
		.sort((a, b) => a.surplus - b.surplus);

	// An exact tie means the two entries are genuinely indistinguishable on the
	// evidence available. Refuse: the caller shows "audio unavailable", which is
	// recoverable, whereas guessing plays a different episode under the right
	// title and reads as the transcript being out of sync.
	if (ranked.length > 1 && ranked[0].surplus === ranked[1].surplus) return undefined;

	return ranked[0].candidate;
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
