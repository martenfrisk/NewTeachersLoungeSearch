-- PostgreSQL Full-Text Search functions using tsvector and GIN indexes
-- This replaces the slow ILIKE pattern matching with proper FTS

-- Set reasonable timeout and work_mem settings for FTS queries
SET statement_timeout = '15s';
SET work_mem = '128MB';

-- Drop existing functions to replace them
DROP FUNCTION IF EXISTS fuzzy_search_transcripts(TEXT, TEXT[], TEXT[], BOOLEAN, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS get_search_facets(TEXT, BOOLEAN);

-- PostgreSQL Full-Text Search optimized function
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
  search_tsquery tsquery;
BEGIN
  -- Early exit for empty queries
  IF TRIM(search_query) = '' THEN
    RETURN;
  END IF;

  -- Create tsquery from search string - websearch_to_tsquery handles phrases naturally
  BEGIN
    search_tsquery := websearch_to_tsquery('english', search_query);
  EXCEPTION WHEN OTHERS THEN
    -- Fallback to plainto_tsquery if websearch_to_tsquery fails
    search_tsquery := plainto_tsquery('english', search_query);
  END;

  -- Early exit if no valid query terms
  IF search_tsquery IS NULL THEN
    RETURN;
  END IF;

  -- Get total count using FTS - much faster than ILIKE
  SELECT COUNT(*) INTO total_rows
  FROM transcript_lines tl
  WHERE 
    tl.search_vector @@ search_tsquery
    AND (season_filter IS NULL OR tl.season = ANY(season_filter))
    AND (episode_filter IS NULL OR EXISTS (
      SELECT 1 FROM episodes e 
      WHERE e.id = tl.episode_id AND e.ep = ANY(episode_filter)
    ))
    AND (NOT edited_only_filter OR tl.edited = true);

  -- Return paginated results with proper FTS ranking
  RETURN QUERY
  SELECT
    tl.id,
    tl.season,
    tl.timestamp_str,
    tl.speaker,
    tl.line,
    e.ep as episode,
    tl.edited,
    -- Use ts_rank for relevance scoring - much faster than similarity()
    ts_rank(tl.search_vector, search_tsquery) as similarity_score,
    e.title as episode_title,
    total_rows as total_count
  FROM transcript_lines tl
  JOIN episodes e ON tl.episode_id = e.id
  WHERE 
    tl.search_vector @@ search_tsquery
    AND (season_filter IS NULL OR tl.season = ANY(season_filter))
    AND (episode_filter IS NULL OR e.ep = ANY(episode_filter))
    AND (NOT edited_only_filter OR tl.edited = true)
  ORDER BY 
    -- Order by FTS relevance score (higher is more relevant)
    ts_rank(tl.search_vector, search_tsquery) DESC,
    tl.timestamp_str
  LIMIT limit_count OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- Fast facet counting function using PostgreSQL FTS
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
  search_tsquery tsquery;
BEGIN
  -- Early exit for empty queries
  IF TRIM(search_query) = '' THEN
    RETURN;
  END IF;

  -- Create tsquery from search string
  BEGIN
    search_tsquery := websearch_to_tsquery('english', search_query);
  EXCEPTION WHEN OTHERS THEN
    -- Fallback to plainto_tsquery if websearch_to_tsquery fails
    search_tsquery := plainto_tsquery('english', search_query);
  END;

  -- Early exit if no valid query terms
  IF search_tsquery IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  -- Season facets using FTS
  SELECT 'season'::TEXT as facet_type, tl.season as facet_value, COUNT(*) as count
  FROM transcript_lines tl
  WHERE 
    tl.search_vector @@ search_tsquery
    AND (NOT edited_only_filter OR tl.edited = true)
  GROUP BY tl.season
  HAVING COUNT(*) > 0
  
  UNION ALL
  
  -- Episode facets using FTS (limited to top 50 for performance)
  SELECT 'episode'::TEXT as facet_type, e.ep as facet_value, COUNT(*) as count
  FROM transcript_lines tl
  JOIN episodes e ON tl.episode_id = e.id
  WHERE 
    tl.search_vector @@ search_tsquery
    AND (NOT edited_only_filter OR tl.edited = true)
  GROUP BY e.ep
  HAVING COUNT(*) > 0
  ORDER BY count DESC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql;

-- Additional composite index for efficient filtering with FTS
CREATE INDEX IF NOT EXISTS idx_transcript_lines_fts_filters 
  ON transcript_lines (season, edited, episode_id) 
  WHERE search_vector IS NOT NULL;

-- Update table statistics for optimal query planning with FTS
ANALYZE transcript_lines;
ANALYZE episodes;

-- Set PostgreSQL FTS configuration for better English language support
SET default_text_search_config = 'english';