import type { PendingEditType } from '../types/editor';
import type { IEditorRepository } from '../repositories/EditorRepository';
import { SupabaseEditorRepository } from '../repositories/EditorRepository';
import { createErrorHandler } from '../utils/errors';
import { supabase } from '$lib/supabase';

export interface ModeratorActionsType {
	approve: (editId: string, moderatorId: string) => Promise<void>;
	reject: (editId: string, moderatorId: string, reason?: string) => Promise<void>;
	fetchPending: () => Promise<PendingEditType[]>;
	bulkApprove: (editIds: string[], moderatorId: string) => Promise<void>;
	bulkReject: (editIds: string[], moderatorId: string, reason?: string) => Promise<void>;
}

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

	async fetchPendingEdits(): Promise<PendingEditType[]> {
		try {
			const repository = await this.getRepository();
			return await repository.fetchPendingEdits();
		} catch (error) {
			throw this.handleError(error);
		}
	}

	async approveEdit(editId: string): Promise<void> {
		try {
			const userId = await this.getCurrentUserId();
			if (!userId) {
				throw new Error('User must be authenticated to moderate edits');
			}

			if (!(await this.isUserModerator(userId))) {
				throw new Error('User must be a moderator to approve edits');
			}

			const repository = await this.getRepository();
			await repository.approveEdit(editId, userId);
		} catch (error) {
			throw this.handleError(error);
		}
	}

	async rejectEdit(editId: string, reason?: string): Promise<void> {
		try {
			const userId = await this.getCurrentUserId();
			if (!userId) {
				throw new Error('User must be authenticated to moderate edits');
			}

			if (!(await this.isUserModerator(userId))) {
				throw new Error('User must be a moderator to reject edits');
			}

			const repository = await this.getRepository();
			await repository.rejectEdit(editId, userId, reason);
		} catch (error) {
			throw this.handleError(error);
		}
	}

	async bulkApprove(editIds: string[]): Promise<void> {
		try {
			const userId = await this.getCurrentUserId();
			if (!userId) {
				throw new Error('User must be authenticated to moderate edits');
			}

			if (!(await this.isUserModerator(userId))) {
				throw new Error('User must be a moderator to approve edits');
			}

			const repository = await this.getRepository();

			// Process in batches to avoid overwhelming the database
			const batchSize = 10;
			for (let i = 0; i < editIds.length; i += batchSize) {
				const batch = editIds.slice(i, i + batchSize);
				await Promise.all(batch.map((editId) => repository.approveEdit(editId, userId)));
			}
		} catch (error) {
			throw this.handleError(error);
		}
	}

	async bulkReject(editIds: string[], reason?: string): Promise<void> {
		try {
			const userId = await this.getCurrentUserId();
			if (!userId) {
				throw new Error('User must be authenticated to moderate edits');
			}

			if (!(await this.isUserModerator(userId))) {
				throw new Error('User must be a moderator to reject edits');
			}

			const repository = await this.getRepository();

			// Process in batches to avoid overwhelming the database
			const batchSize = 10;
			for (let i = 0; i < editIds.length; i += batchSize) {
				const batch = editIds.slice(i, i + batchSize);
				await Promise.all(batch.map((editId) => repository.rejectEdit(editId, userId, reason)));
			}
		} catch (error) {
			throw this.handleError(error);
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

			const { data, error } = await supabase
				.from('line_edits')
				.select('status, created_at')
				.gte('created_at', `${today}T00:00:00.000Z`)
				.lt('created_at', `${today}T23:59:59.999Z`);

			if (error) {
				throw new Error(`Failed to fetch edit statistics: ${error.message}`);
			}

			const stats = {
				pending: 0,
				approved: 0,
				rejected: 0,
				totalToday: data?.length || 0
			};

			data?.forEach((edit: { status: string }) => {
				switch (edit.status) {
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

			return stats;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	getModeratorActions(): ModeratorActionsType {
		return {
			approve: (editId: string) => this.approveEdit(editId),
			reject: (editId: string, reason?: string) => this.rejectEdit(editId, reason),
			fetchPending: () => this.fetchPendingEdits(),
			bulkApprove: (editIds: string[]) => this.bulkApprove(editIds),
			bulkReject: (editIds: string[], reason?: string) => this.bulkReject(editIds, reason)
		};
	}
}

export const moderatorService = new ModeratorService();
