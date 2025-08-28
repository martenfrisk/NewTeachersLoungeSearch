#!/usr/bin/env node

/**
 * Migration script to import episode metadata from episodes6.json to Supabase
 *
 * Usage: node migration-scripts/migrate-episodes.js
 *
 * Prerequisites:
 * 1. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env
 * 2. Run the database schema (supabase-schema.sql) first
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Use process.cwd() since we know the script structure
const projectRoot = process.cwd();

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
	console.error('❌ Missing required environment variables:');
	console.error('   - PUBLIC_SUPABASE_URL');
	console.error('   - SUPABASE_SERVICE_ROLE_KEY');
	process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
	auth: {
		autoRefreshToken: false,
		persistSession: false
	}
});

function extractSeason(episodeCode) {
	if (episodeCode.startsWith('s') && episodeCode.includes('e')) {
		// Format: s01e01, s02e03, etc.
		const match = episodeCode.match(/s(\d+)e/);
		return match ? `s${match[1].padStart(2, '0')}` : 'unknown';
	} else if (episodeCode.startsWith('mini-')) {
		return 'mini';
	} else if (episodeCode.startsWith('exit42-')) {
		return 'exit42';
	} else if (episodeCode.startsWith('holidays-')) {
		return 'holidays';
	} else if (episodeCode.startsWith('jesus-')) {
		return 'jesus';
	} else if (episodeCode.startsWith('lastresort-')) {
		return 'lastresort';
	}
	return 'unknown';
}

async function migrateEpisodes() {
	try {
		console.log('🚀 Starting episode migration...');

		// Load episodes data
		const episodesPath = path.join(projectRoot, 'src', 'assets', 'episodes6.json');
		const episodesData = JSON.parse(fs.readFileSync(episodesPath, 'utf-8'));

		console.log(`📚 Found ${episodesData.length} episodes to migrate`);

		// Prepare episode data for insertion
		const episodes = episodesData.map((episode) => ({
			ep: episode.ep,
			title: episode.title || '',
			description: episode.desc || null,
			date: episode.date ? new Date(episode.date) : null,
			url: episode.url || null,
			feed_title: episode.feedTitle || null,
			has_audio: episode.hasAudio || false,
			season: extractSeason(episode.ep)
		}));

		// Insert episodes in batches to avoid timeout
		const batchSize = 50;
		let inserted = 0;
		let errors = 0;

		for (let i = 0; i < episodes.length; i += batchSize) {
			const batch = episodes.slice(i, i + batchSize);

			console.log(
				`📤 Inserting batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(episodes.length / batchSize)}...`
			);

			const { data, error } = await supabase
				.from('episodes')
				.upsert(batch, {
					onConflict: 'ep',
					ignoreDuplicates: false
				})
				.select('ep');

			if (error) {
				console.error(`❌ Error inserting batch:`, error.message);
				errors++;
			} else {
				inserted += data?.length || 0;
				console.log(`✅ Inserted ${data?.length || 0} episodes in this batch`);
			}

			// Add small delay between batches
			await new Promise((resolve) => setTimeout(resolve, 100));
		}

		console.log('📊 Migration Summary:');
		console.log(`   ✅ Successfully inserted: ${inserted} episodes`);
		console.log(`   ❌ Errors: ${errors} batches`);
		console.log(`   📁 Total processed: ${episodes.length} episodes`);

		// Verify the migration
		const { count, error: countError } = await supabase
			.from('episodes')
			.select('*', { count: 'exact', head: true });

		if (countError) {
			console.warn('⚠️  Could not verify episode count:', countError.message);
		} else {
			console.log(`🔍 Verification: ${count} episodes now in database`);
		}

		console.log('🎉 Episode migration completed!');
	} catch (error) {
		console.error('💥 Migration failed:', error.message);
		process.exit(1);
	}
}

// Run the migration
migrateEpisodes();
