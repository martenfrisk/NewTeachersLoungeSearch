-- Add version history tables for episode transcripts
-- This allows tracking complete history of transcript changes at the episode level

-- Episode transcript versions table
CREATE TABLE episode_transcript_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id UUID NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  source_type TEXT NOT NULL CHECK (source_type IN ('original', 'submission', 'manual')),
  submission_id UUID REFERENCES episode_submissions(id),
  change_summary TEXT,
  is_current BOOLEAN DEFAULT false,
  lines_count INTEGER DEFAULT 0,
  
  -- Ensure only one current version per episode
  CONSTRAINT unique_current_version_per_episode 
    EXCLUDE (episode_id WITH =) WHERE (is_current = true),
  
  -- Ensure unique version numbers per episode  
  CONSTRAINT unique_version_number_per_episode 
    UNIQUE (episode_id, version_number)
);

-- Archive table for old transcript lines
CREATE TABLE transcript_lines_archive (
  -- Same schema as transcript_lines
  id UUID NOT NULL,
  episode_id UUID NOT NULL,
  season TEXT NOT NULL,
  timestamp_str TEXT NOT NULL,
  speaker TEXT NOT NULL,
  line TEXT NOT NULL,
  edited BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  search_vector tsvector,
  
  -- Archive metadata
  version_id UUID NOT NULL REFERENCES episode_transcript_versions(id) ON DELETE CASCADE,
  archived_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Composite primary key including version for uniqueness
  PRIMARY KEY (id, version_id)
);

-- Index for efficient queries
CREATE INDEX idx_episode_transcript_versions_episode_id ON episode_transcript_versions(episode_id);
CREATE INDEX idx_episode_transcript_versions_current ON episode_transcript_versions(episode_id) WHERE is_current = true;
CREATE INDEX idx_transcript_lines_archive_version ON transcript_lines_archive(version_id);
CREATE INDEX idx_transcript_lines_archive_episode ON transcript_lines_archive(episode_id);

-- Function to get next version number for an episode
CREATE OR REPLACE FUNCTION get_next_version_number(target_episode_id UUID)
RETURNS INTEGER AS $$
DECLARE
  next_version INTEGER;
BEGIN
  SELECT COALESCE(MAX(version_number), 0) + 1 
  INTO next_version
  FROM episode_transcript_versions 
  WHERE episode_id = target_episode_id;
  
  RETURN next_version;
END;
$$ LANGUAGE plpgsql;

-- Function to create a new version record
CREATE OR REPLACE FUNCTION create_episode_version(
  target_episode_id UUID,
  creator_id UUID DEFAULT NULL,
  source_type TEXT DEFAULT 'manual',
  target_submission_id UUID DEFAULT NULL,
  summary TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  new_version_id UUID;
  next_version INTEGER;
  current_lines_count INTEGER;
BEGIN
  -- Get next version number
  next_version := get_next_version_number(target_episode_id);
  
  -- Count current lines
  SELECT COUNT(*) INTO current_lines_count
  FROM transcript_lines 
  WHERE episode_id = target_episode_id;
  
  -- Create version record
  INSERT INTO episode_transcript_versions (
    episode_id,
    version_number,
    created_by,
    source_type,
    submission_id,
    change_summary,
    is_current,
    lines_count
  ) VALUES (
    target_episode_id,
    next_version,
    creator_id,
    source_type,
    target_submission_id,
    summary,
    false, -- Will be set to current after successful application
    current_lines_count
  )
  RETURNING id INTO new_version_id;
  
  RETURN new_version_id;
END;
$$ LANGUAGE plpgsql;

-- Function to archive current transcript lines
CREATE OR REPLACE FUNCTION archive_current_transcript_lines(
  target_episode_id UUID,
  target_version_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  archived_count INTEGER;
BEGIN
  -- Archive all current transcript lines for the episode
  INSERT INTO transcript_lines_archive (
    id,
    episode_id,
    season,
    timestamp_str,
    speaker,
    line,
    edited,
    created_at,
    updated_at,
    search_vector,
    version_id,
    archived_at
  )
  SELECT 
    id,
    episode_id,
    season,
    timestamp_str,
    speaker,
    line,
    edited,
    created_at,
    updated_at,
    search_vector,
    target_version_id,
    NOW()
  FROM transcript_lines
  WHERE episode_id = target_episode_id;
  
  GET DIAGNOSTICS archived_count = ROW_COUNT;
  
  RETURN archived_count;
END;
$$ LANGUAGE plpgsql;

-- Function to mark a version as current
CREATE OR REPLACE FUNCTION set_current_version(target_version_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  target_episode_id UUID;
BEGIN
  -- Get episode_id for this version
  SELECT episode_id INTO target_episode_id
  FROM episode_transcript_versions
  WHERE id = target_version_id;
  
  IF target_episode_id IS NULL THEN
    RAISE EXCEPTION 'Version not found: %', target_version_id;
  END IF;
  
  -- Clear current flag for all versions of this episode
  UPDATE episode_transcript_versions 
  SET is_current = false 
  WHERE episode_id = target_episode_id;
  
  -- Set this version as current
  UPDATE episode_transcript_versions 
  SET is_current = true 
  WHERE id = target_version_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- View for easy access to current version info
CREATE VIEW episode_current_versions AS
SELECT 
  etv.*,
  e.ep,
  e.title,
  e.season as episode_season,
  u.username as created_by_username
FROM episode_transcript_versions etv
JOIN episodes e ON etv.episode_id = e.id
LEFT JOIN users u ON etv.created_by = u.id
WHERE etv.is_current = true;

-- Function to get version history for an episode
CREATE OR REPLACE FUNCTION get_episode_version_history(target_episode_ep TEXT)
RETURNS TABLE(
  version_id UUID,
  version_number INTEGER,
  created_at TIMESTAMPTZ,
  created_by_username TEXT,
  source_type TEXT,
  change_summary TEXT,
  lines_count INTEGER,
  is_current BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    etv.id as version_id,
    etv.version_number,
    etv.created_at,
    u.username as created_by_username,
    etv.source_type,
    etv.change_summary,
    etv.lines_count,
    etv.is_current
  FROM episode_transcript_versions etv
  JOIN episodes e ON etv.episode_id = e.id
  LEFT JOIN users u ON etv.created_by = u.id
  WHERE e.ep = target_episode_ep
  ORDER BY etv.version_number DESC;
END;
$$ LANGUAGE plpgsql;