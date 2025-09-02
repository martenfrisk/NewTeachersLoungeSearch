#!/usr/bin/env node

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config();

// Define random queries directly in the script (copied from utils.ts)
const randomQuery = [
	'guinness',
	'ridiculous voice',
	'bronco',
	'lasagna',
	'big nightmare',
	'el chapo',
	'cheetah man',
	'see you in court',
	'beef diaper',
	'bottomless piggy bank',
	'scarecrow',
	'south pole santa',
	'obsessed with corn',
	'permit crab',
	'Wimberley',
	'tricky dick',
	'picasso',
	'grotesque genitals',
	'bethany hart',
	'morrissey',
	'goths',
	'famously',
	'oj simpson',
	"let's just say",
	'real hair',
	'refrigerator',
	'large olive',
	'Gandhi',
	'gazpacho'
];

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CACHE_DIR = join(__dirname, '../static/cache');

// Initialize Supabase client for direct database access
function initSupabase() {
	const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
	const supabaseKey = process.env.PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

	if (!supabaseUrl || !supabaseKey) {
		const env = process.env.NODE_ENV || 'unknown';
		const isCI = Boolean(process.env.CI || process.env.VERCEL || process.env.GITHUB_ACTIONS);

		console.log(`Environment: ${env}, CI: ${isCI}`);
		console.log(
			`Available env vars: PUBLIC_SUPABASE_URL=${Boolean(supabaseUrl)}, PUBLIC_SUPABASE_ANON_KEY=${Boolean(supabaseKey)}`
		);

		throw new Error(
			'Missing Supabase environment variables. Please configure PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY in your deployment environment.'
		);
	}

	return createClient(supabaseUrl, supabaseKey);
}

// Parse search query to build postgres query (simplified version from queryParser)
function buildPostgresQuery(query) {
	const terms = query
		.toLowerCase()
		.split(/\s+/)
		.filter((term) => term.length > 0);
	return terms.map((term) => term.replace(/[^a-z0-9]/g, '')).join(' & ');
}

// Perform actual search using Supabase
async function performSearch(supabase, query) {
	const postgresQuery = buildPostgresQuery(query);

	try {
		console.log(`    Searching for: "${query}" (postgres: "${postgresQuery}")`);

		// Use the same optimized search function that the app uses
		const { data: searchResults, error: searchError } = await supabase.rpc(
			'optimized_search_transcripts',
			{
				search_query: postgresQuery,
				season_filter: null,
				episode_filter: null,
				edited_only_filter: false,
				limit_count: 20,
				offset_count: 0
			}
		);

		if (searchError) {
			console.error(`    Search error for "${query}":`, searchError.message);
			return null;
		}

		// Get facets
		const { data: facetResults, error: facetError } = await supabase.rpc(
			'optimized_search_facets',
			{
				search_query: postgresQuery,
				edited_only_filter: false
			}
		);

		if (facetError) {
			console.warn(`    Facet error for "${query}":`, facetError.message);
		}

		// Process results (simplified version from SearchRepository)
		const hits = (searchResults || []).map((result) => ({
			id: result.id,
			season: result.season,
			time: result.timestamp_str,
			speaker: result.speaker,
			line: result.line,
			episode: result.episode,
			edited: result.edited
		}));

		// Process facets
		const facets = processFacets(facetResults || []);
		const totalHits = searchResults && searchResults.length > 0 ? searchResults[0].total_count : 0;

		return {
			items: hits,
			stats: {
				estimatedTotalHits: totalHits,
				processingTime: 0, // Will be overridden by cache response time
				facets
			},
			hasMore: hits.length === 20
		};
	} catch (error) {
		console.error(`    Database error for "${query}":`, error.message);
		return null;
	}
}

// Process facets (simplified version from SearchRepository)
function processFacets(facetResults) {
	const facets = [];
	const seasonFacets = {};
	const episodeFacets = {};

	facetResults.forEach((facet) => {
		if (facet.facet_type === 'season') {
			seasonFacets[facet.facet_value] = facet.count;
		} else if (facet.facet_type === 'episode') {
			episodeFacets[facet.facet_value] = facet.count;
		}
	});

	if (Object.keys(seasonFacets).length > 0) {
		const seasonHits = Object.entries(seasonFacets)
			.map(([key, value]) => ({ ep: key, hits: value }))
			.sort((a, b) => b.hits - a.hits)
			.slice(0, 9);

		facets.push({ facetName: 'season', facetHits: seasonHits });
	}

	if (Object.keys(episodeFacets).length > 0) {
		const episodeHits = Object.entries(episodeFacets)
			.map(([key, value]) => ({ ep: key, hits: value }))
			.sort((a, b) => b.hits - a.hits)
			.slice(0, 9);

		facets.push({ facetName: 'episode', facetHits: episodeHits });
	}

	return facets;
}

