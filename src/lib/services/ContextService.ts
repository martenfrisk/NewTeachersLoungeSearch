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
		const { supabase } = await import('$lib/supabase');

		const { data, error } = await supabase
			.from('transcript_lines')
			.select(
				`
				id,
				timestamp_str,
				speaker,
				line,
				edited,
				episode:episodes!inner(ep, season)
			`
			)
			.eq('episodes.ep', episode)
			.order('timestamp_str');

		if (error) {
			throw new Error(`Failed to load transcript for ${episode}: ${error.message}`);
		}

		if (!data || data.length === 0) {
			console.warn(`No transcript found for episode: ${episode}`);
			return [];
		}

		// Convert to ContextLine format
		const transcript: ContextLine[] = data.map(
			(item: {
				id: string;
				timestamp_str: string;
				speaker: string;
				line: string;
				edited: boolean;
				episode: { ep: string; season: string }[];
			}) => ({
				id: item.id,
				episode: item.episode[0]?.ep || episode,
				season: item.episode[0]?.season || '',
				time: item.timestamp_str,
				speaker: item.speaker,
				line: item.line,
				edited: item.edited
			})
		);

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

	// First try to find by ID if it exists
	let currentLineIndex = -1;
	if (hit.id) {
		currentLineIndex = transcript.findIndex((line) => line.id === hit.id);
	}

	// If not found by ID, try to find by time and line content
	if (currentLineIndex === -1) {
		currentLineIndex = transcript.findIndex(
			(line) => line.time === hit.time && line.line === hit.line
		);
	}

	// If still not found, try to find by time only (in case line content differs)
	if (currentLineIndex === -1) {
		currentLineIndex = transcript.findIndex((line) => line.time === hit.time);
	}

	if (currentLineIndex === -1) {
		console.warn(`Could not find context for hit:`, { episode, time: hit.time, line: hit.line });
		return { before: null, current: hit, after: null };
	}

	const before = currentLineIndex > 0 ? transcript[currentLineIndex - 1] : null;
	const after = currentLineIndex < transcript.length - 1 ? transcript[currentLineIndex + 1] : null;

	return { before, current: hit, after };
};

export { loadTranscript, getSequenceNumber, createHitId, findContextLine };
