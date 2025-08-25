import type { AudioTimestamp } from '../types/audio';
import { audioStore } from '../stores/audio';
import epList from '../../assets/episodes6.json';

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

		// Event listeners
		this.audioElement.addEventListener('loadedmetadata', this.onLoadedMetadata.bind(this));
		this.audioElement.addEventListener('timeupdate', this.onTimeUpdate.bind(this));
		this.audioElement.addEventListener('ended', this.onEnded.bind(this));
		this.audioElement.addEventListener('error', this.onError.bind(this));
		this.audioElement.addEventListener('loadstart', this.onLoadStart.bind(this));
		this.audioElement.addEventListener('canplay', this.onCanPlay.bind(this));
	}

	private async fetchRSSFeed(): Promise<RSSEpisode[]> {
		// Check if cache is still valid
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
			return this.rssCache; // Return cached data on error
		}
	}

	async playTimestamp(timestamp: AudioTimestamp): Promise<void> {
		const episode = await this.findEpisode(timestamp.episode);
		if (!episode?.audioUrl) {
			console.warn('No audio URL found for episode:', timestamp.episode);
			return;
		}

		audioStore.setTimestamp(timestamp);
		this.loadAudio(episode.audioUrl, timestamp.timestamp);
	}

	private loadAudio(url: string, timestamp: string): void {
		if (!this.audioElement) return;

		// Store the timestamp to set when metadata loads
		const targetTime = this.timestampToSeconds(timestamp) + 29; // Offset for intro

		// Only change source if it's different
		if (this.audioElement.src !== url) {
			this.audioElement.src = url;
			this.audioElement.load();
		}

		// Set timestamp when ready (use a promise-based approach)
		const setTimestamp = () => {
			if (this.audioElement && this.audioElement.readyState >= 1) {
				this.audioElement.currentTime = targetTime;
			} else if (this.audioElement) {
				// Wait for metadata to load
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

	// Event handlers
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
		console.error('Audio playback error');
		audioStore.pause();
	}

	private onLoadStart(): void {
		// Optional: handle load start
	}

	private onCanPlay(): void {
		// Optional: handle can play
	}

	// Utility methods
	private timestampToSeconds(timestamp: string): number {
		const parts = timestamp.split(':').map(Number);
		if (parts.length === 3) {
			return parts[0] * 3600 + parts[1] * 60 + parts[2];
		} else if (parts.length === 2) {
			return parts[0] * 60 + parts[1];
		}
		return 0;
	}

	private async findEpisode(episodeTitle: string): Promise<RSSEpisode | undefined> {
		// First try to find in RSS feed
		try {
			const episodes = await this.fetchRSSFeed();
			const rssEpisode = episodes.find(
				(ep) =>
					ep.title === episodeTitle ||
					ep.title.includes(episodeTitle) ||
					episodeTitle.includes(ep.title)
			);

			if (rssEpisode) {
				return rssEpisode;
			}
		} catch (error) {
			console.warn('Failed to fetch RSS feed, falling back to local data:', error);
		}

		// Fallback to local episode list
		const localEpisode = (epList as LocalEpisode[]).find(
			(ep) => ep.title === episodeTitle || ep.feedTitle === episodeTitle
		);
		if (localEpisode) {
			return {
				title: localEpisode.title || localEpisode.feedTitle || '',
				audioUrl: localEpisode.url || '',
				description: '',
				pubDate: '',
				duration: ''
			};
		}

		return undefined;
	}

	// Cleanup
	destroy(): void {
		if (this.audioElement) {
			this.audioElement.pause();
			this.audioElement.src = '';
			this.audioElement = null;
		}
	}
}

// Global singleton instance
export const audioService = new AudioService();
