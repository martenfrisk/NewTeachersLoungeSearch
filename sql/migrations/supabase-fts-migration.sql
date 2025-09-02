-- PostgreSQL Full-Text Search Migration
-- This migrates from basic ILIKE pattern matching to proper FTS with tsvector

-- Add tsvector column for full-text search
ALTER TABLE transcript_lines 
ADD COLUMN IF NOT EXISTS search_vector tsvector 
GENERATED ALWAYS AS (to_tsvector('english', line)) STORED;

-- Create GIN index for lightning-fast full-text search
CREATE INDEX IF NOT EXISTS idx_transcript_search_vector 
ON transcript_lines USING GIN (search_vector);

-- Additional indexes for filtering - GIN can't combine tsvector with text columns
-- Use separate btree indexes for efficient filtering combined with FTS
CREATE INDEX IF NOT EXISTS idx_transcript_search_season_btree 
ON transcript_lines (season) WHERE search_vector IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transcript_search_episode_btree 
ON transcript_lines (episode_id) WHERE search_vector IS NOT NULL;

-- Drop old inefficient indexes that we're replacing
DROP INDEX IF EXISTS idx_transcript_lines_line_trgm;
DROP INDEX IF EXISTS idx_transcript_lines_line_text;
DROP INDEX IF EXISTS idx_transcript_lines_line_hash;
DROP INDEX IF EXISTS idx_transcript_lines_line_trgm_optimized;

-- Keep essential indexes for filtering
-- (season, edited, episode_id indexes are still useful for facets)

-- Update table statistics for better query planning
ANALYZE transcript_lines;

-- Set PostgreSQL FTS configuration for better English language support
-- This can help with stemming and stop word handling
SET default_text_search_config = 'english';