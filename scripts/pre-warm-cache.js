#!/usr/bin/env node

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

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

async function preWarmCache() {
	console.log('🔥 Pre-warming cache for random queries...');

	// Ensure cache directory exists
	if (!existsSync(CACHE_DIR)) {
		mkdirSync(CACHE_DIR, { recursive: true });
	}

	const results = [];
	let successCount = 0;
	let errorCount = 0;

	for (const query of randomQuery) {
		try {
			console.log(`Caching: "${query}"`);

			// For build-time pre-warming, we'll create placeholder cache files
			// In production, these would be populated with actual search results
			// You can run the search API calls during deployment or via a separate process
			const result = {
				items: [], // Placeholder - in production this would have actual search results
				stats: {
					estimatedTotalHits: 0,
					processingTime: 0,
					facets: []
				},
				hasMore: false
			};

			// Note: To populate with real data, you could:
			// 1. Start dev server first: `bun dev` in background
			// 2. Make API calls to localhost:5173/api/search?q=${query}
			// 3. Or integrate with your search repository directly
			console.log(`📋 Created cache placeholder for "${query}"`);

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
				cached: true
			});

			successCount++;
			console.log(`✅ Cached "${query}" (${result.items.length} hits)`);
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
		queries: results,
		stats: {
			total: randomQuery.length,
			cached: successCount,
			failed: errorCount
		}
	};

	writeFileSync(join(CACHE_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));

	console.log(`\n🎯 Cache pre-warming complete!`);
	console.log(`   Cached: ${successCount}/${randomQuery.length} queries`);
	if (errorCount > 0) {
		console.log(`   Failed: ${errorCount} queries`);
	}
	console.log(`   Cache directory: ${CACHE_DIR}`);

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
