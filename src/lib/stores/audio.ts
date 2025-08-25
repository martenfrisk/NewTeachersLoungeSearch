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

// Derived stores for easy access
export const currentTimestamp = derived(audioStore, ($audio) => $audio.currentTimestamp);
export const isPlaying = derived(audioStore, ($audio) => $audio.isPlaying);
export const audioCurrentTime = derived(audioStore, ($audio) => $audio.currentTime);
export const audioDuration = derived(audioStore, ($audio) => $audio.duration);
export const audioVolume = derived(audioStore, ($audio) => $audio.volume);
export const audioMuted = derived(audioStore, ($audio) => $audio.muted);

// Computed values
export const audioProgress = derived(
	[audioCurrentTime, audioDuration],
	([$currentTime, $duration]) => ($duration > 0 ? ($currentTime / $duration) * 100 : 0)
);

export const formattedCurrentTime = derived(audioCurrentTime, ($time) => formatTime($time));
export const formattedDuration = derived(audioDuration, ($duration) => formatTime($duration));

function formatTime(seconds: number): string {
	if (isNaN(seconds)) return '0:00';

	const minutes = Math.floor(seconds / 60);
	const secs = Math.floor(seconds % 60);
	return `${minutes}:${secs.toString().padStart(2, '0')}`;
}
