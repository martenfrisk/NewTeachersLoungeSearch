import fs from 'fs';
import path from 'path';

// Maps each new show to its RSS file and the ep-prefix pattern used in
// episodes6.json. Seasons use zero-padded episode numbers (s12e01), spin-offs
// use a plain dash-separated index (countyfair-1) - same convention used
// when episodes6.json was built.
export const FEEDS = [
	{ rssFile: '20066.rss', label: 'Order Up', epPrefix: 's12', style: 'season' },
	{ rssFile: '22529.rss', label: 'Academy', epPrefix: 's13', style: 'season' },
	{ rssFile: '18315.rss', label: 'Exit 43', epPrefix: 'exit43', style: 'spinoff' },
	{ rssFile: '23312.rss', label: 'County Fair', epPrefix: 'countyfair', style: 'spinoff' },
	{ rssFile: '25931.rss', label: 'Main Street Sounds', epPrefix: 'mainstreet', style: 'spinoff' }
];

function extractTag(block, tag) {
	const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`);
	const m = block.match(re);
	if (!m) return '';
	const cdata = m[1].match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
	return (cdata ? cdata[1] : m[1]).trim();
}

function parseFeedEpisodes(rssDir, rssFile) {
	const xml = fs.readFileSync(path.join(rssDir, rssFile), 'utf-8');
	const items = xml
		.split('<item>')
		.slice(1)
		.map((chunk) => chunk.split('</item>')[0]);
	const episodes = items.map((item) => ({
		title: extractTag(item, 'title'),
		pubDate: extractTag(item, 'pubDate'),
		audioUrl: (item.match(/<enclosure url="([^"]+)"/) || [])[1]
	}));
	episodes.sort((a, b) => new Date(a.pubDate) - new Date(b.pubDate));
	return episodes;
}

// Returns [{ epCode, title, audioUrl, show, feedPrefix }] for all 54 new
// episodes, in a stable order (grouped by feed, chronological within feed).
export function buildEpisodeQueue(rssDir) {
	const queue = [];
	for (const feed of FEEDS) {
		const episodes = parseFeedEpisodes(rssDir, feed.rssFile);
		episodes.forEach((ep, i) => {
			const epCode =
				feed.style === 'season'
					? `${feed.epPrefix}e${String(i + 1).padStart(2, '0')}`
					: `${feed.epPrefix}-${i + 1}`;
			queue.push({
				epCode,
				title: ep.title,
				audioUrl: ep.audioUrl,
				show: feed.label,
				feedPrefix: feed.epPrefix
			});
		});
	}
	return queue;
}

// whisply sanitizes filenames (hyphens -> underscores) for its own output
// dir naming, so audio filenames use the same stem to find whisply's output
// again afterwards.
export function sanitizeStem(epCode) {
	return epCode.replace(/-/g, '_');
}

export function filterByOnly(queue, onlyArg) {
	if (!onlyArg) return queue;
	const wanted = new Set(onlyArg.split(','));
	return queue.filter((e) => wanted.has(e.epCode));
}
