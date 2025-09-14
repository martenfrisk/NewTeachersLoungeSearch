import type { AudioTimestamp } from '../types/audio';
import { getSyncPreference, setSyncPreference } from '../utils/audioSync';
import { DEFAULT_EPISODE_START_TIME } from '../constants';

function createAudioState() {
	let currentTimestamp = $state<AudioTimestamp | null>(null);
	let isPlaying = $state(false);
	let currentTime = $state(0);
	let duration = $state(0);
	let volume = $state(1.0);
	let muted = $state(false);
	let syncEnabled = $state(getSyncPreference());
	let episodeStartingTime = $state(DEFAULT_EPISODE_START_TIME);
	let error = $state<string | null>(null);
	let url = $state<string | null>(null);

	// Derived values
	const progress = $derived(duration > 0 ? (currentTime / duration) * 100 : 0);
	const formattedCurrentTime = $derived(formatTime(currentTime));
	const formattedDuration = $derived(formatTime(duration));
	const currentPlaybackTime = $derived(formatTimeWithHours(currentTime));

	// Helper functions
	function formatTime(seconds: number): string {
		if (isNaN(seconds)) return '0:00';
		const minutes = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${minutes}:${secs.toString().padStart(2, '0')}`;
	}

	function formatTimeWithHours(seconds: number): string {
		if (isNaN(seconds)) return '0:00:00';
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		const secs = Math.floor(seconds % 60);
		return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
	}

	// Actions
	function setTimestamp(timestamp: AudioTimestamp): void {
		currentTimestamp = timestamp;
	}

	function play(): void {
		isPlaying = true;
	}

	function pause(): void {
		isPlaying = false;
	}

	function stop(): void {
		isPlaying = false;
		currentTime = 0;
		currentTimestamp = null;
	}

	function setCurrentTime(time: number): void {
		currentTime = time;
	}

	function setDuration(newDuration: number): void {
		duration = newDuration;
	}

	function setVolume(newVolume: number): void {
		volume = Math.max(0, Math.min(1, newVolume));
	}

	function setMuted(newMuted: boolean): void {
		muted = newMuted;
	}

	function toggleMute(): void {
		muted = !muted;
	}

	function setSyncEnabled(enabled: boolean): void {
		syncEnabled = enabled;
		setSyncPreference(enabled);
	}

	function toggleSync(): void {
		const newSyncEnabled = !syncEnabled;
		syncEnabled = newSyncEnabled;
		setSyncPreference(newSyncEnabled);
	}

	function setEpisodeStartingTime(startingTime: number): void {
		episodeStartingTime = startingTime;
	}

	function setError(errorMessage: string | null): void {
		error = errorMessage;
	}

	function clearError(): void {
		error = null;
	}

	function setUrl(audioUrl: string | null): void {
		url = audioUrl;
	}

	function reset(): void {
		currentTimestamp = null;
		isPlaying = false;
		currentTime = 0;
		duration = 0;
		volume = 1.0;
		muted = false;
		syncEnabled = getSyncPreference();
		episodeStartingTime = DEFAULT_EPISODE_START_TIME;
		error = null;
		url = null;
	}

	return {
		// State getters
		get currentTimestamp() {
			return currentTimestamp;
		},
		get isPlaying() {
			return isPlaying;
		},
		get currentTime() {
			return currentTime;
		},
		get duration() {
			return duration;
		},
		get volume() {
			return volume;
		},
		get muted() {
			return muted;
		},
		get syncEnabled() {
			return syncEnabled;
		},
		get episodeStartingTime() {
			return episodeStartingTime;
		},
		get error() {
			return error;
		},
		get url() {
			return url;
		},

		// Derived values
		get progress() {
			return progress;
		},
		get formattedCurrentTime() {
			return formattedCurrentTime;
		},
		get formattedDuration() {
			return formattedDuration;
		},
		get currentPlaybackTime() {
			return currentPlaybackTime;
		},

		// Actions
		setTimestamp,
		play,
		pause,
		stop,
		setCurrentTime,
		setDuration,
		setVolume,
		setMuted,
		toggleMute,
		setSyncEnabled,
		toggleSync,
		setEpisodeStartingTime,
		setError,
		clearError,
		setUrl,
		reset
	};
}

export const audioState = createAudioState();
