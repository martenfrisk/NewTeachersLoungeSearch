import type { PendingEpisodeSubmissionType, EditableTranscriptLineType } from '../types/editor';
import type { IEditorRepository } from '../repositories/EditorRepository';
import { SupabaseEditorRepository } from '../repositories/EditorRepository';
import { createErrorHandler } from '../utils/errors';
import { supabase } from '$lib/supabase';

export class ModeratorService {
	private repository: IEditorRepository | null = null;
	private readonly handleError = createErrorHandler('ModeratorService');

	constructor(repository?: IEditorRepository) {
		this.repository = repository || null;
	}

	private async getRepository(): Promise<IEditorRepository> {
		if (this.repository) {
			return this.repository;
		}
		return new SupabaseEditorRepository();
	}

	async isUserModerator(userId: string): Promise<boolean> {
		try {
			const { data, error } = await supabase.from('users').select('role').eq('id', userId).single();

			if (error) {
				console.warn('Failed to check user role:', error.message);
				return false;
			}

			return data?.role === 'moderator' || data?.role === 'admin';
		} catch (error) {
			console.warn('Error checking user role:', error);
			return false;
		}
	}

	async getCurrentUserId(): Promise<string | null> {
		try {
			const { data, error } = await supabase.auth.getUser();
			if (error || !data.user) {
				return null;
			}
			return data.user.id;
		} catch (error) {
			console.warn('Error getting current user:', error);
			return null;
		}
	}

	async getEditStatistics(): Promise<{
		pending: number;
		approved: number;
		rejected: number;
		totalToday: number;
	}> {
		try {
			const today = new Date().toISOString().split('T')[0];

			// Get episode_submissions stats only
			const { data: episodeData, error: episodeError } = await supabase
				.from('episode_submissions')
				.select('status, created_at')
				.gte('created_at', `${today}T00:00:00.000Z`)
				.lt('created_at', `${today}T23:59:59.999Z`);

			if (episodeError) {
				throw new Error(`Failed to fetch edit statistics: ${episodeError.message}`);
			}

			const stats = {
				pending: 0,
				approved: 0,
				rejected: 0,
				totalToday: 0
			};

			// Count episode submissions
			if (episodeData) {
				stats.totalToday += episodeData.length;
				episodeData.forEach((submission: { status: string }) => {
					switch (submission.status) {
						case 'pending':
							stats.pending++;
							break;
						case 'approved':
							stats.approved++;
							break;
						case 'rejected':
							stats.rejected++;
							break;
					}
				});
			}

			return stats;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	// NEW EPISODE SUBMISSION METHODS

	async fetchPendingEpisodeSubmissions(): Promise<PendingEpisodeSubmissionType[]> {
		try {
			const repository = await this.getRepository();
			return await repository.fetchPendingEpisodeSubmissions();
		} catch (error) {
			throw this.handleError(error);
		}
	}

	async fetchApprovedEpisodeSubmissions(): Promise<PendingEpisodeSubmissionType[]> {
		try {
			const repository = await this.getRepository();
			return await repository.fetchApprovedEpisodeSubmissions();
		} catch (error) {
			throw this.handleError(error);
		}
	}

	async fetchRejectedEpisodeSubmissions(): Promise<PendingEpisodeSubmissionType[]> {
		try {
			const repository = await this.getRepository();
			return await repository.fetchRejectedEpisodeSubmissions();
		} catch (error) {
			throw this.handleError(error);
		}
	}

	async approveEpisodeSubmission(submissionId: string): Promise<void> {
		try {
			const userId = await this.getCurrentUserId();
			if (!userId) {
				throw new Error('User must be authenticated to moderate submissions');
			}

			if (!(await this.isUserModerator(userId))) {
				throw new Error('User must be a moderator to approve submissions');
			}

			const repository = await this.getRepository();
			await repository.approveEpisodeSubmission(submissionId, userId);
		} catch (error) {
			throw this.handleError(error);
		}
	}

	async rejectEpisodeSubmission(submissionId: string, reason?: string): Promise<void> {
		try {
			const userId = await this.getCurrentUserId();
			if (!userId) {
				throw new Error('User must be authenticated to moderate submissions');
			}

			if (!(await this.isUserModerator(userId))) {
				throw new Error('User must be a moderator to reject submissions');
			}

			const repository = await this.getRepository();
			await repository.rejectEpisodeSubmission(submissionId, userId, reason);
		} catch (error) {
			throw this.handleError(error);
		}
	}

	async bulkApproveEpisodeSubmissions(submissionIds: string[]): Promise<void> {
		try {
			const userId = await this.getCurrentUserId();
			if (!userId) {
				throw new Error('User must be authenticated to moderate submissions');
			}

			if (!(await this.isUserModerator(userId))) {
				throw new Error('User must be a moderator to approve submissions');
			}

			const repository = await this.getRepository();

			// Process in batches to avoid overwhelming the database
			const batchSize = 5; // Smaller batch size for episode submissions since they're heavier operations
			for (let i = 0; i < submissionIds.length; i += batchSize) {
				const batch = submissionIds.slice(i, i + batchSize);
				await Promise.all(
					batch.map((submissionId) => repository.approveEpisodeSubmission(submissionId, userId))
				);
			}
		} catch (error) {
			throw this.handleError(error);
		}
	}

	async bulkRejectEpisodeSubmissions(submissionIds: string[], reason?: string): Promise<void> {
		try {
			const userId = await this.getCurrentUserId();
			if (!userId) {
				throw new Error('User must be authenticated to moderate submissions');
			}

			if (!(await this.isUserModerator(userId))) {
				throw new Error('User must be a moderator to reject submissions');
			}

			const repository = await this.getRepository();

			// Process in batches to avoid overwhelming the database
			const batchSize = 10;
			for (let i = 0; i < submissionIds.length; i += batchSize) {
				const batch = submissionIds.slice(i, i + batchSize);
				await Promise.all(
					batch.map((submissionId) =>
						repository.rejectEpisodeSubmission(submissionId, userId, reason)
					)
				);
			}
		} catch (error) {
			throw this.handleError(error);
		}
	}

	async fetchOriginalTranscript(episodeId: string): Promise<EditableTranscriptLineType[]> {
		try {
			const repository = await this.getRepository();
			return await repository.fetchEpisodeTranscript(episodeId);
		} catch (error) {
			throw this.handleError(error);
		}
	}
}

export const moderatorService = new ModeratorService();
