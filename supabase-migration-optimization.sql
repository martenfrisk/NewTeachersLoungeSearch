-- Migration: Optimize search functions and add performance indexes
-- Run this after the initial schema has been applied

-- Add new composite indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transcript_lines_season_edited ON transcript_lines(season, edited);
CREATE INDEX IF NOT EXISTS idx_transcript_lines_episode_edited ON transcript_lines(episode_id, edited);

-- Optimized PostgreSQL function for fuzzy search with facets
CREATE OR REPLACE FUNCTION fuzzy_search_transcripts(
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
BEGIN
  -- Get total count first (without expensive similarity calculation)
  SELECT COUNT(*) INTO total_rows
  FROM transcript_lines tl
  JOIN episodes e ON tl.episode_id = e.id
  WHERE 
    tl.line ILIKE '%' || search_query || '%'  -- Use ILIKE for faster initial filtering
    AND (season_filter IS NULL OR tl.season = ANY(season_filter))
    AND (episode_filter IS NULL OR e.ep = ANY(episode_filter))
    AND (NOT edited_only_filter OR tl.edited = true);

  -- Return paginated results with similarity scoring only on matched rows
  RETURN QUERY
  SELECT
    tl.id,
    tl.season,
    tl.timestamp_str,
    tl.speaker,
    tl.line,
    e.ep as episode,
    tl.edited,
    similarity(tl.line, search_query) as similarity_score,
    e.title as episode_title,
    total_rows as total_count
  FROM transcript_lines tl
  JOIN episodes e ON tl.episode_id = e.id
  WHERE 
    tl.line ILIKE '%' || search_query || '%'
    AND (season_filter IS NULL OR tl.season = ANY(season_filter))
    AND (episode_filter IS NULL OR e.ep = ANY(episode_filter))
    AND (NOT edited_only_filter OR tl.edited = true)
  ORDER BY 
    -- First sort by exact matches, then by similarity
    CASE WHEN tl.line ILIKE '%' || search_query || '%' THEN similarity(tl.line, search_query) ELSE 0 END DESC,
    tl.timestamp_str
  LIMIT limit_count OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- Optimized function to get facet counts for search results
CREATE OR REPLACE FUNCTION get_search_facets(
  search_query TEXT,
  edited_only_filter BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  facet_type TEXT,
  facet_value TEXT,
  count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 'season' as facet_type, tl.season as facet_value, COUNT(*) as count
  FROM transcript_lines tl
  WHERE 
    tl.line ILIKE '%' || search_query || '%'  -- Use ILIKE instead of trigram operator
    AND (NOT edited_only_filter OR tl.edited = true)
  GROUP BY tl.season
  UNION ALL
  SELECT 'episode' as facet_type, e.ep as facet_value, COUNT(*) as count
  FROM transcript_lines tl
  JOIN episodes e ON tl.episode_id = e.id
  WHERE 
    tl.line ILIKE '%' || search_query || '%'  -- Use ILIKE instead of trigram operator
    AND (NOT edited_only_filter OR tl.edited = true)
  GROUP BY e.ep
  ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql;