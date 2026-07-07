import fs from 'fs';
import path from 'path';

/**
 * Converts a whisply JSON export into the transcript format expected by
 * migration-scripts/migrate-transcripts.js: an array of
 * { time, startTime, stopTime, speaker, line, episode, edited }.
 *
 * whisply (with --annotate) tags `speaker` on individual words, not on the
 * ~1-5 word chunks themselves - a single chunk can span a speaker change.
 * So segments are built by walking the flattened word list and starting a
 * new line whenever the speaker changes, matching how existing transcripts
 * group full speaker turns.
 */

function parseArguments(args) {
	const parsedArgs = {};
	for (const arg of args) {
		const [key, value] = arg.split('=');
		parsedArgs[key] = value;
	}
	return parsedArgs;
}

function formatTime(totalSeconds) {
	const seconds = Math.floor(totalSeconds);
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const secs = seconds % 60;
	return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function mergeWordsBySpeaker(chunks) {
	const words = chunks.flatMap((chunk) => chunk.words || []);
	const merged = [];

	for (const word of words) {
		const speaker = word.speaker || 'Unknown';
		const text = word.word.trim();
		if (!text) continue;

		const last = merged[merged.length - 1];
		if (last && last.speaker === speaker) {
			last.text += ' ' + text;
			last.end = word.end;
		} else {
			merged.push({ speaker, text, start: word.start, end: word.end });
		}
	}
	return merged;
}

function formatSpeakerLabel(speaker) {
	const match = speaker.match(/^SPEAKER_0*(\d+)$/);
	return match ? `Speaker ${match[1]}` : `Speaker ${speaker}`;
}

// `offsetSeconds` accounts for a musical intro that was cut off the audio
// before transcribing (so whisply's timestamps start at 0 relative to the
// trimmed file). Since the app plays back the original, untrimmed audio,
// every timestamp needs to be shifted forward by the intro length so lines
// still line up with the real audio.
function convertWhisplyToTranscript(whisplyJsonPath, episodeName, offsetSeconds) {
	const raw = JSON.parse(fs.readFileSync(whisplyJsonPath, 'utf-8'));
	const languages = Object.keys(raw.transcription);
	const chunks = raw.transcription[languages[0]].chunks;

	const merged = mergeWordsBySpeaker(chunks);

	return merged.map((seg) => ({
		time: formatTime(seg.start + offsetSeconds), // Keep backwards compatibility
		startTime: formatTime(seg.start + offsetSeconds),
		stopTime: formatTime(seg.end + offsetSeconds),
		speaker: formatSpeakerLabel(seg.speaker),
		line: seg.text,
		episode: episodeName,
		edited: false
	}));
}

const args = parseArguments(process.argv.slice(2));

if (!args['--input'] || !args['--episode']) {
	console.log('Usage:');
	console.log(
		'  node scripts/whisply-to-transcript.js --input=<whisply_output.json> --episode=<episode_code> [--output=<output_file>] [--offset=<seconds>]'
	);
	process.exit(1);
}

const outputPath = args['--output'] || `src/assets/transcripts/${args['--episode']}.json`;
const offsetSeconds = args['--offset'] ? parseFloat(args['--offset']) : 0;
const transcript = convertWhisplyToTranscript(args['--input'], args['--episode'], offsetSeconds);

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(transcript, null, 2));
console.log(`Converted ${transcript.length} lines to: ${outputPath}`);
