export interface AudioTimestamp {
	timestamp: string;
	episode: string;
}

export interface AudioState {
	currentTimestamp: AudioTimestamp | null;
	isPlaying: boolean;
	currentTime: number;
	duration: number;
	volume: number;
	muted: boolean;
	syncEnabled: boolean;
	episodeStartingTime: number;
	error: string | null;
}

export interface AudioPlayerProps {
	src: string;
	currTime?: number;
	currEpTitle?: string;
}

export interface EpisodeAudio {
	url: string;
	hasAudio: boolean;
	feedTitle: string;
}
