import type { EditableTranscriptLineType } from '../types/editor';
import { createErrorHandler } from '../utils/errors';

export interface IEditorRepository {
	fetchEpisodeTranscript(episodeId: string): Promise<EditableTranscriptLineType[]>;
	fetchAllEpisodes(): Promise<
		Array<{ ep: string; title: string; season: string; hasAudio: boolean }>
	>;
	fetchEpisodesWithEditStatus(): Promise<
		Array<{ ep: string; title: string; season: string; hasAudio: boolean; hasEdits: boolean }>
	>;
}

interface SupabaseClientType {
	from: (table: string) => {
		select: (columns?: string) => {
			eq: (column: string, value: unknown) => Promise<{ data: unknown; error: unknown }>;
		};
	};
}

export class SupabaseEditorRepository implements IEditorRepository {
	private supabase: SupabaseClientType | null = null;
	private readonly handleError = createErrorHandler('SupabaseEditorRepository');

	constructor() {
		this.initializeSupabase();
	}

	private async initializeSupabase() {
		if (!this.supabase) {
			const { supabase } = await import('$lib/supabase');
			this.supabase = supabase;
		}
	}

	async fetchEpisodeTranscript(episodeId: string): Promise<EditableTranscriptLineType[]> {
		try {
			await this.initializeSupabase();

			const { data, error } = await this.supabase
				.from('transcript_lines')
				.select(
					`
					id,
					timestamp_str,
					speaker,
					line,
					edited,
					episode:episodes!inner(ep, title, season)
				`
				)
				.eq('episodes.ep', episodeId)
				.order('timestamp_str');

			if (error) {
				throw new Error(`Failed to fetch transcript: ${error.message}`);
			}

			if (!data || data.length === 0) {
				throw new Error(`No transcript found for episode: ${episodeId}`);
			}

			// Convert to EditableTranscriptLineType format
			const transcriptLines: EditableTranscriptLineType[] = data.map(
				(item: {
					id: string;
					timestamp_str: string;
					speaker: string;
					line: string;
					edited: boolean;
					episode: { ep: string; title: string; season: string };
				}) => ({
					id: item.id,
					time: item.timestamp_str,
					speaker: item.speaker,
					line: item.line,
					edited: item.edited,
					isEditing: false,
					isHighlighted: false,
					isPlaying: false,
					hasChanges: false,
					originalText: item.line,
					originalSpeaker: item.speaker,
					originalTime: item.timestamp_str,
					// Include episode data for audio matching
					episode: item.episode
				})
			);

			return transcriptLines;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	async fetchAllEpisodes(): Promise<
		Array<{ ep: string; title: string; season: string; hasAudio: boolean }>
	> {
		try {
			await this.initializeSupabase();

			const { data, error } = await this.supabase
				.from('episodes')
				.select('ep, title, season, has_audio')
				.order('date', { ascending: false });

			if (error) {
				throw new Error(`Failed to fetch episodes: ${error.message}`);
			}

			return data.map(
				(episode: { ep: string; title: string; season: string; has_audio: boolean }) => ({
					ep: episode.ep,
					title: episode.title,
					season: episode.season,
					hasAudio: episode.has_audio
				})
			);
		} catch (error) {
			throw this.handleError(error);
		}
	}

	async fetchEpisodesWithEditStatus(): Promise<
		Array<{ ep: string; title: string; season: string; hasAudio: boolean; hasEdits: boolean }>
	> {
		try {
			await this.initializeSupabase();

			// Get all episodes with their edit status
			const { data, error } = await this.supabase
				.from('episodes')
				.select(
					`
					ep, 
					title, 
					season, 
					has_audio,
					transcript_lines!left(edited)
				`
				)
				.order('date', { ascending: false });

			if (error) {
				throw new Error(`Failed to fetch episodes with edit status: ${error.message}`);
			}

			interface EpisodeRowType {
				ep: string;
				title: string;
				season: string;
				has_audio: boolean;
				transcript_lines?: Array<{ edited: boolean }>;
			}

			return (data as EpisodeRowType[]).map((episode) => ({
				ep: episode.ep,
				title: episode.title,
				season: episode.season,
				hasAudio: episode.has_audio,
				hasEdits: episode.transcript_lines?.some((line) => line.edited === true) || false
			}));
		} catch (error) {
			throw this.handleError(error);
		}
	}
}
