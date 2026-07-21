import type {
	EditableTranscriptLineType,
	EpisodeSubmissionType,
	PendingEpisodeSubmissionType
} from '../types/editor';
import type {
	EpisodeVersionType,
	VersionHistoryEntryType,
	VersionDiffSummaryType,
	ArchivedTranscriptLineType
} from '../types/version';
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

	// Episode submission methods
	submitEpisodeTranscript(submission: EpisodeSubmissionType, userId?: string): Promise<string>;
	fetchPendingEpisodeSubmissions(): Promise<PendingEpisodeSubmissionType[]>;
	fetchApprovedEpisodeSubmissions(): Promise<PendingEpisodeSubmissionType[]>;
	fetchRejectedEpisodeSubmissions(): Promise<PendingEpisodeSubmissionType[]>;
	approveEpisodeSubmission(submissionId: string, moderatorId: string): Promise<void>;
	rejectEpisodeSubmission(
		submissionId: string,
		moderatorId: string,
		reason?: string
	): Promise<void>;

	// Version history methods
	fetchEpisodeVersionHistory(episodeEp: string): Promise<VersionHistoryEntryType[]>;
	fetchEpisodeCurrentVersion(episodeEp: string): Promise<EpisodeVersionType | null>;
	restoreEpisodeVersion(versionId: string, userId?: string): Promise<void>;
	fetchVersionDiffSummary(
		fromVersionId: string,
		toVersionId: string
	): Promise<VersionDiffSummaryType>;
	fetchArchivedTranscriptLines(versionId: string): Promise<ArchivedTranscriptLineType[]>;
}

// PostgREST caps a single response at 1000 rows by default and reports no
// error when it truncates, so any query that can exceed that has to page.
const PAGE_SIZE = 1000;

// Guards against an unbounded loop if a page ever comes back full but the
// range stops advancing. 100 pages is ~100k rows - far beyond the longest
// transcript (~1200 lines), so hitting this means something is wrong.
const MAX_PAGES = 100;

type PagedQueryResultType<T> = {
	data: T[] | null;
	error: { message: string } | null;
};

export class SupabaseEditorRepository implements IEditorRepository {
	private supabase: SupabaseClient | null = null;
	private readonly handleError = createErrorHandler('SupabaseEditorRepository');

	/**
	 * Runs `buildPage` repeatedly with successive `.range()` bounds and
	 * concatenates the results, working around PostgREST's silent 1000-row cap.
	 *
	 * The caller's query MUST impose a total order (i.e. end with a unique
	 * tiebreaker such as `id`). Paging a non-deterministic order lets rows
	 * shift between requests, which silently duplicates and skips them.
	 */
	private async fetchAllPages<T>(
		buildPage: (from: number, to: number) => PromiseLike<PagedQueryResultType<T>>,
		describeFailure: (message: string) => string
	): Promise<T[]> {
		const rows: T[] = [];

		for (let page = 0; page < MAX_PAGES; page++) {
			const from = page * PAGE_SIZE;
			const { data, error } = await buildPage(from, from + PAGE_SIZE - 1);

			if (error) {
				throw new Error(describeFailure(error.message));
			}

			const batch = data ?? [];
			rows.push(...batch);

			// A short page means the end of the result set. An exactly-full
			// final page costs one extra empty request to confirm, which is a
			// better trade than guessing and truncating again.
			if (batch.length < PAGE_SIZE) {
				return rows;
			}
		}

		// Never expected in practice - the longest transcript is ~1200 lines.
		// Throwing beats returning a truncated array, which is the failure mode
		// this helper exists to eliminate.
		throw new Error(describeFailure(`exceeded ${MAX_PAGES} pages of ${PAGE_SIZE} rows`));
	}

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

			type TranscriptRowType = {
				id: string;
				timestamp_str: string;
				speaker: string;
				line: string;
				edited: boolean;
				episode: { ep: string; title: string; season: string }[];
			};

			// timestamp_str only has second granularity, so it is not unique -
			// the id tiebreaker is what makes the ordering total, and paging is
			// only correct over a total order.
			const data = await this.fetchAllPages<TranscriptRowType>(
				(from, to) =>
					this.supabase!.from('transcript_lines')
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
						.order('timestamp_str')
						.order('id')
						.range(from, to),
				(message) => `Failed to fetch transcript: ${message}`
			);

