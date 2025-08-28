import { error } from '@sveltejs/kit';
import episodesPageData from '$lib/../assets/generated/episodes-page-data.json';
import { EpisodeDataProcessor } from '$lib/services/EpisodeDataProcessor';
import type { EpisodePageData, EpisodeInfo } from '$lib/types/episode';

export async function entries() {
	return episodesPageData.episodes.map((episode) => ({ id: episode.ep }));
}

export async function load({ params }): Promise<EpisodePageData> {
	const { id } = params;

	if (!id || typeof id !== 'string') {
		error(400, 'Invalid episode ID');
	}

	try {
		// Import transcript data
		const transcriptModule = await import(`../../../assets/transcripts/${id}.json`);
		const rawTranscript = transcriptModule.default;

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
			hits: { default: processedTranscript },
			transcriptStats,
			episodeInfo
		};
	} catch (err) {
		console.error(`Failed to load episode ${id}:`, err);

		if (err instanceof Error) {
			// Handle specific error types
			if (err.message.includes('Cannot resolve module')) {
				error(404, `Episode ${id} not found`);
			}
			if (err.message.includes('Invalid transcript')) {
				error(500, `Invalid transcript data for episode ${id}`);
			}
		}

		error(500, `Failed to load episode ${id}`);
	}
}

export const prerender = true;
