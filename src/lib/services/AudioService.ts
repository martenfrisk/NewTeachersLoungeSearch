import type { AudioTimestamp } from '../types/audio';
import type { Episode } from '../types/episode';
import { audioStore } from '../stores/audio';
import epList from '../../assets/episodes6.json';

export class AudioService {
	private audioElement: HTMLAudioElement | null = null;

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

	playTimestamp(timestamp: AudioTimestamp): void {
		const episode = this.findEpisode(timestamp.episode);
		if (!episode?.url) {
			console.warn('No audio URL found for episode:', timestamp.episode);
			return;
		}

		audioStore.setTimestamp(timestamp);
		this.loadAudio(episode.url, timestamp.timestamp);
	}

	private loadAudio(url: string, timestamp: string): void {
		if (!this.audioElement) return;

		this.audioElement.src = url;
		this.audioElement.load();

		// Set timestamp when metadata loads
		this.audioElement.addEventListener(
			'loadedmetadata',
			() => {
				const seconds = this.timestampToSeconds(timestamp);
				if (this.audioElement) {
					this.audioElement.currentTime = seconds + 29; // Offset for intro
				}
			},
			{ once: true }
		);
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
		audioStore.toggleMute();
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

	private findEpisode(episodeTitle: string): any | undefined {
		return epList.find((ep: any) => ep.title === episodeTitle || ep.feedTitle === episodeTitle);
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
