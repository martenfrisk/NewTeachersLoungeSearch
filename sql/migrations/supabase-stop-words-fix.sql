-- Fix for PostgreSQL FTS stop words issue
-- This replaces the optimized_search_transcripts function to handle stop words

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
  use_fallback_search BOOLEAN := FALSE;
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

  -- If both FTS methods fail (likely due to stop words), use ILIKE fallback
  IF search_tsquery IS NULL THEN
    use_fallback_search := TRUE;
  END IF;

  -- Get total count - use appropriate search method
  IF use_fallback_search THEN
    -- ILIKE fallback for stop words
    SELECT COUNT(*) INTO total_rows
    FROM transcript_lines tl
    WHERE 
      tl.line ILIKE '%' || search_query || '%'
      AND (season_filter IS NULL OR tl.season = ANY(season_filter))
      AND (episode_filter IS NULL OR EXISTS (
        SELECT 1 FROM episodes e 
        WHERE e.id = tl.episode_id AND e.ep = ANY(episode_filter)
      ))
      AND (NOT edited_only_filter OR tl.edited = true);
  ELSE
    -- Use FTS - much faster than ILIKE
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
  END IF;

  -- Return paginated results with appropriate search method
  IF use_fallback_search THEN
    -- ILIKE fallback search for stop words
    RETURN QUERY
    SELECT
      tl.id,
      tl.season,
      tl.timestamp_str,
      tl.speaker,
      tl.line,
      e.ep as episode,
      tl.edited,
      -- Simple relevance score based on position of match
      CASE 
        WHEN tl.line ILIKE search_query || '%' THEN 0.9  -- Starts with query
        WHEN tl.line ILIKE '% ' || search_query || ' %' THEN 0.8  -- Exact word match
        WHEN tl.line ILIKE '% ' || search_query || '%' THEN 0.7  -- Word at start  
        WHEN tl.line ILIKE '%' || search_query || ' %' THEN 0.6  -- Word at end
        ELSE 0.5  -- Contains query
      END as similarity_score,
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
      -- Order by relevance score, then timestamp
      CASE 
        WHEN tl.line ILIKE search_query || '%' THEN 0.9
        WHEN tl.line ILIKE '% ' || search_query || ' %' THEN 0.8
        WHEN tl.line ILIKE '% ' || search_query || '%' THEN 0.7
        WHEN tl.line ILIKE '%' || search_query || ' %' THEN 0.6
        ELSE 0.5
      END DESC,
      tl.timestamp_str
    LIMIT limit_count OFFSET offset_count;
  ELSE
    -- Use FTS with proper relevance scoring
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
  END IF;
END;
$$ LANGUAGE plpgsql;


-- Also update the facet function to handle stop words
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
  use_fallback_search BOOLEAN := FALSE;
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

  -- If both FTS methods fail (likely due to stop words), use ILIKE fallback
  IF search_tsquery IS NULL THEN
    use_fallback_search := TRUE;
  END IF;

  IF use_fallback_search THEN
    -- ILIKE fallback for stop words
    RETURN QUERY
    -- Season facets using ILIKE
    SELECT 'season'::TEXT as facet_type, tl.season as facet_value, COUNT(*) as count
    FROM transcript_lines tl
    WHERE 
      tl.line ILIKE '%' || search_query || '%'
      AND (NOT edited_only_filter OR tl.edited = true)
    GROUP BY tl.season
    HAVING COUNT(*) > 0
    
    UNION ALL
    
    -- Episode facets using ILIKE (limited to top 50 for performance)
    SELECT 'episode'::TEXT as facet_type, e.ep as facet_value, COUNT(*) as count
    FROM transcript_lines tl
    JOIN episodes e ON tl.episode_id = e.id
    WHERE 
      tl.line ILIKE '%' || search_query || '%'
      AND (NOT edited_only_filter OR tl.edited = true)
    GROUP BY e.ep
    HAVING COUNT(*) > 0
    ORDER BY count DESC
    LIMIT 50;
  ELSE
    -- Use FTS
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
  END IF;
END;
$$ LANGUAGE plpgsql;