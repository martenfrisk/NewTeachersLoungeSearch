import { writable, derived } from 'svelte/store';
import type { AudioState, AudioTimestamp } from '../types/audio';

function createAudioStore() {
	const initialState: AudioState = {
		currentTimestamp: null,
		isPlaying: false,
		currentTime: 0,
		duration: 0,
		volume: 1.0,
		muted: false
	};

	const { subscribe, set, update } = writable<AudioState>(initialState);

	return {
		subscribe,

		// Actions
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

		reset(): void {
			set(initialState);
		}
	};
}

// Audio store instance
export const audioStore = createAudioStore();

// Essential derived stores - most components can access audioStore directly
export const currentTimestamp = derived(audioStore, ($audio) => $audio.currentTimestamp);
export const isPlaying = derived(audioStore, ($audio) => $audio.isPlaying);

// Only keep computed values that are frequently used
export const audioProgress = derived(audioStore, ($audio) =>
	$audio.duration > 0 ? ($audio.currentTime / $audio.duration) * 100 : 0
);

export const formattedCurrentTime = derived(audioStore, ($audio) => formatTime($audio.currentTime));
export const formattedDuration = derived(audioStore, ($audio) => formatTime($audio.duration));

function formatTime(seconds: number): string {
	if (isNaN(seconds)) return '0:00';

	const minutes = Math.floor(seconds / 60);
	const secs = Math.floor(seconds % 60);
	return `${minutes}:${secs.toString().padStart(2, '0')}`;
}
