import { error } from '@sveltejs/kit';
import episodesPageData from '../../../assets/generated/episodes-page-data.json';
import { EpisodeDataProcessor } from '$lib/services/EpisodeDataProcessor';
import type { EpisodeInfo } from '$lib/types/episode';
import type { PageLoad } from './$types';

export async function entries() {
	// Only include episodes that have audio (suitable for editing)
	return episodesPageData.episodes
		.filter((episode) => episode.hasAudio)
		.map((episode) => ({ id: episode.ep }));
}

export const load: PageLoad = async ({ params, fetch }) => {
	const { id } = params;

	if (!id || typeof id !== 'string') {
		error(400, 'Invalid episode ID');
	}

	try {
		const response = await fetch(`/transcripts/${id}.json`);
		if (!response.ok) {
			error(404, `Transcript not found for episode ${id}`);
		}

		const rawTranscript = await response.json();

		if (!rawTranscript) {
			error(404, `Transcript not found for episode ${id}`);
		}

		// Get episode data processor instance
		const processor = EpisodeDataProcessor.getInstance();

		// Validate and process transcript
		const validatedTranscript = processor.validateTranscript(rawTranscript);
		const processedTranscript = processor.processTranscript(id, validatedTranscript);

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

		// Use pre-calculated stats from episode info if available, otherwise calculate
		const transcriptStats =
			episodeInfo && 'editedPercentage' in episodeInfo
				? {
						totalLines: episodeInfo.totalLines || 0,
						editedLines: episodeInfo.editedLines || 0,
						editedPercentage: episodeInfo.editedPercentage || 0,
						isFullyEdited: episodeInfo.isFullyEdited || false,
						isMostlyEdited: episodeInfo.isMostlyEdited || false
					}
				: processor.calculateTranscriptStats(id, validatedTranscript);

		return {
			episode: id,
			transcript: processedTranscript,
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
