import type { AudioTimestamp } from '../types/audio';
import { audioStore } from '../stores/audio';
import epList from '../../assets/episodes6.json';
import { DEFAULT_EPISODE_START_TIME } from '../constants';
import { titlesMatch } from '../utils/titleNormalization';

interface RSSEpisode {
	title: string;
	audioUrl: string;
	description: string;
	pubDate: string;
	duration: string;
}

interface LocalEpisode {
	ep: string;
	title: string;
	desc: string;
	date: string;
	url: string;
	feedTitle: string;
	hasAudio: boolean;
	startingTime?: number;
}

export class AudioService {
	private audioElement: HTMLAudioElement | null = null;
	private rssCache: RSSEpisode[] = [];
	private rssLastFetched: number = 0;
	private readonly RSS_CACHE_DURATION = 1000 * 60 * 30; // 30 minutes
	private readonly RSS_URL = 'https://rss.art19.com/60dd5309-db63-4b1a-9051-27e4c72958e5';

	constructor() {
		this.setupAudioElement();
	}

	private setupAudioElement(): void {
		if (typeof window === 'undefined') return;

		this.audioElement = new Audio();
		this.audioElement.preload = 'none';

		this.audioElement.addEventListener('loadedmetadata', this.onLoadedMetadata.bind(this));
		this.audioElement.addEventListener('timeupdate', this.onTimeUpdate.bind(this));
		this.audioElement.addEventListener('ended', this.onEnded.bind(this));
		this.audioElement.addEventListener('error', this.onError.bind(this));
		this.audioElement.addEventListener('loadstart', this.onLoadStart.bind(this));
		this.audioElement.addEventListener('canplay', this.onCanPlay.bind(this));
	}

	private async fetchRSSFeed(): Promise<RSSEpisode[]> {
		const now = Date.now();
		if (this.rssCache.length > 0 && now - this.rssLastFetched < this.RSS_CACHE_DURATION) {
			return this.rssCache;
		}

		try {
			const response = await fetch(this.RSS_URL);
			const xmlText = await response.text();
			const parser = new DOMParser();
			const doc = parser.parseFromString(xmlText, 'text/xml');

			const items = doc.querySelectorAll('item');
			const episodes: RSSEpisode[] = [];

			items.forEach((item) => {
				const title = item.querySelector('title')?.textContent?.trim() || '';
				const enclosure = item.querySelector('enclosure');
				const audioUrl = enclosure?.getAttribute('url') || '';
				const description = item.querySelector('description')?.textContent?.trim() || '';
				const pubDate = item.querySelector('pubDate')?.textContent?.trim() || '';
				const durationElement = item.querySelector('itunes\\:duration, duration');
				const duration = durationElement?.textContent?.trim() || '';

				if (title && audioUrl) {
					episodes.push({
						title,
						audioUrl,
						description,
						pubDate,
						duration
					});
				}
			});

			this.rssCache = episodes;
			this.rssLastFetched = now;
			return episodes;
		} catch (error) {
			console.error('Failed to fetch RSS feed:', error);
			return this.rssCache;
		}
	}

	async playTimestamp(timestamp: AudioTimestamp): Promise<void> {
		const episode = await this.findEpisode(timestamp.episode);
		if (!episode?.audioUrl) {
			const errorMessage = `Audio unavailable: Could not find audio file for "${timestamp.episode}" in RSS feed`;
			console.error(errorMessage);
			audioStore.setError(errorMessage);
			return;
		}

		// const startingTime = this.getEpisodeStartingTime(timestamp.episode);
		audioStore.clearError();
		audioStore.setTimestamp(timestamp);
		// audioStore.setEpisodeStartingTime(startingTime);
		audioStore.setEpisodeStartingTime(0); // Use 0 instead of startingTime
		this.loadAudio(episode.audioUrl, timestamp.timestamp);
	}

	private loadAudio(url: string, timestamp: string): void {
		if (!this.audioElement) return;

		// const startingTime = this.getEpisodeStartingTime(episodeTitle);
		// const targetTime = this.timestampToSeconds(timestamp) + startingTime;
		const targetTime = this.timestampToSeconds(timestamp);

		if (this.audioElement.src !== url) {
			this.audioElement.src = url;
			audioStore.setUrl(url);
			this.audioElement.load();
		}
		const setTimestamp = () => {
			if (this.audioElement && this.audioElement.readyState >= 1) {
				this.audioElement.currentTime = targetTime;
			} else if (this.audioElement) {
				this.audioElement.addEventListener(
					'loadedmetadata',
					() => {
						if (this.audioElement) {
							this.audioElement.currentTime = targetTime;
						}
					},
					{ once: true }
				);
			}
		};

		setTimestamp();
	}

