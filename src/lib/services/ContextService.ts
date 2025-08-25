import type { SearchHitType } from '../types/search';

export interface ContextLine {
	id: string;
	episode: string;
	season: string;
	time: string;
	speaker: string;
	line: string;
	edited: boolean;
}

export interface HitContext {
	before: ContextLine | null;
	current: SearchHitType;
	after: ContextLine | null;
}

// Functional transcript cache using Map
const transcriptCache = new Map<string, ContextLine[]>();

const loadTranscript = async (episode: string): Promise<ContextLine[]> => {
	if (transcriptCache.has(episode)) {
		return transcriptCache.get(episode)!;
	}

	try {
		const response = await fetch(`/src/assets/transcripts/${episode}.json`);
		if (!response.ok) {
			throw new Error(`Failed to load transcript for ${episode}`);
		}
		const transcript: ContextLine[] = await response.json();
		transcriptCache.set(episode, transcript);
		return transcript;
	} catch (error) {
		console.error(`Error loading transcript for ${episode}:`, error);
		return [];
	}
};

const getSequenceNumber = (id: string): number => {
	const match = id.match(/-(\d+)$/);
	return match ? parseInt(match[1], 10) : 0;
};

const createHitId = (episode: string, sequence: number): string => `${episode}-${sequence}`;

const findContextLine = (transcript: ContextLine[], id: string): ContextLine | null =>
	transcript.find((line) => line.id === id) || null;

export const getContext = async (hit: SearchHitType): Promise<HitContext> => {
	const episode = hit.episode.replace('.json', '');
	const transcript = await loadTranscript(episode);

	if (transcript.length === 0) {
		return { before: null, current: hit, after: null };
	}

	const currentSequence = getSequenceNumber(hit.id);
	const beforeId = createHitId(episode, currentSequence - 1);
	const afterId = createHitId(episode, currentSequence + 1);

	const before = findContextLine(transcript, beforeId);
	const after = findContextLine(transcript, afterId);

	return { before, current: hit, after };
};

// Export utility functions for testing or direct use
export { loadTranscript, getSequenceNumber, createHitId, findContextLine };
