import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';
import { buildEpisodeQueue, filterByOnly, sanitizeStem } from './lib/episode-queue.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, '..');
const RSS_DIR = path.join(REPO_ROOT, 'migration-scripts');
const RAW_DIR = path.join(__dirname, 'audio', 'raw');

function main() {
	fs.mkdirSync(RAW_DIR, { recursive: true });

	const onlyArg = (process.argv.find((a) => a.startsWith('--only=')) || '').slice('--only='.length);
	const queue = filterByOnly(buildEpisodeQueue(RSS_DIR), onlyArg);

	console.log(`Downloading ${queue.length} episodes to ${RAW_DIR}...`);

	let downloaded = 0;
	let skipped = 0;
	let failed = 0;

	for (const episode of queue) {
		const dest = path.join(RAW_DIR, `${sanitizeStem(episode.epCode)}.mp3`);

		if (fs.existsSync(dest)) {
			console.log(`[${episode.epCode}] already downloaded, skipping`);
			skipped++;
			continue;
		}
		if (!episode.audioUrl) {
			console.warn(`[${episode.epCode}] SKIP - no audio URL found for "${episode.title}"`);
			failed++;
			continue;
		}

		console.log(`[${episode.epCode}] downloading "${episode.title}" (${episode.show})...`);
		try {
			execFileSync('curl', ['-sL', '-o', dest, episode.audioUrl], { stdio: 'inherit' });
			downloaded++;
		} catch (err) {
			console.error(`[${episode.epCode}] download failed: ${err.message}`);
			fs.rmSync(dest, { force: true });
			failed++;
		}
	}

	console.log(
		`Done. Downloaded: ${downloaded}, skipped (already present): ${skipped}, failed: ${failed}`
	);
}

if (path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
	main();
}