	play(): void {
		if (!this.audioElement) return;

		this.audioElement
			.play()
			.then(() => {
				audioStore.play();
			})
			.catch((error) => {
				console.error('Failed to play audio:', error);
			});
	}

	pause(): void {
		if (!this.audioElement) return;

		this.audioElement.pause();
		audioStore.pause();
	}

	stop(): void {
		if (!this.audioElement) return;

		this.audioElement.pause();
		this.audioElement.currentTime = 0;
		audioStore.stop();
	}

	setVolume(volume: number): void {
		if (!this.audioElement) return;

		this.audioElement.volume = Math.max(0, Math.min(1, volume));
		audioStore.setVolume(volume);
	}

	setMuted(muted: boolean): void {
		if (!this.audioElement) return;

		this.audioElement.muted = muted;
		audioStore.setMuted(muted);
	}

	seek(time: number): void {
		if (!this.audioElement) return;

		this.audioElement.currentTime = time;
		audioStore.setCurrentTime(time);
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	seekToTimeRange(startTime: number, _endTime: number): void {
		this.seek(startTime);
	}

	playRange(startTime: number, endTime: number): Promise<void> {
		return new Promise((resolve) => {
			if (!this.audioElement) {
				resolve();
				return;
			}

			this.seek(startTime);

			const onTimeUpdate = () => {
				if (this.audioElement && this.audioElement.currentTime >= endTime) {
					this.pause();
					this.audioElement.removeEventListener('timeupdate', onTimeUpdate);
					resolve();
				}
			};

			this.audioElement.addEventListener('timeupdate', onTimeUpdate);
			this.play();
		});
	}

	getCurrentAudioUrl(): string | null {
		return this.audioElement?.src || null;
	}

	private onLoadedMetadata(): void {
		if (!this.audioElement) return;
		audioStore.setDuration(this.audioElement.duration);
	}

	private onTimeUpdate(): void {
		if (!this.audioElement) return;
		audioStore.setCurrentTime(this.audioElement.currentTime);
	}

	private onEnded(): void {
		audioStore.pause();
		audioStore.setCurrentTime(0);
	}

	private onError(): void {
		const errorMessage = 'Audio playback failed. The audio file may be unavailable or corrupted.';
		console.error('Audio playback error');
		audioStore.setError(errorMessage);
		audioStore.pause();
	}

	private onLoadStart(): void {}

	private onCanPlay(): void {}
	private timestampToSeconds(timestamp: string): number {
		// Support both 00:00:01 and 0:00:01 formats
		const parts = timestamp.split(':').map(Number);
		if (parts.length === 3) {
			return parts[0] * 3600 + parts[1] * 60 + parts[2];
		} else if (parts.length === 2) {
			return parts[0] * 60 + parts[1];
		}
		return 0;
	}

	private getEpisodeStartingTime(episodeTitle?: string): number {
		if (!episodeTitle) return DEFAULT_EPISODE_START_TIME;

		const localEpisode = (epList as LocalEpisode[]).find(
			(ep) => ep.title === episodeTitle || ep.feedTitle === episodeTitle
		);

		return localEpisode?.startingTime ?? DEFAULT_EPISODE_START_TIME;
	}

	private async findEpisode(episodeTitle: string): Promise<RSSEpisode | undefined> {
		try {
			const episodes = await this.fetchRSSFeed();
			const rssEpisode = episodes.find((ep) => {
				return titlesMatch(ep.title, episodeTitle);
			});
			if (rssEpisode) {
				return rssEpisode;
			}
		} catch (error) {
			console.error('Failed to fetch RSS feed:', error);
		}
		console.error(`Audio URL not found in RSS feed for episode: "${episodeTitle}"`);
		return undefined;
	}

	destroy(): void {
		if (this.audioElement) {
			this.audioElement.pause();
			this.audioElement.src = '';
			this.audioElement = null;
		}
	}
}

export const audioService = new AudioService();
