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

export interface EpisodePageData {
	episode: string;
	hits: {
		default: ProcessedTranscriptLine[];
	};
	transcriptStats: TranscriptStats;
	episodeInfo?: EpisodeInfo;
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
