#!/usr/bin/env node

/**
 * Script to update specific transcript files in Supabase
 * Usage: node migration-scripts/update-specific-transcripts.js s01e02 s05e08
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

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
		throw new Error(`Episode not found: ${episodeCode}`);
	}

	return data.id;
}

async function updateTranscript(episodeCode) {
	try {
		console.log(`📄 Processing ${episodeCode}...`);

		// Get episode ID first
		const episodeId = await getEpisodeId(episodeCode);
		console.log(`   📋 Episode ID: ${episodeId}`);

		// Check how many existing lines we have
		const { count: existingCount } = await supabase
			.from('transcript_lines')
			.select('*', { count: 'exact', head: true })
			.eq('episode_id', episodeId);

		console.log(`   🗑️  Found ${existingCount || 0} existing lines to delete`);

		// Delete existing transcript lines for this episode
		const {
			count: deleteCount,
			status: deleteStatus,
			error: deleteError
		} = await supabase.from('transcript_lines').delete().eq('episode_id', episodeId);

		if (deleteError) {
			console.error(`❌ Error deleting existing lines for ${episodeCode}:`, deleteError.message);
			return false;
		}

		console.log(
			`   ✅ Deleted ${existingCount || 0} existing lines - ${{ deleteCount }}, ${{ deleteStatus }}`
		);

		// Load transcript data
		const filePath = path.join(process.cwd(), 'static', 'transcripts', `${episodeCode}.json`);

		if (!fs.existsSync(filePath)) {
			console.error(`❌ File not found: ${filePath}`);
			return false;
		}

		console.log(`   📖 Loading transcript from: ${filePath}`);
		const transcriptData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

		if (!Array.isArray(transcriptData) || transcriptData.length === 0) {
			console.warn(`⚠️  Empty or invalid file: ${episodeCode}.json`);
			return false;
		}

		console.log(`   📊 Raw transcript contains ${transcriptData.length} items`);

		// Get season
		const season = extractSeason(episodeCode);

		// Prepare transcript lines for insertion
		const lines = transcriptData
			.filter((line) => line && typeof line === 'object' && line.line)
			.map((line) => ({
				episode_id: episodeId,
				season: season,
				timestamp_str: line.time || '0:00:00',
				speaker: line.speaker || 'Unknown',
				line: line.line,
				edited: line.edited || false
			}));

		if (lines.length === 0) {
			console.warn(`⚠️  No valid lines found in ${episodeCode}.json`);
			return false;
		}

		console.log(`   ✨ Prepared ${lines.length} valid lines for insertion`);

		// Insert transcript lines in batches
		const batchSize = 1000;
		let insertedLines = 0;
		const totalBatches = Math.ceil(lines.length / batchSize);

		console.log(`   🔄 Inserting in ${totalBatches} batch${totalBatches > 1 ? 'es' : ''}...`);

		for (let i = 0; i < lines.length; i += batchSize) {
			const batch = lines.slice(i, i + batchSize);
			const batchNumber = Math.floor(i / batchSize) + 1;

			console.log(
				`     📦 Batch ${batchNumber}/${totalBatches}: inserting ${batch.length} lines...`
			);

			const { data, error } = await supabase.from('transcript_lines').insert(batch).select('id');

			if (error) {
				console.error(`❌ Error inserting batch ${batchNumber} for ${episodeCode}:`, error.message);
				throw error;
			}

			insertedLines += data?.length || 0;
			console.log(`     ✅ Batch ${batchNumber} completed: ${data?.length || 0} lines inserted`);
		}

		console.log(`✅ ${episodeCode}: Successfully updated with ${insertedLines} lines`);
		return true;
	} catch (error) {
		console.error(`❌ Error processing ${episodeCode}:`, error.message);
		return false;
	}
}

async function updateSpecificTranscripts() {
	const episodesToUpdate = process.argv.slice(2);

	if (episodesToUpdate.length === 0) {
		console.error('❌ Please specify episode codes to update');
		console.error('Usage: node update-specific-transcripts.js s01e02 s05e08');
		process.exit(1);
	}

	console.log(`🚀 Starting targeted transcript update for: ${episodesToUpdate.join(', ')}`);

	let successCount = 0;
	let errorCount = 0;

	for (const episodeCode of episodesToUpdate) {
		const success = await updateTranscript(episodeCode);
		if (success) {
			successCount++;
		} else {
			errorCount++;
		}
	}

	console.log('\n📊 Update Summary:');
	console.log(`   ✅ Successfully updated: ${successCount} episodes`);
	console.log(`   ❌ Errors: ${errorCount} episodes`);

	if (errorCount === 0) {
		console.log('🎉 All transcript updates completed successfully!');
	}
}

// Run the update
updateSpecificTranscripts();
