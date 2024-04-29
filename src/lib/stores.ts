import { writable } from 'svelte/store';

type AudioTimestampStoreType = {
	timestamp: string;
	episode: string;
};

export const audioTimestamp = writable<AudioTimestampStoreType | null>(null);
