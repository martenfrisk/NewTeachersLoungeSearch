import type {
	TranscriptLine,
	ProcessedTranscriptLine,
	SpeakerProcessingOptions
} from '$lib/types/episode';

// Curated "annotation ink" palette: deep, muted tones that stay distinguishable
// per-speaker while harmonizing with the Blue Book / paper / walnut system.
// Deliberately excludes red (reads as an error), yellow/lime (low contrast on
// warm paper) and hot pink. The text-*-800 shade is what the transcript pulls
// out for the coloured speaker name; the bg/border shades back the pill used in
// episode search results.
const SPEAKER_COLORS = [
	'bg-blue-100 text-blue-800 border-blue-200', // navy
	'bg-teal-100 text-teal-800 border-teal-200', // teal
	'bg-amber-100 text-amber-800 border-amber-200', // ochre
	'bg-rose-100 text-rose-800 border-rose-200', // burgundy
	'bg-indigo-100 text-indigo-800 border-indigo-200', // indigo
	'bg-emerald-100 text-emerald-800 border-emerald-200', // pine
	'bg-purple-100 text-purple-800 border-purple-200', // plum
	'bg-cyan-100 text-cyan-800 border-cyan-200', // steel
	'bg-orange-100 text-orange-800 border-orange-200', // rust
	'bg-slate-100 text-slate-700 border-slate-200' // slate
] as const;

const speakerColorCache = new Map<string, string>();

export function getSpeakerColor(speaker: string): string {
	if (speakerColorCache.has(speaker)) {
		return speakerColorCache.get(speaker)!;
	}

	let hash = 0;
	for (let i = 0; i < speaker.length; i++) {
		const char = speaker.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash;
	}

	const color = SPEAKER_COLORS[Math.abs(hash) % SPEAKER_COLORS.length];
	speakerColorCache.set(speaker, color);
	return color;
}

// Diarization leaves a machine-assigned label rather than a name. Three shapes
// exist in the corpus (counts as of 2026-08-01, 126,301 transcript_lines rows):
//
//   spk_0 … spk_N     84,551   scripts/whisply-to-transcript.js
//   Speaker 0 … N     26,732   scripts/transform-script.js
//   bare digits        10,966   raw whisper output, migrated as-is
//
// The `Speaker N` form was previously unmatched, so 26,732 lines rendered their
// raw label on the public episode pages instead of "Unknown Speaker #n".
//
// Separators are permissive (`spk_1`, `Speaker 1`, `SPEAKER-01`) but the prefix
// is not: the pattern must stay anchored to `speaker`/`spk`. Real speakers in the
// corpus include `Customer 1`, `Waiter 2`, `Demon Voice 1` and `Delivery Man 1`,
// so anything as loose as /^\w+ \d+$/ would swallow named characters.
const MACHINE_SPEAKER_PATTERNS = [
	/^\d+$/, // "4"
	/^spk[\s._-]*\d+$/i, // "spk_0"
	/^speaker[\s._-]*\d+$/i // "Speaker 10", "SPEAKER-01"
];

export function isUnknownSpeaker(speaker: string): boolean {
	const trimmed = speaker.trim();
	return MACHINE_SPEAKER_PATTERNS.some((pattern) => pattern.test(trimmed));
}

export function createUnknownSpeakerMap(speakers: string[]): Map<string, number> {
	const unknownSpeakers = speakers.filter(isUnknownSpeaker);
	const uniqueUnknownSpeakers = [...new Set(unknownSpeakers)];

	const map = new Map<string, number>();
	uniqueUnknownSpeakers.forEach((speaker, index) => {
		map.set(speaker, index + 1);
	});

	return map;
}

export function getDisplaySpeaker(speaker: string, unknownSpeakerMap: Map<string, number>): string {
	if (isUnknownSpeaker(speaker)) {
		const speakerNumber = unknownSpeakerMap.get(speaker);
		return speakerNumber ? `Unknown Speaker #${speakerNumber}` : speaker;
	}
	return speaker;
}

export function processTranscriptSpeakers(
	transcript: TranscriptLine[],
	options: SpeakerProcessingOptions = {}
): ProcessedTranscriptLine[] {
	const { generateColors = true, mapUnknownSpeakers = true } = options;

	const speakers = transcript.map((line) => line.speaker);
	const unknownSpeakerMap = mapUnknownSpeakers ? createUnknownSpeakerMap(speakers) : new Map();

	return transcript.map((line) => ({
		...line,
		displaySpeaker: getDisplaySpeaker(line.speaker, unknownSpeakerMap),
		speakerColor: generateColors ? getSpeakerColor(line.speaker) : ''
	}));
}

export function clearSpeakerColorCache(): void {
	speakerColorCache.clear();
}
