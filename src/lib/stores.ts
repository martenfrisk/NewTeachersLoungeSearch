import { writable } from 'svelte/store';

type AudioTimestampStoreType = {
	timestamp: string;
	episode: string;
};

// Legacy store for backward compatibility
export const audioTimestamp = writable<AudioTimestampStoreType | null>(null);

// Re-export new stores for gradual migration
export { audioStore, currentTimestamp } from './stores/audio';
export { appStore } from './stores/app';
