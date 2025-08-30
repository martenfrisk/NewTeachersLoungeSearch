import type {
	EditableTranscriptLineType,
	EditSubmissionType,
	PendingEditType
} from '../types/editor';
import { createErrorHandler } from '../utils/errors';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface IEditorRepository {
	fetchEpisodeTranscript(episodeId: string): Promise<EditableTranscriptLineType[]>;
	fetchAllEpisodes(): Promise<
		Array<{ ep: string; title: string; season: string; hasAudio: boolean }>
	>;
	fetchEpisodesWithEditStatus(): Promise<
		Array<{ ep: string; title: string; season: string; hasAudio: boolean; hasEdits: boolean }>
	>;
	submitEdit(edit: EditSubmissionType, userId?: string): Promise<string>;
	fetchPendingEdits(): Promise<PendingEditType[]>;
	approveEdit(editId: string, moderatorId: string): Promise<void>;
	rejectEdit(editId: string, moderatorId: string, reason?: string): Promise<void>;
}

export class SupabaseEditorRepository implements IEditorRepository {
	private supabase: SupabaseClient | null = null;
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

			const { data, error } = await this.supabase!.from('transcript_lines')
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
					episode: { ep: string; title: string; season: string }[];
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
					// Include episode data for audio matching - take first episode if array
					episode: Array.isArray(item.episode) ? item.episode[0] : item.episode
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

			const { data, error } = await this.supabase!.from('episodes')
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
			const { data, error } = await this.supabase!.from('episodes')
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

	async submitEdit(edit: EditSubmissionType, userId?: string): Promise<string> {
		try {
			await this.initializeSupabase();
			if (!this.supabase) throw new Error('Supabase client not initialized');

			// Get next version number for this line
			const { data: existingEdits, error: versionError } = await this.supabase
				.from('line_edits')
				.select('version_number')
				.eq('original_line_id', edit.lineId)
				.order('version_number', { ascending: false });

			if (versionError) {
				throw new Error(`Failed to get version number: ${versionError.message}`);
			}

			const nextVersion =
				existingEdits && existingEdits.length > 0
					? (existingEdits[0] as { version_number: number }).version_number + 1
					: 1;

			// Build the edit data
			const editData = {
				original_line_id: edit.lineId,
				version_number: nextVersion,
				line_text: edit.newText !== edit.originalText ? edit.newText : null,
				timestamp_str: edit.newTimestamp !== edit.originalTimestamp ? edit.newTimestamp : null,
				speaker: edit.newSpeaker !== edit.originalSpeaker ? edit.newSpeaker : null,
				change_type: edit.changeTypes,
				edited_by: userId || null,
				status: 'pending',
				contributor_name: edit.contributorName,
				contributor_email: edit.contributorEmail,
				notes: edit.notes,
				confidence_score: 1.0
			};

			const { data, error } = await this.supabase!.from('line_edits')
				.insert(editData)
				.select('id')
				.single();

			if (error) {
				throw new Error(`Failed to submit edit: ${error.message}`);
			}

			return (data as { id: string }).id;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	async fetchPendingEdits(): Promise<PendingEditType[]> {
		try {
			await this.initializeSupabase();
			if (!this.supabase) throw new Error('Supabase client not initialized');

			const { data, error } = await this.supabase!.from('line_edits')
				.select(
					`
					id,
					original_line_id,
					version_number,
					line_text,
					timestamp_str,
					speaker,
					change_type,
					edited_by,
					status,
					contributor_name,
					contributor_email,
					notes,
					created_at,
					reviewed_by,
					reviewed_at
				`
				)
				.eq('status', 'pending')
				.order('created_at', { ascending: true });

			if (error) {
				throw new Error(`Failed to fetch pending edits: ${error.message}`);
			}

			return (
				data as Array<{
					id: string;
					original_line_id: string;
					version_number: number;
					line_text: string | null;
					timestamp_str: string | null;
					speaker: string | null;
					change_type: string[];
					edited_by: string | null;
					status: string;
					contributor_name: string | null;
					contributor_email: string | null;
					notes: string | null;
					created_at: string;
					reviewed_by: string | null;
					reviewed_at: string | null;
				}>
			).map((edit) => ({
				id: edit.id,
				originalLineId: edit.original_line_id,
				versionNumber: edit.version_number,
				lineText: edit.line_text ?? undefined,
				timestampStr: edit.timestamp_str ?? undefined,
				speaker: edit.speaker ?? undefined,
				changeType: edit.change_type,
				editedBy: edit.edited_by ?? undefined,
				status: edit.status as 'pending' | 'approved' | 'rejected' | 'deleted',
				contributorName: edit.contributor_name ?? undefined,
				contributorEmail: edit.contributor_email ?? undefined,
				notes: edit.notes ?? undefined,
				createdAt: edit.created_at,
				reviewedBy: edit.reviewed_by ?? undefined,
				reviewedAt: edit.reviewed_at ?? undefined
			}));
		} catch (error) {
			throw this.handleError(error);
		}
	}

	async approveEdit(editId: string, moderatorId: string): Promise<void> {
		try {
			await this.initializeSupabase();
			if (!this.supabase) throw new Error('Supabase client not initialized');

			const { error } = await this.supabase
				.from('line_edits')
				.update({
					status: 'approved',
					reviewed_by: moderatorId,
					reviewed_at: new Date().toISOString()
				})
				.eq('id', editId);

			if (error) {
				throw new Error(`Failed to approve edit: ${error.message}`);
			}
		} catch (error) {
			throw this.handleError(error);
		}
	}

	async rejectEdit(editId: string, moderatorId: string, reason?: string): Promise<void> {
		try {
			await this.initializeSupabase();
			if (!this.supabase) throw new Error('Supabase client not initialized');

			const { error } = await this.supabase
				.from('line_edits')
				.update({
					status: 'rejected',
					reviewed_by: moderatorId,
					reviewed_at: new Date().toISOString(),
					delete_reason: reason
				})
				.eq('id', editId);

			if (error) {
				throw new Error(`Failed to reject edit: ${error.message}`);
			}
		} catch (error) {
			throw this.handleError(error);
		}
	}
}
