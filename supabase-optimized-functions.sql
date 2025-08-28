-- Optimized PostgreSQL functions for better performance and reduced timeouts

-- Set more aggressive timeout and work_mem settings for search queries
SET statement_timeout = '30s';
SET work_mem = '256MB';

-- Drop existing functions to replace them
DROP FUNCTION IF EXISTS fuzzy_search_transcripts(TEXT, TEXT[], TEXT[], BOOLEAN, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS get_search_facets(TEXT, BOOLEAN);

-- Optimized search function with performance improvements
CREATE OR REPLACE FUNCTION optimized_search_transcripts(
  search_query TEXT,
  season_filter TEXT[] DEFAULT NULL,
  episode_filter TEXT[] DEFAULT NULL,
  edited_only_filter BOOLEAN DEFAULT FALSE,
  limit_count INTEGER DEFAULT 20,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  season TEXT,
  timestamp_str TEXT,
  speaker TEXT,
  line TEXT,
  episode TEXT,
  edited BOOLEAN,
  similarity_score REAL,
  episode_title TEXT,
  total_count BIGINT
) AS $$
DECLARE
  total_rows BIGINT;
  search_term TEXT;
BEGIN
  -- Normalize search term for better performance
  search_term := TRIM(LOWER(search_query));
  
  -- Early exit for empty queries
  IF search_term = '' THEN
    RETURN;
  END IF;

  -- Get total count with optimized query (avoid expensive operations)
  SELECT COUNT(*) INTO total_rows
  FROM transcript_lines tl
  WHERE 
    (search_term = '' OR tl.line ILIKE '%' || search_term || '%')
    AND (season_filter IS NULL OR tl.season = ANY(season_filter))
    AND (episode_filter IS NULL OR EXISTS (
      SELECT 1 FROM episodes e 
      WHERE e.id = tl.episode_id AND e.ep = ANY(episode_filter)
    ))
    AND (NOT edited_only_filter OR tl.edited = true);

  -- Return paginated results with minimal similarity calculation
  RETURN QUERY
  SELECT
    tl.id,
    tl.season,
    tl.timestamp_str,
    tl.speaker,
    tl.line,
    e.ep as episode,
    tl.edited,
    -- Only calculate similarity for returned rows, not all matches
    CASE 
      WHEN search_term != '' THEN similarity(LOWER(tl.line), search_term)
      ELSE 1.0
    END as similarity_score,
    e.title as episode_title,
    total_rows as total_count
  FROM transcript_lines tl
  JOIN episodes e ON tl.episode_id = e.id
  WHERE 
    (search_term = '' OR tl.line ILIKE '%' || search_term || '%')
    AND (season_filter IS NULL OR tl.season = ANY(season_filter))
    AND (episode_filter IS NULL OR e.ep = ANY(episode_filter))
    AND (NOT edited_only_filter OR tl.edited = true)
  ORDER BY 
    -- Simpler sorting to avoid expensive similarity calculations on large sets
    CASE 
      WHEN tl.line ILIKE search_term || '%' THEN 3  -- Starts with
      WHEN tl.line ILIKE '%' || search_term || '%' THEN 2  -- Contains
      ELSE 1
    END DESC,
    tl.timestamp_str
  LIMIT limit_count OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- Fast facet counting function with better indexing strategy
CREATE OR REPLACE FUNCTION optimized_search_facets(
  search_query TEXT,
  edited_only_filter BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  facet_type TEXT,
  facet_value TEXT,
  count BIGINT
) AS $$
DECLARE
  search_term TEXT;
BEGIN
  search_term := TRIM(LOWER(search_query));
  
  -- Early exit for empty queries
  IF search_term = '' THEN
    RETURN;
  END IF;

  RETURN QUERY
  -- Season facets
  SELECT 'season'::TEXT as facet_type, tl.season as facet_value, COUNT(*) as count
  FROM transcript_lines tl
  WHERE 
    tl.line ILIKE '%' || search_term || '%'
    AND (NOT edited_only_filter OR tl.edited = true)
  GROUP BY tl.season
  HAVING COUNT(*) > 0
  
  UNION ALL
  
  -- Episode facets (limited to top 50 for performance)
  SELECT 'episode'::TEXT as facet_type, e.ep as facet_value, COUNT(*) as count
  FROM transcript_lines tl
  JOIN episodes e ON tl.episode_id = e.id
  WHERE 
    tl.line ILIKE '%' || search_term || '%'
    AND (NOT edited_only_filter OR tl.edited = true)
  GROUP BY e.ep
  HAVING COUNT(*) > 0
  ORDER BY count DESC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql;

-- Add additional optimized indexes for common query patterns
-- Note: Run these separately if using Supabase SQL editor (CONCURRENTLY requires no transaction)
-- Use hash index for exact matches and limit text length to avoid row size limits
CREATE INDEX IF NOT EXISTS idx_transcript_lines_line_hash 
  ON transcript_lines USING hash (LOWER(LEFT(line, 100)));

-- Trigram index for fuzzy search (already exists but ensure it's optimized)
CREATE INDEX IF NOT EXISTS idx_transcript_lines_line_trgm_optimized
  ON transcript_lines USING gin (LEFT(LOWER(line), 200) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_transcript_lines_composite_search 
  ON transcript_lines (season, edited, episode_id) 
  WHERE line IS NOT NULL AND line != '';

-- Analyze tables to update statistics for better query planning
ANALYZE transcript_lines;
ANALYZE episodes;

-- PostgreSQL configuration for better search performance
-- Note: These system settings require superuser privileges and may not work in Supabase
-- Instead, these are handled at the connection level in our Supabase client configuration
-- ALTER SYSTEM SET shared_buffers = '256MB';
-- ALTER SYSTEM SET effective_cache_size = '1GB';
-- ALTER SYSTEM SET random_page_cost = 1.1;  -- For SSD storage
-- ALTER SYSTEM SET work_mem = '64MB';       -- Per query work memory