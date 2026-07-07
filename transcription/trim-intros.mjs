import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';
import { buildEpisodeQueue, filterByOnly, sanitizeStem } from './lib/episode-queue.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, '..');
const RSS_DIR = path.join(REPO_ROOT, 'migration-scripts');
const RAW_DIR = path.join(__dirname, 'audio', 'raw');
const TRIMMED_DIR = path.join(__dirname, 'audio', 'trimmed');
const INTRO_LENGTHS_PATH = path.join(__dirname, 'intro-lengths.json');

// Cuts the musical intro off the front of each raw download so it doesn't
// get transcribed as an extra "speaker". Intro length is per-show/season
// (consistent within a show, different across shows) - fill in real values
// in intro-lengths.json before running. Uses `-c copy` (no re-encode) so
// this is fast and lossless; mp3 doesn't have keyframes so an arbitrary-
// second cut is fine.
function trimFile(src, dest, seconds) {
	execFileSync('ffmpeg', ['-y', '-ss', String(seconds), '-i', src, '-c', 'copy', dest], {
		stdio: ['ignore', 'ignore', 'inherit']
	});
}

function main() {
	fs.mkdirSync(TRIMMED_DIR, { recursive: true });

	const introLengths = JSON.parse(fs.readFileSync(INTRO_LENGTHS_PATH, 'utf-8'));

	const onlyArg = (process.argv.find((a) => a.startsWith('--only=')) || '').slice('--only='.length);
	const queue = filterByOnly(buildEpisodeQueue(RSS_DIR), onlyArg);

	let trimmed = 0;
	let skipped = 0;
	let missing = 0;
	let noIntroConfigured = 0;

	for (const episode of queue) {
		const stem = sanitizeStem(episode.epCode);
		const src = path.join(RAW_DIR, `${stem}.mp3`);
		const dest = path.join(TRIMMED_DIR, `${stem}.mp3`);

		if (fs.existsSync(dest)) {
			skipped++;
			continue;
		}
		if (!fs.existsSync(src)) {
			console.warn(`[${episode.epCode}] SKIP - raw audio not found, run download-all.mjs first`);
			missing++;
			continue;
		}

		const seconds = introLengths[episode.feedPrefix];
		if (!seconds || seconds <= 0) {
			console.warn(
				`[${episode.epCode}] no intro length configured for "${episode.feedPrefix}" in intro-lengths.json - moving as-is`
			);
			fs.renameSync(src, dest);
			noIntroConfigured++;
			continue;
		}

		console.log(`[${episode.epCode}] trimming first ${seconds}s...`);
		trimFile(src, dest, seconds);
		fs.rmSync(src); // raw copy isn't needed once trimmed
		trimmed++;
	}

	console.log(
		`Done. Trimmed: ${trimmed}, copied without trim (no intro length set): ${noIntroConfigured}, already done: ${skipped}, missing raw audio: ${missing}`
	);
}

if (path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
	main();
}
