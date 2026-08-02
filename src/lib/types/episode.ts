export interface TranscriptLine {
	id?: string;
	speaker: string;
	edited: boolean;
	time: string;
	line: string;
}

export interface ProcessedTranscriptLine extends TranscriptLine {
	displaySpeaker: string;
	speakerColor: string;
}

export interface TranscriptStats {
	totalLines: number;
	editedLines: number;
	editedPercentage: number;
	isFullyEdited: boolean;
	isMostlyEdited: boolean;
}

export interface EpisodeInfo {
	ep: string;
	title: string;
	/**
	 * The episode's title *as it appears in the Art19 RSS feed*, and the only
	 * reliable key for locating its mp3 there. `title` is the site's cleaned-up
	 * display title: it drops the "S4E5:" prefix, uses ASCII punctuation, and
	 * sometimes abbreviates guest names ("Alana J" for "Alana Johnston"), so
	 * matching on it both misses episodes and — because segment names recur
	 * across seasons — silently resolves to the wrong one. Null for episodes
	 * with no entry in the feed (e.g. the Main Street run).
	 */
	feedTitle?: string | null;
	date?: string;
	season?: string;
	description?: string;
	hasAudio?: boolean;
	startingTime?: number;
	isFullyEdited?: boolean;
	isMostlyEdited?: boolean;
	editedPercentage?: number;
	editedLines?: number;
	totalLines?: number;
}

/** Minimal shape for adjacent-episode navigation links */
export interface EpisodeNavLink {
	ep: string;
	title: string;
}

export interface EpisodePageData {
	episode: string;
	hits: {
		default: ProcessedTranscriptLine[];
	};
	transcriptStats: TranscriptStats;
	episodeInfo?: EpisodeInfo;
	prevEpisode?: EpisodeNavLink;
	nextEpisode?: EpisodeNavLink;
	seasonId?: string;
	seasonName?: string;
	/** Sibling episodes in the same season, current episode excluded. */
	seasonEpisodes?: EpisodeNavLink[];
}

export interface SpeakerProcessingOptions {
	generateColors?: boolean;
	mapUnknownSpeakers?: boolean;
}

export interface Episode {
	ep: string;
	title: string;
	desc: string;
	date: string;
	url?: string;
	feedTitle?: string | null;
	hasAudio?: boolean;
	startingTime?: number;
}

export interface SeasonData {
	id: string;
	name: string;
	episodes: Episode[];
	description?: string;
	dateRange?: string;
	totalDuration?: number;
	averageRating?: number;
	hostNotes?: string;
	artwork?: string;
	color?: string;
}

export interface Season {
	id: string;
	name: string;
	episodeCount: number;
	color?: string;
	isSpecial?: boolean;
}