async function preWarmCache() {
	console.log('🔥 Pre-warming cache for random queries with real search results...');

	// Initialize Supabase
	let supabase;
	try {
		supabase = initSupabase();
		console.log('✅ Supabase client initialized');
	} catch (error) {
		console.error('❌ Failed to initialize Supabase:', error.message);
		console.log('ℹ️  Falling back to placeholder cache files...');
		return await createPlaceholderCache();
	}

	// Ensure cache directory exists
	if (!existsSync(CACHE_DIR)) {
		mkdirSync(CACHE_DIR, { recursive: true });
	}

	const results = [];
	let successCount = 0;
	let errorCount = 0;

	for (const query of randomQuery) {
		try {
			console.log(`🔍 Processing: "${query}"`);

			// Perform actual search
			const result = await performSearch(supabase, query);

			if (!result) {
				throw new Error('Search returned null result');
			}

			console.log(
				`    Found ${result.items.length} hits (total: ${result.stats.estimatedTotalHits})`
			);

			// Create cache file name (sanitize for filesystem)
			const fileName = query
				.toLowerCase()
				.replace(/[^a-z0-9]/g, '-')
				.replace(/-+/g, '-')
				.replace(/^-|-$/g, '');

			const cacheData = {
				query,
				timestamp: Date.now(),
				expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
				result: {
					hits: result.items,
					stats: result.stats,
					hasMore: result.hasMore
				}
			};

			// Write cache file
			const filePath = join(CACHE_DIR, `${fileName}.json`);
			writeFileSync(filePath, JSON.stringify(cacheData, null, 2));

			results.push({
				query,
				fileName,
				hitCount: result.items.length,
				totalHits: result.stats.estimatedTotalHits,
				cached: true
			});

			successCount++;
			console.log(
				`✅ Cached "${query}" (${result.items.length}/${result.stats.estimatedTotalHits} hits)`
			);
		} catch (error) {
			console.error(`❌ Failed to cache "${query}":`, error.message);
			results.push({
				query,
				cached: false,
				error: error.message
			});
			errorCount++;
		}
	}

	// Write cache manifest
	const manifest = {
		generated: Date.now(),
		version: '2.0',
		method: 'database-search',
		queries: results,
		stats: {
			total: randomQuery.length,
			cached: successCount,
			failed: errorCount,
			totalHits: results.reduce((sum, r) => sum + (r.totalHits || 0), 0)
		}
	};

	writeFileSync(join(CACHE_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));

	console.log(`\n🎯 Cache pre-warming complete!`);
	console.log(`   Cached: ${successCount}/${randomQuery.length} queries`);
	console.log(`   Total hits cached: ${manifest.stats.totalHits}`);
	if (errorCount > 0) {
		console.log(`   Failed: ${errorCount} queries`);
	}
	console.log(`   Cache directory: ${CACHE_DIR}`);

	return manifest;
}

// Fallback function to create placeholder cache (original behavior)
async function createPlaceholderCache() {
	console.log('📝 Creating placeholder cache files...');

	// Ensure cache directory exists
	if (!existsSync(CACHE_DIR)) {
		mkdirSync(CACHE_DIR, { recursive: true });
	}

	const results = [];
	let successCount = 0;

	for (const query of randomQuery) {
		const result = {
			items: [],
			stats: {
				estimatedTotalHits: 0,
				processingTime: 0,
				facets: []
			},
			hasMore: false
		};

		const fileName = query
			.toLowerCase()
			.replace(/[^a-z0-9]/g, '-')
			.replace(/-+/g, '-')
			.replace(/^-|-$/g, '');

		const cacheData = {
			query,
			timestamp: Date.now(),
			expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
			result: {
				hits: result.items,
				stats: result.stats,
				hasMore: result.hasMore
			}
		};

		const filePath = join(CACHE_DIR, `${fileName}.json`);
		writeFileSync(filePath, JSON.stringify(cacheData, null, 2));

		results.push({
			query,
			fileName,
			hitCount: 0,
			cached: true,
			placeholder: true
		});

		successCount++;
	}

	const manifest = {
		generated: Date.now(),
		version: '1.0',
		method: 'placeholder',
		queries: results,
		stats: {
			total: randomQuery.length,
			cached: successCount,
			failed: 0
		}
	};

	writeFileSync(join(CACHE_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));

	console.log(`   Created ${successCount} placeholder cache files`);
	return manifest;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
	preWarmCache()
		.then(() => process.exit(0))
		.catch((error) => {
			console.error('Cache pre-warming failed:', error);
			process.exit(1);
		});
}

export { preWarmCache };
