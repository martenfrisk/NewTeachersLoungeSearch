import type {
	EpisodeHistoryDataType,
	EpisodeHistoryStatsType,
	HistoryTimelineEntryType,
	LineHistorySummaryType,
	HistoryFilterType
} from '../types/history';
import { supabase } from '$lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { createErrorHandler } from '../utils/errors';

interface VersionRecord {
	id: string;
	episode_id: string;
	version_number: number;
	created_by?: string;
	source_type: 'original' | 'submission' | 'manual';
	submission_id?: string;
	change_summary?: string;
	created_at: string;
	is_current: boolean;
	lines_count: number;
	users?: { username: string; email?: string };
}

export class HistoryService {
	private readonly handleError = createErrorHandler('HistoryService');

	/**
	 * Get complete history data for an episode
	 */
	async getEpisodeHistory(
		episodeIdentifier: string,
		filters?: HistoryFilterType
	): Promise<EpisodeHistoryDataType> {
		try {
			// First, get the episode UUID from the ep code if needed
			const episodeId = await this.getEpisodeUUID(episodeIdentifier);
			if (!episodeId) {
				return this.createEmptyHistoryData(episodeIdentifier);
			}

			// Build the base query for episode transcript versions
			let query = supabase
				.from('episode_transcript_versions')
				.select(
					`
					id,
					episode_id,
					version_number,
					created_by,
					source_type,
					submission_id,
					change_summary,
					created_at,
					is_current,
					lines_count,
					users!created_by(username, email)
				`
				)
				.eq('episode_id', episodeId)
				.order('created_at', { ascending: false });

			// Apply filters
			if (filters?.contributor) {
				query = query.eq('users.username', filters.contributor);
			}
			if (filters?.dateRange) {
				query = query
					.gte('created_at', filters.dateRange.start)
					.lte('created_at', filters.dateRange.end);
			}

			const { data: versions, error } = await query;
			console.log('logme ', { versions, error });
			if (error) {
				throw new Error(`Failed to fetch episode history: ${error.message}`);
			}

			if (!versions || versions.length === 0) {
				return this.createEmptyHistoryData(episodeId);
			}

			// Get episode info
			const { data: episode } = await supabase
				.from('episodes')
				.select('ep')
				.eq('id', episodeId)
				.single();

			const stats = this.calculateHistoryStats(versions as unknown as VersionRecord[]);
			const timeline = this.buildTimeline(versions as unknown as VersionRecord[]);
			const lineHistories = await this.buildLineHistories(episodeId);

			return {
				episodeId: episodeIdentifier,
				episodeEp: episode?.ep || '',
				stats,
				timeline,
				lineHistories,
				hasHistory: versions.length > 0
			};
		} catch (error) {
			this.handleError(error);
			return this.createEmptyHistoryData(episodeIdentifier);
		}
	}

	/**
	 * Get quick stats for displaying badges
	 */
	async getEpisodeHistoryStats(
		episodeIdentifier: string,
		customFetch?: typeof fetch
	): Promise<EpisodeHistoryStatsType | null> {
		try {
			// Use custom fetch if provided (for SSR)
			const client = customFetch
				? createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
						global: { fetch: customFetch }
					})
				: supabase;

			// First, get the episode UUID from the ep code if needed
			const episodeId = await this.getEpisodeUUID(episodeIdentifier, client);
			if (!episodeId) {
				return null;
			}

			const { data: versions, error } = await client
				.from('episode_transcript_versions')
				.select(
					`
					id,
					version_number,
					source_type,
					created_by,
					created_at,
					is_current
				`
				)
				.eq('episode_id', episodeId);

			if (error) {
				throw new Error(`Failed to fetch episode history stats: ${error.message}`);
			}

			if (!versions || versions.length === 0) {
				return null;
			}

