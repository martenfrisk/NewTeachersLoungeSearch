import { error } from '@sveltejs/kit';
import episodesPageData from '../../../assets/generated/episodes-page-data.json';
import { EpisodeDataProcessor } from '$lib/services/EpisodeDataProcessor';
import { SupabaseEditorRepository } from '$lib/repositories/EditorRepository';
import { historyService } from '$lib/services/HistoryService';
import type { EpisodePageData, EpisodeInfo, EpisodeNavLink } from '$lib/types/episode';
import type { Config } from '@sveltejs/adapter-vercel';

const toNavLink = (e: { ep: string; title: string }): EpisodeNavLink => ({
	ep: e.ep,
	title: e.title
});

// Episode transcripts are edited rarely and traffic is low, so an hour of
// staleness is an easy trade for skipping a live Supabase round-trip on
// every view - Vercel serves the cached response and revalidates in the
// background for up to a day after that.
export const config: Config = {
	isr: {
		expiration: 3600
	}
};

export async function load({ params, fetch }): Promise<EpisodePageData> {
	const { id } = params;

	if (!id || typeof id !== 'string') {
		error(400, 'Invalid episode ID');
	}

	// Kick this off immediately but don't await it - it's a small, non-
	// critical "X edits" badge, not worth blocking the transcript render on.
	// Streamed to the client as a promise instead (getEpisodeHistoryStats
	// never throws, it catches internally and resolves to null).
	const historyStatsPromise = historyService.getEpisodeHistoryStats(id, fetch);

	try {
		// Always fetch live data from Supabase for server-side rendering.
		const repository = new SupabaseEditorRepository();
		const transcriptLines = await repository.fetchEpisodeTranscript(id);

		if (!transcriptLines || transcriptLines.length === 0) {
			error(404, `Transcript not found for episode ${id}`);
		}
		// Convert to expected format
		const rawTranscript = transcriptLines.map((line) => ({
			id: line.id,
			time: line.time,
			speaker: line.speaker,
			line: line.line,
			edited: line.editState === 'edited'
		}));

		// Get episode data processor instance
		const processor = EpisodeDataProcessor.getInstance();

		// Validate and process transcript
		const validatedTranscript = processor.validateTranscript(rawTranscript);
		const processedTranscript = processor.processTranscript(id, validatedTranscript);

		const epId = id.replace('.json', '');

		// Get episode metadata
		const episodeInfo: EpisodeInfo | undefined = episodesPageData.episodes.find(
			(x) => x.ep === epId
		);

		// Calculate transcript stats from live data
		const transcriptStats = processor.calculateTranscriptStats(id, validatedTranscript);

		// Prev/next walk the flat episode list, which generate:static already
		// orders chronologically (matches season/episode numbering).
		const allEpisodes = episodesPageData.episodes;
		const currentIndex = allEpisodes.findIndex((x) => x.ep === epId);
		const prevEpisode = currentIndex > 0 ? toNavLink(allEpisodes[currentIndex - 1]) : undefined;
		const nextEpisode =
			currentIndex >= 0 && currentIndex < allEpisodes.length - 1
				? toNavLink(allEpisodes[currentIndex + 1])
				: undefined;

		// Season siblings come from the precomputed season grouping so this
		// doesn't need to re-derive "which season is this episode in".
		const season = episodesPageData.seasonsData.find((s) => s.episodes.some((e) => e.ep === epId));
		const seasonEpisodes = season?.episodes.filter((e) => e.ep !== epId).map(toNavLink);

		return {
			episode: id,
			hits: { default: processedTranscript },
			transcriptStats,
			episodeInfo,
			historyStats: historyStatsPromise,
			prevEpisode,
			nextEpisode,
			seasonId: season?.id,
			seasonName: season?.name,
			seasonEpisodes
		};
	} catch (err) {
		console.error(`Failed to load episode ${id}:`, err);

		if (err instanceof Error) {
			if (err.message.includes('No transcript found')) {
				error(404, `Episode ${id} not found`);
			}
			if (err.message.includes('Invalid transcript')) {
				error(500, `Invalid transcript data for episode ${id}`);
			}
		}

		error(500, `Failed to load episode ${id}`);
	}
}
