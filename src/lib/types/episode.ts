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
