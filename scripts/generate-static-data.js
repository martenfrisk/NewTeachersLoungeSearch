import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read episodes data
const episodesPath = path.join(__dirname, '../src/assets/episodes6.json');
const episodes = JSON.parse(fs.readFileSync(episodesPath, 'utf8'));

function initSupabase() {
	const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
	const supabaseKey = process.env.PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

	if (!supabaseUrl || !supabaseKey) {
		throw new Error(
			'Missing Supabase environment variables. Please configure PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY.'
		);
	}

	return createClient(supabaseUrl, supabaseKey);
}

// Fetch { ep: { totalLines, editedLines } } for every episode from Supabase.
// transcript_lines no longer exists locally (src/assets/transcripts was
// removed once data moved to Supabase), so editing stats have to be read
// from the database instead of the filesystem.
async function fetchEditingStatsByEpisode(supabase) {
	const { data: episodeRows, error: episodeError } = await supabase
		.from('episodes')
		.select('id, ep');

	if (episodeError) {
		throw new Error(`Failed to fetch episodes: ${episodeError.message}`);
	}

	const epById = new Map(episodeRows.map((row) => [row.id, row.ep]));

	const counts = new Map();
	const pageSize = 1000;
	let from = 0;

	// transcript_lines can hold tens of thousands of rows, so page through it
	while (true) {
		const { data: lineRows, error: lineError } = await supabase
			.from('transcript_lines')
			.select('episode_id, edited')
			.range(from, from + pageSize - 1);

		if (lineError) {
			throw new Error(`Failed to fetch transcript_lines: ${lineError.message}`);
		}
		if (!lineRows || lineRows.length === 0) break;

		for (const row of lineRows) {
			const ep = epById.get(row.episode_id);
			if (!ep) continue;

			const stats = counts.get(ep) || { totalLines: 0, editedLines: 0 };
			stats.totalLines += 1;
			if (row.edited) stats.editedLines += 1;
			counts.set(ep, stats);
		}

		if (lineRows.length < pageSize) break;
		from += pageSize;
	}

	return counts;
}

function buildEditingStats({ totalLines, editedLines }) {
	const editedPercentage = totalLines > 0 ? Math.round((editedLines / totalLines) * 100) : 0;
	return {
		isFullyEdited: editedPercentage === 100,
		isMostlyEdited: editedPercentage >= 50,
		editedPercentage,
		editedLines,
		totalLines
	};
}

