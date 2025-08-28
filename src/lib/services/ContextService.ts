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

const transcriptCache = new Map<string, ContextLine[]>();

const loadTranscript = async (episode: string): Promise<ContextLine[]> => {
	if (transcriptCache.has(episode)) {
		return transcriptCache.get(episode)!;
	}

	try {
		const response = await fetch(`/transcripts/${episode}.json`);
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

	const currentLineIndex = transcript.findIndex(
		(line) => line.time === hit.time && line.line === hit.line
	);

	if (currentLineIndex === -1) {
		return { before: null, current: hit, after: null };
	}

	const before = currentLineIndex > 0 ? transcript[currentLineIndex - 1] : null;
	const after = currentLineIndex < transcript.length - 1 ? transcript[currentLineIndex + 1] : null;

	return { before, current: hit, after };
};

export { loadTranscript, getSequenceNumber, createHitId, findContextLine };
