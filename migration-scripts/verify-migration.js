#!/usr/bin/env node

/**
 * Verification script to check data integrity after migration to Supabase
 *
 * Usage: node migration-scripts/verify-migration.js
 *
 * Prerequisites:
 * 1. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env
 * 2. Run migrate-episodes.js and migrate-transcripts.js first
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

async function verifyEpisodeCount() {
	try {
		console.log('📊 Verifying episode count...');

		// Count episodes in source file
		const episodesPath = path.join(projectRoot, 'src', 'assets', 'episodes6.json');
		const episodesData = JSON.parse(fs.readFileSync(episodesPath, 'utf-8'));
		const sourceCount = episodesData.length;

		// Count episodes in database
		const { count: dbCount, error } = await supabase
			.from('episodes')
			.select('*', { count: 'exact', head: true });

		if (error) {
			console.error('❌ Error counting episodes in database:', error.message);
			return false;
		}

		console.log(`   📁 Source file: ${sourceCount} episodes`);
		console.log(`   🗄️  Database: ${dbCount} episodes`);

		if (sourceCount === dbCount) {
			console.log('   ✅ Episode counts match!');
			return true;
		} else {
			console.log('   ❌ Episode count mismatch!');
			return false;
		}
	} catch (error) {
		console.error('❌ Error verifying episode count:', error.message);
		return false;
	}
}

async function verifyTranscriptCount() {
	try {
		console.log('📝 Verifying transcript line count...');

		// Count lines in source files
		const transcriptsDir = path.join(projectRoot, 'src', 'assets', 'transcripts');
		const transcriptFiles = fs.readdirSync(transcriptsDir).filter((file) => file.endsWith('.json'));

		let totalSourceLines = 0;
		for (const file of transcriptFiles) {
			const filePath = path.join(transcriptsDir, file);
			const transcriptData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
			if (Array.isArray(transcriptData)) {
				// Only count valid lines (matching the filter in migrate-transcripts.js)
				const validLines = transcriptData.filter(
					(line) => line && typeof line === 'object' && line.line
				);
				totalSourceLines += validLines.length;
			}
		}

		// Count lines in database
		const { count: dbCount, error } = await supabase
			.from('transcript_lines')
			.select('*', { count: 'exact', head: true });

		if (error) {
			console.error('❌ Error counting transcript lines in database:', error.message);
			return false;
		}

		console.log(`   📁 Source files: ${totalSourceLines} lines`);
		console.log(`   🗄️  Database: ${dbCount} lines`);

		if (totalSourceLines === dbCount) {
			console.log('   ✅ Transcript line counts match!');
			return true;
		} else {
			console.log('   ❌ Transcript line count mismatch!');
			return false;
		}
	} catch (error) {
		console.error('❌ Error verifying transcript count:', error.message);
		return false;
	}
}

async function verifyDataIntegrity() {
	try {
		console.log('🔍 Verifying data integrity...');

		// Check for orphaned transcript lines (lines without valid episode references)
		// Get a sample of transcript lines and verify their episode_id references exist
		const { data: sampleLines, error: sampleError } = await supabase
			.from('transcript_lines')
			.select('episode_id')
			.limit(100);

		if (sampleError) {
			console.error('❌ Error fetching sample transcript lines:', sampleError.message);
			return false;
		}

		if (sampleLines && sampleLines.length > 0) {
			// Check if the first few episode IDs exist in the episodes table
			const uniqueEpisodeIds = [...new Set(sampleLines.map((line) => line.episode_id))].slice(
				0,
				10
			);

			for (const episodeId of uniqueEpisodeIds) {
				const { data: episode, error: episodeCheckError } = await supabase
					.from('episodes')
					.select('id')
					.eq('id', episodeId)
					.single();

				if (episodeCheckError || !episode) {
					console.log(
						`   ❌ Found orphaned transcript lines referencing non-existent episode: ${episodeId}`
					);
					return false;
				}
			}
		}

		// Check for episodes without transcript lines
		const { data: episodesWithoutLines, error: episodeError } = await supabase.rpc(
			'get_episodes_without_transcripts'
		);

		if (episodeError) {
			console.log(`   ℹ️  RPC function not available, performing manual check...`);
		} else if (episodesWithoutLines && episodesWithoutLines.length > 0) {
			console.log(`   ⚠️  Found ${episodesWithoutLines.length} episodes without transcript lines`);
		}

		if (episodeError) {
			// If the function doesn't exist, do a manual check
			const { data: allEpisodes, error: allEpisodesError } = await supabase
				.from('episodes')
				.select('ep, id');

			if (allEpisodesError) {
				console.error('❌ Error checking episodes:', allEpisodesError.message);
				return false;
			}

			const episodesWithoutTranscripts = [];
			for (const episode of allEpisodes) {
				const { count, error } = await supabase
					.from('transcript_lines')
					.select('*', { count: 'exact', head: true })
					.eq('episode_id', episode.id);

				if (!error && count === 0) {
					episodesWithoutTranscripts.push(episode.ep);
				}
			}

			if (episodesWithoutTranscripts.length > 0) {
				console.log(
					`   ⚠️  Episodes without transcript lines: ${episodesWithoutTranscripts.slice(0, 5).join(', ')}${episodesWithoutTranscripts.length > 5 ? '...' : ''}`
				);
				console.log(
					`   📊 Total episodes without transcripts: ${episodesWithoutTranscripts.length}`
				);
			}
		}

		console.log('   ✅ Data integrity checks passed!');
		return true;
	} catch (error) {
		console.error('❌ Error verifying data integrity:', error.message);
		return false;
	}
}

async function testSearchFunctionality() {
	try {
		console.log('🔍 Testing search functionality...');

		// Test basic search using ilike for simple text matching
		const { data: searchResults, error: searchError } = await supabase
			.from('transcript_lines')
			.select('id, line, speaker')
			.ilike('line', '%the%')
			.limit(5);

		if (searchError) {
			console.error('❌ Error testing search functionality:', searchError.message);
			return false;
		}

		if (!searchResults || searchResults.length === 0) {
			console.log('   ⚠️  No search results found for common word "the"');
			return false;
		}

		console.log(`   ✅ Search test passed - found ${searchResults.length} results`);

		// Test filtering by season
		const { count: seasonCount, error: seasonError } = await supabase
			.from('transcript_lines')
			.select('*', { count: 'exact', head: true })
			.eq('season', 's01');

		if (seasonError) {
			console.error('❌ Error testing season filtering:', seasonError.message);
			return false;
		}

		if (seasonCount > 0) {
			console.log(`   ✅ Season filtering test passed - found ${seasonCount} lines in s01`);
		} else {
			console.log('   ⚠️  No lines found for season s01');
		}

		return true;
	} catch (error) {
		console.error('❌ Error testing search functionality:', error.message);
		return false;
	}
}

async function generateSummaryReport() {
	try {
		console.log('📈 Generating summary report...');

		// Episode statistics
		const { data: episodeStats, error: episodeError } = await supabase
			.from('episodes')
			.select('season')
			.order('season');

		if (!episodeError && episodeStats) {
			const seasonCounts = {};
			episodeStats.forEach((ep) => {
				seasonCounts[ep.season] = (seasonCounts[ep.season] || 0) + 1;
			});

			console.log('   📊 Episodes by season:');
			Object.entries(seasonCounts).forEach(([season, count]) => {
				console.log(`      ${season}: ${count} episodes`);
			});
		}

		// Transcript line statistics
		const { data: lineStats, error: lineError } = await supabase
			.from('transcript_lines')
			.select('season, edited')
			.order('season');

		if (!lineError && lineStats) {
			const lineCounts = {};
			const editedCounts = {};

			lineStats.forEach((line) => {
				lineCounts[line.season] = (lineCounts[line.season] || 0) + 1;
				if (line.edited) {
					editedCounts[line.season] = (editedCounts[line.season] || 0) + 1;
				}
			});

			console.log('   📝 Transcript lines by season:');
			Object.entries(lineCounts).forEach(([season, count]) => {
				const edited = editedCounts[season] || 0;
				const editedPercent = count > 0 ? ((edited / count) * 100).toFixed(1) : '0';
				console.log(`      ${season}: ${count} lines (${edited} edited - ${editedPercent}%)`);
			});
		}

		return true;
	} catch (error) {
		console.error('❌ Error generating summary report:', error.message);
		return false;
	}
}

async function verifyMigration() {
	console.log('🔍 Starting migration verification...\n');

	const checks = [
		{ name: 'Episode Count', fn: verifyEpisodeCount },
		{ name: 'Transcript Count', fn: verifyTranscriptCount },
		{ name: 'Data Integrity', fn: verifyDataIntegrity },
		{ name: 'Search Functionality', fn: testSearchFunctionality },
		{ name: 'Summary Report', fn: generateSummaryReport }
	];

	let passedChecks = 0;
	const totalChecks = checks.length;

	for (const check of checks) {
		console.log(`\n🔍 Running ${check.name} verification...`);
		const passed = await check.fn();
		if (passed) {
			passedChecks++;
		}
		console.log(''); // Add spacing between checks
	}

	console.log('='.repeat(50));
	console.log('📋 VERIFICATION SUMMARY');
	console.log('='.repeat(50));
	console.log(`✅ Passed: ${passedChecks}/${totalChecks} checks`);

	if (passedChecks === totalChecks) {
		console.log('🎉 All verification checks passed! Migration is complete and successful.');
	} else {
		console.log('⚠️  Some verification checks failed. Please review the issues above.');
		process.exit(1);
	}
}

// Run the verification
verifyMigration();