// Server-side season grouping logic
const groupEpisodesBySeasons = (episodes) => {
	const seasonGroups = {};

	episodes.forEach((episode) => {
		let seasonId = '';

		if (episode.ep.startsWith('s') && episode.ep.includes('e')) {
			const match = episode.ep.match(/^(s\d+)e\d+$/);
			if (match) seasonId = match[1];
		} else if (episode.ep.startsWith('mini-')) {
			seasonId = 'mini';
		} else if (episode.ep.startsWith('exit42-')) {
			seasonId = 'exit42';
		} else if (episode.ep.startsWith('holidays-')) {
			seasonId = 'holidays';
		} else if (episode.ep.startsWith('jesus-')) {
			seasonId = 'jesus';
		} else if (episode.ep.startsWith('lastresort-')) {
			seasonId = 'lastresort';
		} else if (episode.ep.startsWith('exit43-')) {
			seasonId = 'exit43';
		} else if (episode.ep.startsWith('countyfair-')) {
			seasonId = 'countyfair';
		} else if (episode.ep.startsWith('mainstreet-')) {
			seasonId = 'mainstreet';
		} else if (episode.ep === 'Peecast') {
			seasonId = 'Peecast';
		} else {
			seasonId = 'other';
		}

		if (!seasonGroups[seasonId]) {
			seasonGroups[seasonId] = [];
		}
		seasonGroups[seasonId].push(episode);
	});

	// Define season metadata
	const seasonMeta = {
		s01: {
			name: 'Season 1',
			description: 'Four teachers at Hamilton High record a podcast',
			order: 1
		},
		s02: { name: 'Season 2', description: 'Fired and rehired by Hamilton', order: 2 },
		s03: { name: 'Season 3', description: 'Death of Howard', order: 3 },
		s04: { name: 'Season 4', description: 'Resurrection of Howard', order: 4 },
		s05: { name: 'Season 5', description: 'Going to Hollywood', order: 5 },
		s06: { name: 'Season 6', description: 'Going to college', order: 6 },
		s07: { name: 'Season 7', description: 'Summer camp', order: 7 },
		s08: { name: 'Season 8', description: 'Hell and the mall', order: 8 },
		s09: { name: 'Season 9', description: 'Canon reset and real guests', order: 9 },
		s10: { name: 'Season 10', description: 'Alumni Week', order: 10 },
		s11: { name: 'Season 11', description: 'Pumped', order: 11 },
		s12: { name: 'Season 12', description: 'Order Up', order: 12 },
		s13: { name: 'Season 13', description: 'Academy', order: 13 },
		mini: {
			name: 'Mini Episodes',
			description: 'Shorter episodes',
			order: 100
		},
		exit42: {
			name: 'Exit 42',
			description:
				'20 doses of Big Grande improv all set at the same insane exit on the highway… Exit 42',
			order: 101
		},
		Peecast: { name: 'Peecast', description: 'Live at Peecast Blast', order: 102 },
		holidays: {
			name: 'Holidays at the Mall',
			description:
				'A limited run of minis (10-20 minute improvised scenes) all set within the same location – a mall at the holidays.',
			order: 103
		},
		jesus: {
			name: "Preacher's Lounge",
			description: 'The Story of Jesus: A 4 Part Easter Special',
			order: 104
		},
		lastresort: {
			name: 'Last Resort',
			description:
				'10 part improvised podcast series, chronicling the struggles of a Gulf Coast resort.',
			order: 105
		},
		exit43: {
			name: 'Exit 43',
			description: '20 more doses of Big Grande improv, back at the same insane highway exit.',
			order: 106
		},
		countyfair: {
			name: 'County Fair',
			description: '10 part improvised podcast series set at a county fair.',
			order: 107
		},
		mainstreet: {
			name: 'Main Street Sounds - Volume 1',
			description: '10 part improvised podcast series set around Main Street.',
			order: 108
		},
		other: { name: 'Other Episodes', description: 'Miscellaneous episodes', order: 999 }
	};

	return Object.entries(seasonGroups)
		.filter(([, eps]) => eps.length > 0)
		.map(([seasonId, eps]) => ({
			id: seasonId,
			name: seasonMeta[seasonId]?.name || seasonId,
			description: seasonMeta[seasonId]?.description,
			episodes: eps.sort((a, b) => {
				// Sort episodes within season
				const aNum = parseInt(a.ep.match(/\d+$/)?.[0] || '0');
				const bNum = parseInt(b.ep.match(/\d+$/)?.[0] || '0');
				return aNum - bNum;
			})
		}))
		.sort((a, b) => {
			const aOrder = seasonMeta[a.id]?.order || 999;
			const bOrder = seasonMeta[b.id]?.order || 999;
			return aOrder - bOrder;
		});
};

// Add editing stats to episodes
const supabase = initSupabase();
const editingStatsByEpisode = await fetchEditingStatsByEpisode(supabase);

const episodesWithEditingStats = episodes.map((episode) => {
	const stats = editingStatsByEpisode.get(episode.ep) || { totalLines: 0, editedLines: 0 };
	return {
		...episode,
		...buildEditingStats(stats)
	};
});

// Generate processed data
const seasonsData = groupEpisodesBySeasons(episodesWithEditingStats);

const navigationSeasons = seasonsData.map((season) => ({
	id: season.id,
	name: season.name,
	episodeCount: season.episodes.length,
	isSpecial: !season.id.startsWith('s') && season.id !== 'mini'
}));

const episodesPageData = {
	episodes: episodesWithEditingStats,
	seasonsData,
	navigationSeasons,
	totalEpisodes: episodesWithEditingStats.length,
	lastUpdated: new Date().toISOString()
};

// Write generated files
const outputDir = path.join(__dirname, '../src/assets/generated');
if (!fs.existsSync(outputDir)) {
	fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(path.join(outputDir, 'seasons.json'), JSON.stringify(seasonsData, null, 2));

fs.writeFileSync(
	path.join(outputDir, 'navigation-seasons.json'),
	JSON.stringify(navigationSeasons, null, 2)
);

fs.writeFileSync(
	path.join(outputDir, 'episodes-page-data.json'),
	JSON.stringify(episodesPageData, null, 2)
);

console.log('✅ Generated static data files:');
console.log(`  - seasons.json (${seasonsData.length} seasons)`);
console.log(`  - navigation-seasons.json (${navigationSeasons.length} navigation items)`);
console.log(`  - episodes-page-data.json (${episodes.length} episodes)`);
