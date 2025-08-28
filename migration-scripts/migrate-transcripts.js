#!/usr/bin/env node

/**
 * Migration script to import transcript data from JSON files to Supabase
 *
 * Usage: node migration-scripts/migrate-transcripts.js
 *
 * Prerequisites:
 * 1. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env
 * 2. Run migrate-episodes.js first to populate episodes table
 * 3. Run the database schema (supabase-schema.sql) first
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

async function getEpisodeId(episodeCode) {
	const { data, error } = await supabase
		.from('episodes')
		.select('id')
		.eq('ep', episodeCode)
		.single();

	if (error || !data) {
		throw new Error(`Episode not found: ${episodeCode}. Run migrate-episodes.js first.`);
	}

	return data.id;
}

async function migrateTranscripts() {
	try {
		console.log('🚀 Starting transcript migration...');

		const transcriptsDir = path.join(projectRoot, 'src', 'assets', 'transcripts');
		const transcriptFiles = fs.readdirSync(transcriptsDir).filter((file) => file.endsWith('.json'));

		console.log(`📁 Found ${transcriptFiles.length} transcript files to migrate`);

		let totalLines = 0;
		let processedFiles = 0;
		let errors = 0;

		for (const file of transcriptFiles) {
			try {
				const episodeCode = file.replace('.json', '');
				const filePath = path.join(transcriptsDir, file);

				console.log(`📄 Processing ${file}...`);

				// Load transcript data
				const transcriptData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

				if (!Array.isArray(transcriptData) || transcriptData.length === 0) {
					console.warn(`⚠️  Skipping empty or invalid file: ${file}`);
					continue;
				}

				// Get episode ID
				const episodeId = await getEpisodeId(episodeCode);
				const season = extractSeason(episodeCode);

				// Prepare transcript lines for insertion
				const lines = transcriptData
					.filter((line) => line && typeof line === 'object' && line.line) // Filter out invalid entries
					.map((line) => ({
						episode_id: episodeId,
						season: season,
						timestamp_str: line.time || '0:00:00',
						speaker: line.speaker || 'Unknown',
						line: line.line,
						edited: line.edited || false
					}));

				if (lines.length === 0) {
					console.warn(`⚠️  No valid lines found in ${file}`);
					continue;
				}

				// Insert transcript lines in batches
				const batchSize = 1000;
				let insertedLines = 0;

				for (let i = 0; i < lines.length; i += batchSize) {
					const batch = lines.slice(i, i + batchSize);

					const { data, error } = await supabase
						.from('transcript_lines')
						.insert(batch)
						.select('id');

					if (error) {
						console.error(`❌ Error inserting lines from ${file}:`, error.message);
						throw error;
					}

					insertedLines += data?.length || 0;
				}

				totalLines += insertedLines;
				processedFiles++;
				console.log(`✅ ${file}: ${insertedLines} lines inserted`);

				// Small delay between files to avoid overwhelming the database
				await new Promise((resolve) => setTimeout(resolve, 50));
			} catch (error) {
				console.error(`❌ Error processing ${file}:`, error.message);
				errors++;
			}
		}

		console.log('📊 Migration Summary:');
		console.log(`   ✅ Successfully processed: ${processedFiles} files`);
		console.log(`   📝 Total lines inserted: ${totalLines}`);
		console.log(`   ❌ Errors: ${errors} files`);

		// Verify the migration
		const { count, error: countError } = await supabase
			.from('transcript_lines')
			.select('*', { count: 'exact', head: true });

		if (countError) {
			console.warn('⚠️  Could not verify transcript line count:', countError.message);
		} else {
			console.log(`🔍 Verification: ${count} transcript lines now in database`);
		}

		// Show some sample statistics
		const { data: seasonStats, error: seasonError } = await supabase
			.from('transcript_lines')
			.select('season')
			.limit(1000);

		if (!seasonError && seasonStats) {
			const seasons = [...new Set(seasonStats.map((s) => s.season))];
			console.log(`📈 Seasons found: ${seasons.join(', ')}`);
		}

		console.log('🎉 Transcript migration completed!');
	} catch (error) {
		console.error('💥 Migration failed:', error.message);
		process.exit(1);
	}
}

// Run the migration
migrateTranscripts();
