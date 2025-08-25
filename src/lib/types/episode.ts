export interface Episode {
	ep: string;
	title: string;
	feedTitle: string;
	pubDate: string;
	description: string;
	isoDate: Date;
	url?: string;
	hasAudio: boolean;
}

export interface LocalEpisode {
	time: string;
	speaker: string;
	line: string;
	episode: string;
	edited: boolean;
}

export interface TranscriptLine {
	id: string;
	episode: string;
	season: string;
	time: string;
	speaker: string;
	line: string;
	edited: boolean;
}
