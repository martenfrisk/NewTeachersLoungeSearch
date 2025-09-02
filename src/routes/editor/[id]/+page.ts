import { error } from '@sveltejs/kit';
import episodesPageData from '../../../assets/generated/episodes-page-data.json';
import { SupabaseEditorRepository } from '$lib/repositories/EditorRepository';
import type { EpisodeInfo } from '$lib/types/episode';
import type { PageLoad } from './$types';

export async function entries() {
	// Only include episodes that have audio (suitable for editing)
	return episodesPageData.episodes
		.filter((episode) => episode.hasAudio)
		.map((episode) => ({ id: episode.ep }));
}

export const load: PageLoad = async ({ params }) => {
	const { id } = params;

	if (!id || typeof id !== 'string') {
		error(400, 'Invalid episode ID');
	}

	try {
		// Use database repository instead of static files
		const repository = new SupabaseEditorRepository();
		const transcriptLines = await repository.fetchEpisodeTranscript(id);
		// Get episode metadata
		const episodeInfo: EpisodeInfo | undefined = episodesPageData.episodes.find(
			(x) => x.ep === id.replace('.json', '')
		);

		if (!episodeInfo) {
			error(404, `Episode metadata not found for ${id}`);
		}

		// Check if episode has audio (required for editing)
		if (!episodeInfo.hasAudio) {
			error(400, `Episode ${id} does not have audio available for editing`);
		}

		// Calculate transcript statistics
		const totalLines = transcriptLines.length;
		const editedLines = transcriptLines.filter((line) => line.edited).length;
		const editedPercentage = totalLines > 0 ? Math.round((editedLines / totalLines) * 100) : 0;
		const isFullyEdited = editedPercentage === 100;
		const isMostlyEdited = editedPercentage >= 75;

		const transcriptStats = {
			totalLines,
			editedLines,
			editedPercentage,
			isFullyEdited,
			isMostlyEdited
		};

		return {
			episode: id,
			transcript: transcriptLines,
			transcriptStats,
			episodeInfo,
			meta: {
				title: `Edit ${episodeInfo.title || id} - Transcript Editor`,
				description: `Edit podcast transcript for ${episodeInfo.title} with audio synchronization for accurate speaker identification and timing.`
			}
		};
	} catch (err) {
		console.error(`Failed to load episode ${id} for editing:`, err);

		if (err instanceof Error) {
			// Handle specific error types
			if (err.message.includes('Cannot resolve module')) {
				error(404, `Episode ${id} not found`);
			}
			if (err.message.includes('Invalid transcript')) {
				error(500, `Invalid transcript data for episode ${id}`);
			}
		}

		error(500, `Failed to load episode ${id} for editing`);
	}
};

// Editor pages should not be prerendered since they're dynamic and user-specific
export const prerender = false;
export const ssr = false;