			if (!data || data.length === 0) {
				throw new Error(`No transcript found for episode: ${episodeId}`);
			}

			// Convert to EditableTranscriptLineType format
			const transcriptLines: EditableTranscriptLineType[] = data.map((item: TranscriptRowType) => ({
				id: item.id,
				time: item.timestamp_str,
				speaker: item.speaker,
				line: item.line,
				edited: item.edited,
				isEditing: false,
				isHighlighted: false,
				isPlaying: false,
				editState: item.edited ? ('edited' as const) : ('unedited' as const),
				originalText: item.line,
				originalSpeaker: item.speaker,
				originalTime: item.timestamp_str,
				// Include episode data for audio matching - take first episode if array
				episode: Array.isArray(item.episode) ? item.episode[0] : item.episode
			}));

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

	// NEW EPISODE SUBMISSION METHODS

	async submitEpisodeTranscript(
		submission: EpisodeSubmissionType,
		userId?: string
	): Promise<string> {
		try {
			await this.initializeSupabase();
			if (!this.supabase) throw new Error('Supabase client not initialized');

			// Get episode UUID from episode ep if not provided
			let episodeId = submission.episodeId;
			if (!episodeId) {
				const { data: episode, error: episodeError } = await this.supabase
					.from('episodes')
					.select('id')
					.eq('ep', submission.episodeEp)
					.single();

				if (episodeError || !episode) {
					throw new Error(`Episode not found: ${submission.episodeEp}`);
				}
				episodeId = episode.id;
			}

			// Generate privacy-first fields
			const contributorContactHash = submission.contributorEmail
				? await this.hashContactInfo(submission.contributorEmail)
				: null;

			const sessionId = crypto.randomUUID();
			const submissionFingerprint = await this.generateSubmissionFingerprint(submission);
			const rateKey = await this.generateRateKey();

			// Ensure user exists in custom users table if authenticated
			if (userId) {
				const { error: userCreateError } = await this.supabase.rpc('create_user_if_not_exists');

				if (userCreateError) {
					console.warn('Failed to create user record:', userCreateError);
					// Continue with null user for anonymous submission
					userId = undefined;
				}
			}

			// Prepare submission data with privacy-first approach
			const submissionData = {
				episode_id: episodeId,
				episode_ep: submission.episodeEp,
				submission_type: submission.submissionType,
				transcript_data: JSON.stringify(submission.transcriptData),
				submitted_by: userId || null,
				contributor_display_name: submission.contributorName || null,
				contributor_session_id: sessionId,
				contributor_contact_hash: contributorContactHash,
				contact_provided: !!submission.contributorEmail,
				submission_fingerprint: submissionFingerprint,
				submission_rate_key: rateKey,
				notes: submission.notes || null,
				status: 'pending'
			};

			const { data, error } = await this.supabase
				.from('episode_submissions')
				.insert(submissionData)
				.select('id')
				.single();

			if (error) {
				throw new Error(`Failed to submit episode transcript: ${error.message}`);
			}

			return (data as { id: string }).id;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	async fetchPendingEpisodeSubmissions(): Promise<PendingEpisodeSubmissionType[]> {
		try {
			await this.initializeSupabase();
			if (!this.supabase) throw new Error('Supabase client not initialized');

			const { data, error } = await this.supabase
				.from('episode_submissions')
				.select(
					`
					id,
					episode_id,
					episode_ep,
					submission_type,
					transcript_data,
					submitted_by,
					contributor_display_name,
					contributor_session_id,
					contact_provided,
					notes,
					status,
					created_at,
					reviewed_by,
					reviewed_at,
					rejection_reason
				`
				)
				.eq('status', 'pending')
				.order('created_at', { ascending: true });

			if (error) {
				throw new Error(`Failed to fetch pending episode submissions: ${error.message}`);
			}

			return (data || []).map(
				(submission: {
					id: string;
					episode_id: string;
					episode_ep: string;
					submission_type: string;
					transcript_data: string;
					submitted_by?: string;
					contributor_display_name?: string;
					contributor_session_id?: string;
					contact_provided?: boolean;
					notes?: string;
					status: string;
					created_at: string;
					reviewed_by?: string;
					reviewed_at?: string;
					rejection_reason?: string;
				}) => ({
					id: submission.id,
					episodeId: submission.episode_id,
					episodeEp: submission.episode_ep,
					submissionType: submission.submission_type as 'full_replacement' | 'partial_edit',
					transcriptData: JSON.parse(submission.transcript_data),
					submittedBy: submission.submitted_by,
					contributorDisplayName: submission.contributor_display_name,
					contributorSessionId: submission.contributor_session_id,
					contactProvided: submission.contact_provided,
					notes: submission.notes,
					status: submission.status as 'pending' | 'approved' | 'rejected',
					createdAt: submission.created_at,
					reviewedBy: submission.reviewed_by,
					reviewedAt: submission.reviewed_at,
					rejectionReason: submission.rejection_reason
				})
			);
		} catch (error) {
			throw this.handleError(error);
		}
	}

	async fetchApprovedEpisodeSubmissions(): Promise<PendingEpisodeSubmissionType[]> {
		try {
			await this.initializeSupabase();
			if (!this.supabase) throw new Error('Supabase client not initialized');

			const { data, error } = await this.supabase
				.from('episode_submissions')
				.select(
					`
					id,
					episode_id,
					episode_ep,
					submission_type,
					transcript_data,
					submitted_by,
					contributor_display_name,
					contributor_session_id,
					contact_provided,
					notes,
					status,
					created_at,
					reviewed_by,
					reviewed_at,
					rejection_reason,
					reviewer:users!reviewed_by(username, email)
				`
				)
				.eq('status', 'approved')
				.order('reviewed_at', { ascending: false });

			if (error) {
				throw new Error(`Failed to fetch approved episode submissions: ${error.message}`);
			}

			return (data || []).map(
				(submission: {
					id: string;
					episode_id: string;
					episode_ep: string;
					submission_type: string;
					transcript_data: string;
					submitted_by?: string;
					contributor_display_name?: string;
					contributor_session_id?: string;
					contact_provided?: boolean;
					notes?: string;
					status: string;
					created_at: string;
					reviewed_by?: string;
					reviewed_at?: string;
					rejection_reason?: string;
				}) => ({
					id: submission.id,
					episodeId: submission.episode_id,
					episodeEp: submission.episode_ep,
					submissionType: submission.submission_type as 'full_replacement' | 'partial_edit',
					transcriptData: JSON.parse(submission.transcript_data),
					submittedBy: submission.submitted_by,
					contributorDisplayName: submission.contributor_display_name,
					contributorSessionId: submission.contributor_session_id,
					contactProvided: submission.contact_provided,
					notes: submission.notes,
					status: submission.status as 'pending' | 'approved' | 'rejected',
					createdAt: submission.created_at,
					reviewedBy: submission.reviewed_by,
					reviewedAt: submission.reviewed_at,
					rejectionReason: submission.rejection_reason
				})
			);
		} catch (error) {
			throw this.handleError(error);
		}
	}

	async fetchRejectedEpisodeSubmissions(): Promise<PendingEpisodeSubmissionType[]> {
		try {
			await this.initializeSupabase();
			if (!this.supabase) throw new Error('Supabase client not initialized');

			const { data, error } = await this.supabase
				.from('episode_submissions')
				.select(
					`
					id,
					episode_id,
					episode_ep,
					submission_type,
					transcript_data,
					submitted_by,
					contributor_display_name,
					contributor_session_id,
					contact_provided,
					notes,
					status,
					created_at,
					reviewed_by,
					reviewed_at,
					rejection_reason,
					reviewer:users!reviewed_by(username, email)
				`
				)
				.eq('status', 'rejected')
				.order('reviewed_at', { ascending: false });

			if (error) {
				throw new Error(`Failed to fetch rejected episode submissions: ${error.message}`);
			}

			return (data || []).map(
				(submission: {
					id: string;
					episode_id: string;
					episode_ep: string;
					submission_type: string;
					transcript_data: string;
					submitted_by?: string;
					contributor_display_name?: string;
					contributor_session_id?: string;
					contact_provided?: boolean;
					notes?: string;
					status: string;
					created_at: string;
					reviewed_by?: string;
					reviewed_at?: string;
					rejection_reason?: string;
				}) => ({
					id: submission.id,
					episodeId: submission.episode_id,
					episodeEp: submission.episode_ep,
					submissionType: submission.submission_type as 'full_replacement' | 'partial_edit',
					transcriptData: JSON.parse(submission.transcript_data),
					submittedBy: submission.submitted_by,
					contributorDisplayName: submission.contributor_display_name,
					contributorSessionId: submission.contributor_session_id,
					contactProvided: submission.contact_provided,
					notes: submission.notes,
					status: submission.status as 'pending' | 'approved' | 'rejected',
					createdAt: submission.created_at,
					reviewedBy: submission.reviewed_by,
					reviewedAt: submission.reviewed_at,
					rejectionReason: submission.rejection_reason
				})
			);
		} catch (error) {
			throw this.handleError(error);
		}
	}

	async approveEpisodeSubmission(submissionId: string, moderatorId: string): Promise<void> {
		try {
			await this.initializeSupabase();
			if (!this.supabase) throw new Error('Supabase client not initialized');

			// First, apply the submission using the database function
			const { error: applyError } = await this.supabase.rpc('apply_episode_submission', {
				submission_id: submissionId
			});

			if (applyError) {
				throw new Error(`Failed to apply episode submission: ${applyError.message}`);
			}

			// Only update the submission status after successful application
			const { error: updateError } = await this.supabase
				.from('episode_submissions')
				.update({
					status: 'approved',
					reviewed_by: moderatorId,
					reviewed_at: new Date().toISOString()
				})
				.eq('id', submissionId);

			if (updateError) {
				throw new Error(`Failed to approve submission: ${updateError.message}`);
			}
		} catch (error) {
			throw this.handleError(error);
		}
	}

	async rejectEpisodeSubmission(
		submissionId: string,
		moderatorId: string,
		reason?: string
	): Promise<void> {
		try {
			await this.initializeSupabase();
			if (!this.supabase) throw new Error('Supabase client not initialized');

			const { error } = await this.supabase
				.from('episode_submissions')
				.update({
					status: 'rejected',
					reviewed_by: moderatorId,
					reviewed_at: new Date().toISOString(),
					rejection_reason: reason || null
				})
				.eq('id', submissionId);

			if (error) {
				throw new Error(`Failed to reject episode submission: ${error.message}`);
			}
		} catch (error) {
			throw this.handleError(error);
		}
	}

	// Privacy-first helper methods
	private async hashContactInfo(email: string): Promise<string> {
		// Use Web Crypto API for secure hashing
		const encoder = new TextEncoder();
		const data = encoder.encode(email.toLowerCase().trim());
		const hashBuffer = await crypto.subtle.digest('SHA-256', data);
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
	}

	private async generateSubmissionFingerprint(submission: EpisodeSubmissionType): Promise<string> {
		// Generate a browser fingerprint based on submission characteristics
		const fingerprintData = {
			transcriptLength: JSON.stringify(submission.transcriptData).length,
			episodeEp: submission.episodeEp,
			submissionType: submission.submissionType,
			timestamp: new Date().getTime()
		};

		const encoder = new TextEncoder();
		const data = encoder.encode(JSON.stringify(fingerprintData));
		const hashBuffer = await crypto.subtle.digest('SHA-256', data);
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		return hashArray
			.map((b) => b.toString(16).padStart(2, '0'))
			.join('')
			.substring(0, 16);
	}

	private async generateRateKey(): Promise<string> {
		// Generate rate limiting key based on time window (hourly)
		const now = new Date();
		const timeWindow = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}`;

		// In a real implementation, this would include IP hash or other client identifier
		// For now, using a simple time-based key
		const encoder = new TextEncoder();
		const data = encoder.encode(timeWindow);
		const hashBuffer = await crypto.subtle.digest('SHA-256', data);
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		return hashArray
			.map((b) => b.toString(16).padStart(2, '0'))
			.join('')
			.substring(0, 12);
	}

	// VERSION HISTORY METHODS

	async fetchEpisodeVersionHistory(episodeEp: string): Promise<VersionHistoryEntryType[]> {
		try {
			await this.initializeSupabase();
			if (!this.supabase) throw new Error('Supabase client not initialized');

			const { data, error } = await this.supabase.rpc('get_episode_version_history', {
				target_episode_ep: episodeEp
			});

			if (error) {
				throw new Error(`Failed to fetch version history: ${error.message}`);
			}

			return (data || []).map(
				(version: {
					version_id: string;
					version_number: number;
					created_at: string;
					created_by_username: string;
					source_type: string;
					change_summary: string;
					lines_count: number;
					is_current: boolean;
				}) => ({
					id: version.version_id,
					episodeId: '', // Not returned by the function, could be added if needed
					versionNumber: version.version_number,
					createdAt: version.created_at,
					createdByUsername: version.created_by_username,
					sourceType: version.source_type,
					changeSummary: version.change_summary,
					linesCount: version.lines_count,
					isCurrent: version.is_current,
					ep: episodeEp,
					title: '', // Would need to join with episodes table to get these
					episodeSeason: ''
				})
			);
		} catch (error) {
			throw this.handleError(error);
		}
	}

	async fetchEpisodeCurrentVersion(episodeEp: string): Promise<EpisodeVersionType | null> {
		try {
			await this.initializeSupabase();
			if (!this.supabase) throw new Error('Supabase client not initialized');

			const { data, error } = await this.supabase
				.from('episode_current_versions')
				.select('*')
				.eq('ep', episodeEp)
				.single();

			if (error) {
				if (error.code === 'PGRST116') return null; // Not found
				throw new Error(`Failed to fetch current version: ${error.message}`);
			}

			return {
				id: data.id,
				episodeId: data.episode_id,
				versionNumber: data.version_number,
				createdBy: data.created_by,
				createdByUsername: data.created_by_username,
				createdAt: data.created_at,
				sourceType: data.source_type,
				submissionId: data.submission_id,
				changeSummary: data.change_summary,
				isCurrent: data.is_current,
				linesCount: data.lines_count
			};
		} catch (error) {
			throw this.handleError(error);
		}
	}

	async restoreEpisodeVersion(versionId: string, userId?: string): Promise<void> {
		try {
			await this.initializeSupabase();
			if (!this.supabase) throw new Error('Supabase client not initialized');

			const { error } = await this.supabase.rpc('restore_episode_version', {
				target_version_id: versionId,
				restore_by_user_id: userId || null
			});

			if (error) {
				throw new Error(`Failed to restore version: ${error.message}`);
			}
		} catch (error) {
			throw this.handleError(error);
		}
	}

	async fetchVersionDiffSummary(
		fromVersionId: string,
		toVersionId: string
	): Promise<VersionDiffSummaryType> {
		try {
			await this.initializeSupabase();
			if (!this.supabase) throw new Error('Supabase client not initialized');

			const { data, error } = await this.supabase.rpc('get_version_diff_summary', {
				from_version_id: fromVersionId,
				to_version_id: toVersionId
			});

			if (error) {
				throw new Error(`Failed to fetch diff summary: ${error.message}`);
			}

			const result = data?.[0];
			return {
				linesAdded: result?.lines_added || 0,
				linesRemoved: result?.lines_removed || 0,
				linesModified: result?.lines_modified || 0,
				totalChanges: result?.total_changes || 0
			};
		} catch (error) {
			throw this.handleError(error);
		}
	}

	async fetchArchivedTranscriptLines(versionId: string): Promise<ArchivedTranscriptLineType[]> {
		try {
			await this.initializeSupabase();
			if (!this.supabase) throw new Error('Supabase client not initialized');

			type ArchivedRowType = {
				id: string;
				episode_id: string;
				season: string;
				timestamp_str: string;
				speaker: string;
				line: string;
				edited: boolean;
				created_at: string;
				updated_at: string;
				version_id: string;
				archived_at: string;
			};

			// Same 1000-row cap as fetchEpisodeTranscript - an archived version of
			// a long episode would otherwise restore/diff with its tail missing.
			const data = await this.fetchAllPages<ArchivedRowType>(
				(from, to) =>
					this.supabase!.from('transcript_lines_archive')
						.select('*')
						.eq('version_id', versionId)
						.order('timestamp_str')
						.order('id')
						.range(from, to),
				(message) => `Failed to fetch archived transcript lines: ${message}`
			);

			return (data || []).map((line: ArchivedRowType) => ({
				id: line.id,
				episodeId: line.episode_id,
				season: line.season,
				timestampStr: line.timestamp_str,
				speaker: line.speaker,
				line: line.line,
				edited: line.edited,
				createdAt: line.created_at,
				updatedAt: line.updated_at,
				versionId: line.version_id,
				archivedAt: line.archived_at
			}));
		} catch (error) {
			throw this.handleError(error);
		}
	}
}
