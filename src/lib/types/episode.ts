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
	// Streamed rather than awaited in the load function - it's a small,
	// non-critical badge, not worth blocking the transcript on.
	historyStats?: Promise<import('./history').EpisodeHistoryStatsType | null>;
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
