import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { historyService } from '$lib/services/HistoryService';

export const GET: RequestHandler = async ({ params, url }) => {
	const { id: episodeId } = params;

	if (!episodeId) {
		return error(400, { message: 'Episode ID is required' });
	}

	try {
		// Check if we only need stats (for badge display)
		const statsOnly = url.searchParams.get('stats_only') === 'true';

		if (statsOnly) {
			const stats = await historyService.getEpisodeHistoryStats(episodeId);
			return json({ stats });
		}

		// Get full history data
		const filters = {
			status: url.searchParams.getAll('status') as
				| ('pending' | 'approved' | 'rejected' | 'deleted')[]
				| undefined,
			contributor: url.searchParams.get('contributor') || undefined,
			dateRange:
				url.searchParams.get('start_date') && url.searchParams.get('end_date')
					? {
							start: url.searchParams.get('start_date')!,
							end: url.searchParams.get('end_date')!
						}
					: undefined
		};

		const historyData = await historyService.getEpisodeHistory(episodeId, filters);
		console.log('logme ', { historyData });
		return json(historyData);
	} catch (err) {
		console.error('Error fetching episode history:', err);
		return error(500, {
			message: err instanceof Error ? err.message : 'Failed to fetch episode history'
		});
	}
};
