/**
 * Application constants
 */

/**
 * Default starting time offset for episodes in seconds.
 * Most episodes have an intro song that lasts approximately 30.29 seconds.
 * This offset is used to synchronize transcript timestamps with actual audio playback.
 * Mini episodes and live episodes may have different starting times.
 */
export const DEFAULT_EPISODE_START_TIME = 30.29;

/**
 * Full display names for each season/show id (the prefix of an episode's
 * `ep` code, e.g. "s01", "exit42", "lastresort"). Centralized here since this
 * was previously duplicated across SeasonSection, SeasonNavigation,
 * EpisodeStats, and FloatingSeasonNav, and had drifted out of sync between
 * them (e.g. "jesus" was shown as "Jesus Chronicles" / "Jesus" in different
 * places, rather than the show's actual name).
 */
export const SEASON_DISPLAY_NAMES: Record<string, string> = {
	s01: 'Season 1',
	s02: 'Season 2',
	s03: 'Season 3',
	s04: 'Season 4',
	s05: 'Season 5',
	s06: 'Season 6',
	s07: 'Season 7',
	s08: 'Season 8',
	s09: 'Season 9',
	s10: 'Season 10',
	s11: 'Season 11',
	s12: 'Season 12',
	s13: 'Season 13',
	mini: 'Mini Episodes',
	exit42: 'Exit 42',
	exit43: 'Exit 43',
	Peecast: 'Peecast Blast',
	holidays: 'Holidays at the Mall',
	jesus: "Preacher's Lounge - Story of Jesus",
	lastresort: 'Last Resort',
	countyfair: 'County Fair',
	mainstreet: 'Main Street Sounds'
};

/** Abbreviated season/show names, for compact UI like nav pills. */
export const SEASON_SHORT_NAMES: Record<string, string> = {
	s01: 'S1',
	s02: 'S2',
	s03: 'S3',
	s04: 'S4',
	s05: 'S5',
	s06: 'S6',
	s07: 'S7',
	s08: 'S8',
	s09: 'S9',
	s10: 'S10',
	s11: 'S11',
	s12: 'S12',
	s13: 'S13',
	mini: 'Minis',
	exit42: 'Exit42',
	exit43: 'Exit43',
	Peecast: 'Peecast',
	holidays: 'Holidays',
	jesus: 'Jesus',
	lastresort: 'Last Resort',
	countyfair: 'County Fair',
	mainstreet: 'Main St'
};

export function getSeasonDisplayName(id: string, fallback?: string): string {
	return SEASON_DISPLAY_NAMES[id] || fallback || id;
}

export function getSeasonShortName(id: string, fallback?: string): string {
	return SEASON_SHORT_NAMES[id] || fallback || id;
}
