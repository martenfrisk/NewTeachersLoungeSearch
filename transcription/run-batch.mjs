import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFileSync, spawnSync } from 'child_process';
import { config } from 'dotenv';
import { buildEpisodeQueue, filterByOnly, sanitizeStem } from './lib/episode-queue.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, '..');
const RAW_DIR = path.join(__dirname, 'audio', 'raw');
const TRIMMED_DIR = path.join(__dirname, 'audio', 'trimmed');
const OUTPUT_DIR = path.join(__dirname, 'output');
const TRANSCRIPTS_DIR = path.join(REPO_ROOT, 'src/assets/transcripts');
const LOG_DIR = path.join(__dirname, 'logs');
const RSS_DIR = path.join(REPO_ROOT, 'migration-scripts');
const INTRO_LENGTHS_PATH = path.join(__dirname, 'intro-lengths.json');

config({ path: path.join(__dirname, '.env') });

const introLengths = JSON.parse(fs.readFileSync(INTRO_LENGTHS_PATH, 'utf-8'));

const HF_TOKEN = process.env.HF_TOKEN;
if (!HF_TOKEN) {
	console.error('Missing HF_TOKEN in transcription/.env');
	process.exit(1);
}

function log(episodeCode, message) {
	const line = `[${new Date().toISOString()}] [${episodeCode}] ${message}`;
	console.log(line);
	fs.appendFileSync(path.join(LOG_DIR, 'batch.log'), line + '\n');
}

// Audio is expected to already be downloaded (download-all.mjs) and,
// ideally, trimmed of its musical intro (trim-intros.mjs). Falls back to
// the raw download if no trimmed version exists yet - in that case there's
// no intro offset to apply since nothing was cut.
function resolveAudioPath(stem) {
	const trimmed = path.join(TRIMMED_DIR, `${stem}.mp3`);
	if (fs.existsSync(trimmed)) return { path: trimmed, wasTrimmed: true };

	const raw = path.join(RAW_DIR, `${stem}.mp3`);
	if (fs.existsSync(raw)) return { path: raw, wasTrimmed: false };

	return null;
}

function runWhisply(epCode, audioPath) {
	const result = spawnSync(
		path.join(__dirname, 'venv/bin/whisply'),
		[
			'run',
			'--files',
			audioPath,
			'--output_dir',
			OUTPUT_DIR,
			'--device',
			'mlx',
			'--model',
			'large-v3-turbo',
			'--lang',
			'en',
			'--annotate',
			'--hf_token',
			HF_TOKEN,
			'--export',
			'json'
		],
		{
			encoding: 'utf-8',
			env: { ...process.env }
		}
	);

	fs.writeFileSync(
		path.join(LOG_DIR, `${epCode}.log`),
		(result.stdout || '') + '\n' + (result.stderr || '')
	);

	if (result.status !== 0) {
		throw new Error(`whisply exited with code ${result.status} - see logs/${epCode}.log`);
	}
}

function findWhisplyJson(stem) {
	const dir = path.join(OUTPUT_DIR, stem);
	const jsonPath = path.join(dir, `${stem}.json`);
	if (!fs.existsSync(jsonPath)) {
		throw new Error(`Expected whisply output not found: ${jsonPath}`);
	}
	return jsonPath;
}

function convertToTranscript(epCode, whisplyJsonPath, offsetSeconds) {
	execFileSync(
		'node',
		[
			path.join(REPO_ROOT, 'scripts/whisply-to-transcript.js'),
			`--input=${whisplyJsonPath}`,
			`--episode=${epCode}`,
			`--output=${path.join(TRANSCRIPTS_DIR, `${epCode}.json`)}`,
			`--offset=${offsetSeconds}`
		],
		{ stdio: 'inherit' }
	);
}

// Cleans up whisply's transient work: the wav it converts the mp3 into
// (written next to the source audio file, not into output_dir or cwd), and
// its own output dir (once we've pulled the JSON out of it). The source
// mp3 in audio/raw or audio/trimmed is a persistent asset and is kept.
function cleanupTranscriptionArtifacts(stem, audioPath) {
	const wav = path.join(path.dirname(audioPath), `${stem}_converted.wav`);
	if (fs.existsSync(wav)) fs.rmSync(wav);

	const outDir = path.join(OUTPUT_DIR, stem);
	if (fs.existsSync(outDir)) fs.rmSync(outDir, { recursive: true, force: true });
}

function alreadyDone(epCode) {
	return fs.existsSync(path.join(TRANSCRIPTS_DIR, `${epCode}.json`));
}

function processEpisode(episode) {
	const { epCode, title, show, feedPrefix } = episode;

	if (alreadyDone(epCode)) {
		log(epCode, `skip (transcript already exists)`);
		return { epCode, status: 'skipped' };
	}

	const stem = sanitizeStem(epCode);
	const resolved = resolveAudioPath(stem);
	if (!resolved) {
		log(
			epCode,
			`SKIP - no audio found for "${title}" (${show}). Run download-all.mjs (and trim-intros.mjs) first.`
		);
		return { epCode, status: 'no-audio' };
	}

	const { path: audioPath, wasTrimmed } = resolved;
	const offsetSeconds = wasTrimmed ? introLengths[feedPrefix] || 0 : 0;

	try {
		log(
			epCode,
			`transcribing + diarizing (${path.relative(__dirname, audioPath)}, offset ${offsetSeconds}s)...`
		);
		runWhisply(epCode, audioPath);

		log(epCode, `converting to transcript format...`);
		const whisplyJson = findWhisplyJson(stem);
		convertToTranscript(epCode, whisplyJson, offsetSeconds);

		log(epCode, `done -> src/assets/transcripts/${epCode}.json`);
		return { epCode, status: 'done' };
	} catch (err) {
		log(epCode, `ERROR: ${err.message}`);
		return { epCode, status: 'error', error: err.message };
	} finally {
		cleanupTranscriptionArtifacts(stem, audioPath);
	}
}

function main() {
	fs.mkdirSync(OUTPUT_DIR, { recursive: true });
	fs.mkdirSync(TRANSCRIPTS_DIR, { recursive: true });
	fs.mkdirSync(LOG_DIR, { recursive: true });

	const onlyArg = (process.argv.find((a) => a.startsWith('--only=')) || '').slice('--only='.length);
	const queue = filterByOnly(buildEpisodeQueue(RSS_DIR), onlyArg);
	log('BATCH', `queued ${queue.length} episodes${onlyArg ? ` (filtered: ${onlyArg})` : ''}`);

	const results = queue.map(processEpisode);

	const summary = results.reduce((acc, r) => {
		acc[r.status] = (acc[r.status] || 0) + 1;
		return acc;
	}, {});
	log('BATCH', `finished: ${JSON.stringify(summary)}`);

	const failures = results.filter((r) => r.status === 'error' || r.status === 'no-audio');
	if (failures.length > 0) {
		log('BATCH', `episodes needing attention: ${failures.map((f) => f.epCode).join(', ')}`);
	}
}

// Guard against side effects on import (e.g. tooling that imports this
// module to inspect it) - only run the batch when invoked directly:
// `node transcription/run-batch.mjs`.
if (path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
	main();
}
