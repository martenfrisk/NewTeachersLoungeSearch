-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Episodes table
CREATE TABLE episodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ep TEXT UNIQUE NOT NULL, -- "mini-01", "exit42-5", etc.
  title TEXT NOT NULL,
  description TEXT,
  date TIMESTAMP WITH TIME ZONE,
  url TEXT,
  feed_title TEXT,
  has_audio BOOLEAN DEFAULT FALSE,
  season TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transcript lines table
CREATE TABLE transcript_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id UUID NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  season TEXT NOT NULL,
  timestamp_str TEXT NOT NULL, -- Format: "0:23:45"
  speaker TEXT NOT NULL,
  line TEXT NOT NULL,
  edited BOOLEAN DEFAULT FALSE, -- Keep for compatibility with existing MeiliSearch structure
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users table for future authentication
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT auth.uid(),
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'moderator', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Line edits table for version control (future feature)
CREATE TABLE line_edits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_line_id UUID NOT NULL REFERENCES transcript_lines(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  line_text TEXT,
  timestamp_str TEXT,
  speaker TEXT,
  change_type TEXT[] NOT NULL, -- ['text'], ['timestamp'], ['text', 'timestamp'], ['speaker']
  edited_by UUID NOT NULL REFERENCES users(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'deleted')),
  delete_reason TEXT, -- For soft deletes
  confidence_score DECIMAL(3,2) DEFAULT 1.0, -- 0.0-1.0 for auto-flagging low confidence edits
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(original_line_id, version_number)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_transcript_lines_line_trgm ON transcript_lines USING GIN (line gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_transcript_lines_line_text ON transcript_lines USING GIN (line gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_transcript_lines_season ON transcript_lines(season);
CREATE INDEX IF NOT EXISTS idx_transcript_lines_episode_id ON transcript_lines(episode_id);
CREATE INDEX IF NOT EXISTS idx_transcript_lines_edited ON transcript_lines(edited);
-- Composite indexes for common filter combinations
CREATE INDEX IF NOT EXISTS idx_transcript_lines_season_edited ON transcript_lines(season, edited);
CREATE INDEX IF NOT EXISTS idx_transcript_lines_episode_edited ON transcript_lines(episode_id, edited);
CREATE INDEX IF NOT EXISTS idx_episodes_season ON episodes(season);
CREATE INDEX IF NOT EXISTS idx_episodes_ep ON episodes(ep);

-- Indexes for future edit system
CREATE INDEX idx_line_edits_original_line ON line_edits(original_line_id);
CREATE INDEX idx_line_edits_status ON line_edits(status);
CREATE INDEX idx_line_edits_edited_by ON line_edits(edited_by);

-- View for current transcript state (with edits applied)
CREATE VIEW current_transcript_lines AS
SELECT
  tl.id,
  tl.episode_id,
  tl.season,
  COALESCE(le.timestamp_str, tl.timestamp_str) as timestamp_str,
  COALESCE(le.speaker, tl.speaker) as speaker,
  COALESCE(le.line_text, tl.line) as line,
  CASE WHEN le.status = 'deleted' THEN true ELSE tl.edited END as edited,
  CASE WHEN le.status = 'deleted' THEN true ELSE false END as is_deleted,
  le.version_number,
  le.edited_by,
  le.created_at as last_edited
FROM transcript_lines tl
LEFT JOIN LATERAL (
  SELECT *
  FROM line_edits
  WHERE original_line_id = tl.id
    AND status IN ('approved', 'deleted')
  ORDER BY version_number DESC
  LIMIT 1
) le ON true;

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

-- Enable Row Level Security (RLS)
ALTER TABLE transcript_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE line_edits ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Allow public read access for transcripts and episodes
CREATE POLICY "Anyone can read transcript lines"
ON transcript_lines FOR SELECT
USING (true);

CREATE POLICY "Anyone can read episodes"
ON episodes FOR SELECT
USING (true);

-- Users can read their own user data
CREATE POLICY "Users can read own data"
ON users FOR SELECT
USING (auth.uid() = id);

-- Users can insert their own edits (for future feature)
CREATE POLICY "Users can create edits"
ON line_edits FOR INSERT
WITH CHECK (auth.uid() = edited_by);

-- Users can read all edits (for transparency)
CREATE POLICY "Anyone can read edits"
ON line_edits FOR SELECT
USING (true);

-- Only moderators/admins can update edit status
CREATE POLICY "Moderators can approve edits"
ON line_edits FOR UPDATE
USING (
  auth.uid() IN (
    SELECT id FROM users
    WHERE role IN ('moderator', 'admin')
  )
);

-- Set similarity threshold for trigram searches (adjust as needed)
SET pg_trgm.similarity_threshold = 0.3;