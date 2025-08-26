import { error } from '@sveltejs/kit';
import epList from '../../../assets/episodes.json';

// Generate consistent color for each speaker
function getSpeakerColor(speaker: string): string {
	// Create a simple hash of the speaker name
	let hash = 0;
	for (let i = 0; i < speaker.length; i++) {
		const char = speaker.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash; // Convert to 32bit integer
	}

	// Use hash to pick from a set of visually distinct colors
	const colors = [
		'bg-blue-100 text-blue-800 border-blue-200',
		'bg-purple-100 text-purple-800 border-purple-200',
		'bg-pink-100 text-pink-800 border-pink-200',
		'bg-red-100 text-red-800 border-red-200',
		'bg-orange-100 text-orange-800 border-orange-200',
		'bg-yellow-100 text-yellow-800 border-yellow-200',
		'bg-lime-100 text-lime-800 border-lime-200',
		'bg-emerald-100 text-emerald-800 border-emerald-200',
		'bg-teal-100 text-teal-800 border-teal-200',
		'bg-cyan-100 text-cyan-800 border-cyan-200',
		'bg-indigo-100 text-indigo-800 border-indigo-200',
		'bg-violet-100 text-violet-800 border-violet-200'
	];

	return colors[Math.abs(hash) % colors.length];
}

export async function load({ params }) {
	const { id } = params;
	const epPromise = import(`../../../assets/transcripts/${id}.json`);
	const hits = await epPromise;

	if (id) {
		// Process speakers on server side
		const epScript = hits.default;

		// Find all unknown speakers and create mapping
		const unknownSpeakers = [
			...new Set(
				(epScript as Array<{ speaker: string }>)
					.map((hit) => hit.speaker)
					.filter((speaker: string) => /^\d+$/.test(speaker) || /^spk_\d+$/.test(speaker))
			)
		];

		const unknownSpeakerMap = new Map<string, number>();
		unknownSpeakers.forEach((speaker, index) => {
			unknownSpeakerMap.set(speaker, index + 1);
		});

		// Enhance hits with processed speaker data
		const processedHits = (
			epScript as Array<{
				speaker: string;
				edited: boolean;
				time: string;
				line: string;
				id?: string;
			}>
		).map((hit) => ({
			...hit,
			displaySpeaker:
				/^\d+$/.test(hit.speaker) || /^spk_\d+$/.test(hit.speaker)
					? `Unknown Speaker #${unknownSpeakerMap.get(hit.speaker)}`
					: hit.speaker,
			speakerColor: getSpeakerColor(hit.speaker)
		}));

		// Calculate transcript quality stats
		const totalLines = processedHits.length;
		const editedLines = processedHits.filter((hit) => hit.edited).length;
		const editedPercentage = totalLines > 0 ? Math.round((editedLines / totalLines) * 100) : 0;
		const transcriptStats = {
			totalLines,
			editedLines,
			editedPercentage,
			isFullyEdited: editedPercentage === 100,
			isMostlyEdited: editedPercentage >= 50
		};

		// Get episode metadata
		const episodeInfo = epList.find((x) => x.ep === id.replace('.json', ''));

		return {
			episode: id,
			hits: { default: processedHits },
			transcriptStats,
			episodeInfo
		};
	}

	error(404, 'Not found');
}

export const prerender = true;
