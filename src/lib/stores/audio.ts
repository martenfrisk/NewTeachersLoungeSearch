import { writable, derived } from 'svelte/store';
import type { AudioState, AudioTimestamp } from '../types/audio';
import { getSyncPreference, setSyncPreference } from '../utils/audioSync';
import { DEFAULT_EPISODE_START_TIME } from '../constants';

function createAudioStore() {
	const initialState: AudioState = {
		currentTimestamp: null,
		isPlaying: false,
		currentTime: 0,
		duration: 0,
		volume: 1.0,
		muted: false,
		syncEnabled: getSyncPreference(),
		episodeStartingTime: DEFAULT_EPISODE_START_TIME,
		error: null,
		url: null
	};

	const { subscribe, set, update } = writable<AudioState>(initialState);

	return {
		subscribe,

		setTimestamp(timestamp: AudioTimestamp): void {
			update((state) => ({
				...state,
				currentTimestamp: timestamp
			}));
		},

		play(): void {
			update((state) => ({ ...state, isPlaying: true }));
		},

		pause(): void {
			update((state) => ({ ...state, isPlaying: false }));
		},

		stop(): void {
			update((state) => ({
				...state,
				isPlaying: false,
				currentTime: 0,
				currentTimestamp: null
			}));
		},

		setCurrentTime(time: number): void {
			update((state) => ({ ...state, currentTime: time }));
		},

		setDuration(duration: number): void {
			update((state) => ({ ...state, duration }));
		},

		setVolume(volume: number): void {
			const clampedVolume = Math.max(0, Math.min(1, volume));
			update((state) => ({ ...state, volume: clampedVolume }));
		},

		toggleMute(): void {
			update((state) => ({ ...state, muted: !state.muted }));
		},

		setMuted(muted: boolean): void {
			update((state) => ({ ...state, muted }));
		},

		setSyncEnabled(syncEnabled: boolean): void {
			update((state) => ({ ...state, syncEnabled }));
			setSyncPreference(syncEnabled);
		},

		toggleSync(): void {
			update((state) => {
				const newSyncEnabled = !state.syncEnabled;
				setSyncPreference(newSyncEnabled);
				return { ...state, syncEnabled: newSyncEnabled };
			});
		},

		setEpisodeStartingTime(startingTime: number): void {
			update((state) => ({ ...state, episodeStartingTime: startingTime }));
		},

		setError(error: string | null): void {
			update((state) => ({ ...state, error }));
		},

		clearError(): void {
			update((state) => ({ ...state, error: null }));
		},

		setUrl(url: string | null): void {
			update((state) => ({ ...state, url }));
		},

		reset(): void {
			set(initialState);
		}
	};
}

export const audioStore = createAudioStore();

export const currentTimestamp = derived(audioStore, ($audio) => $audio.currentTimestamp);
export const isPlaying = derived(audioStore, ($audio) => $audio.isPlaying);
export const audioProgress = derived(audioStore, ($audio) =>
	$audio.duration > 0 ? ($audio.currentTime / $audio.duration) * 100 : 0
);

export const formattedCurrentTime = derived(audioStore, ($audio) => formatTime($audio.currentTime));
export const formattedDuration = derived(audioStore, ($audio) => formatTime($audio.duration));
export const syncEnabled = derived(audioStore, ($audio) => $audio.syncEnabled);

// Convert current playback time to transcript format (MM:SS), accounting for intro offset
export const currentPlaybackTime = derived(audioStore, ($audio) => {
	// if ($audio.currentTime <= $audio.episodeStartingTime) return '0:00:00';
	// const adjustedTime = $audio.currentTime - $audio.episodeStartingTime;
	// return formatTimeWithHours(adjustedTime);
	return formatTimeWithHours($audio.currentTime);
});

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