			return this.calculateHistoryStats(versions as unknown as VersionRecord[]);
		} catch (error) {
			this.handleError(error);
			return null;
		}
	}

	/**
	 * Get history for a specific transcript line
	 */
	async getLineHistory(lineId: string): Promise<LineHistorySummaryType | null> {
		try {
			// Get current line data
			const { data: currentLine, error: lineError } = await supabase
				.from('transcript_lines')
				.select('id, episode_id, timestamp_str, speaker, line, edited, updated_at')
				.eq('id', lineId)
				.single();

			if (lineError) {
				throw new Error(`Failed to fetch current line: ${lineError.message}`);
			}

			if (!currentLine) {
				return null;
			}

			// Get archived versions of this line from transcript_lines_archive
			const { data: archivedVersions, error: archiveError } = await supabase
				.from('transcript_lines_archive')
				.select(
					`
					id,
					timestamp_str,
					speaker,
					line,
					archived_at,
					version_id,
					episode_transcript_versions!version_id(
						version_number,
						created_by,
						created_at,
						users!created_by(username)
					)
				`
				)
				.eq('id', lineId)
				.order('archived_at', { ascending: false });

			if (archiveError) {
				throw new Error(`Failed to fetch line history: ${archiveError.message}`);
			}

			const editCount = (archivedVersions?.length || 0) + (currentLine.edited ? 1 : 0);
			const lastVersion = archivedVersions?.[0];
			const lastEditInfo = lastVersion?.episode_transcript_versions;

			// Handle user info properly - it could be an array or single object
			let lastEditedBy = '';
			if (lastEditInfo && 'users' in lastEditInfo && lastEditInfo.users) {
				const users = lastEditInfo.users as { username: string }[] | { username: string };
				if (Array.isArray(users)) {
					lastEditedBy = users[0]?.username || '';
				} else {
					lastEditedBy = users?.username || '';
				}
			}

			return {
				lineId,
				timestamp: currentLine.timestamp_str,
				speaker: currentLine.speaker,
				originalText: lastVersion?.line || currentLine.line,
				currentText: currentLine.line,
				editCount,
				lastEditedAt: currentLine.updated_at || lastVersion?.archived_at || '',
				lastEditedBy,
				hasActiveEdits: currentLine.edited || false
			};
		} catch (error) {
			this.handleError(error);
			return null;
		}
	}

	private calculateHistoryStats(versions: VersionRecord[]): EpisodeHistoryStatsType {
		const totalEdits = versions.length;
		const approvedEdits = versions.filter((v) => v.is_current).length;
		const pendingEdits = 0; // No pending concept in current schema
		const uniqueContributors = new Set(versions.map((v) => v.created_by).filter(Boolean)).size;
		const lastEditedAt = versions.length > 0 ? versions[0]?.created_at : undefined;

		// Map source types to edit types
		const editsByType = {
			text: 0,
			timestamp: 0,
			speaker: 0,
			combined: 0
		};

		versions.forEach((version) => {
			// Since we don't have granular change tracking, categorize by source type
			if (version.source_type === 'submission') {
				editsByType.combined++; // Submissions likely contain multiple types of changes
			} else if (version.source_type === 'manual') {
				editsByType.text++; // Manual edits are typically text changes
			}
		});

		return {
			totalEdits,
			approvedEdits,
			pendingEdits,
			uniqueContributors,
			lastEditedAt,
			editsByType
		};
	}

	private buildTimeline(versions: VersionRecord[]): HistoryTimelineEntryType[] {
		return versions.map((version) => {
			const editType = this.mapSourceTypeToEditTypes(version.source_type);
			const changeDescription =
				version.change_summary || this.generateChangeDescription(version, editType);

			return {
				id: version.id,
				timestamp: version.created_at,
				contributorName: version.users?.username || 'Unknown',
				editType,
				lineTimestamp: '', // Not available at version level
				lineSpeaker: '', // Not available at version level
				changeDescription,
				status: version.is_current ? 'approved' : 'pending'
			};
		});
	}

	private async buildLineHistories(episodeId: string): Promise<LineHistorySummaryType[]> {
		// Get lines that have been edited for this episode
		const { data: editedLines, error } = await supabase
			.from('transcript_lines')
			.select('id, timestamp_str, speaker, line, edited, updated_at')
			.eq('episode_id', episodeId)
			.eq('edited', true);

		if (error || !editedLines) {
			return [];
		}

		const lineHistories: LineHistorySummaryType[] = [];

		for (const line of editedLines) {
			// Get archived versions for this line
			const { data: archivedVersions } = await supabase
				.from('transcript_lines_archive')
				.select('line, archived_at')
				.eq('id', line.id)
				.order('archived_at', { ascending: false });

			const editCount = (archivedVersions?.length || 0) + 1; // +1 for current edit
			const lastVersion = archivedVersions?.[0];

			lineHistories.push({
				lineId: line.id,
				timestamp: line.timestamp_str,
				speaker: line.speaker,
				originalText: lastVersion?.line || line.line,
				currentText: line.line,
				editCount,
				lastEditedAt: line.updated_at || lastVersion?.archived_at || '',
				lastEditedBy: 'Unknown', // Would need to track this in schema
				hasActiveEdits: line.edited
			});
		}

		return lineHistories;
	}

	private generateChangeDescription(version: VersionRecord, changeTypes: string[]): string {
		if (version.change_summary) {
			return version.change_summary;
		}

		if (changeTypes.length === 0) return 'Made changes';

		const descriptions: string[] = [];

		if (changeTypes.includes('text')) {
			descriptions.push('updated text');
		}
		if (changeTypes.includes('timestamp')) {
			descriptions.push('adjusted timestamp');
		}
		if (changeTypes.includes('speaker')) {
			descriptions.push('changed speaker');
		}

		return descriptions.length > 1
			? descriptions.slice(0, -1).join(', ') + ' and ' + descriptions[descriptions.length - 1]
			: descriptions[0] || 'made changes';
	}

	private mapSourceTypeToEditTypes(sourceType: string): string[] {
		switch (sourceType) {
			case 'submission':
				return ['combined'];
			case 'manual':
				return ['text'];
			case 'original':
				return [];
			default:
				return [];
		}
	}

	/**
	 * Get episode UUID from either a UUID or an ep code (like "S01E01")
	 */
	private async getEpisodeUUID(identifier: string, client = supabase): Promise<string | null> {
		// If it's already a UUID, return it
		const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
		if (uuidRegex.test(identifier)) {
			return identifier;
		}

		// Otherwise, look it up by ep code
		try {
			const { data: episode, error } = await client
				.from('episodes')
				.select('id')
				.eq('ep', identifier)
				.single();

			if (error || !episode) {
				return null;
			}

			return episode.id;
		} catch (error) {
			console.warn(`Failed to get episode UUID for identifier ${identifier}:`, error);
			return null;
		}
	}

	private createEmptyHistoryData(episodeId: string): EpisodeHistoryDataType {
		return {
			episodeId,
			episodeEp: '',
			stats: {
				totalEdits: 0,
				approvedEdits: 0,
				pendingEdits: 0,
				uniqueContributors: 0,
				editsByType: {
					text: 0,
					timestamp: 0,
					speaker: 0,
					combined: 0
				}
			},
			timeline: [],
			lineHistories: [],
			hasHistory: false
		};
	}
}

// Export singleton instance
export const historyService = new HistoryService();
