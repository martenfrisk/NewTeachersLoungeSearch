-- Migration: Episode-level submissions system
-- Replace individual line_edits with complete episode submissions

-- Create episode_submissions table
CREATE TABLE episode_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id UUID NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  episode_ep TEXT NOT NULL, -- Store ep string for easier querying (e.g. "s03e06")
  submission_type TEXT DEFAULT 'full_replacement' CHECK (submission_type IN ('full_replacement', 'partial_edit')),
  transcript_data JSONB NOT NULL, -- Complete transcript lines for this episode
  submitted_by UUID REFERENCES users(id), -- NULL for anonymous submissions
  contributor_name TEXT,
  contributor_email TEXT,
  notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT
);

-- Indexes for performance
CREATE INDEX idx_episode_submissions_episode_id ON episode_submissions(episode_id);
CREATE INDEX idx_episode_submissions_episode_ep ON episode_submissions(episode_ep);
CREATE INDEX idx_episode_submissions_status ON episode_submissions(status);
CREATE INDEX idx_episode_submissions_created_at ON episode_submissions(created_at);
CREATE INDEX idx_episode_submissions_submitted_by ON episode_submissions(submitted_by);

-- Enable RLS
ALTER TABLE episode_submissions ENABLE ROW LEVEL SECURITY;

-- RLS policy for reading submissions (moderators and admins)
CREATE POLICY "Moderators and admins can view episode submissions" 
ON episode_submissions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('moderator', 'admin')
  )
);

-- RLS policy for creating submissions (anyone can submit)
CREATE POLICY "Anyone can create episode submissions"
ON episode_submissions FOR INSERT
WITH CHECK (true);

-- RLS policy for updating submissions (only moderators/admins for approval/rejection)
CREATE POLICY "Moderators and admins can update episode submissions"
ON episode_submissions FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('moderator', 'admin')
  )
);

-- Function to apply approved episode submission
CREATE OR REPLACE FUNCTION apply_episode_submission(submission_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  submission_record episode_submissions;
  episode_season TEXT;
  transcript_line JSONB;
BEGIN
  -- Get the submission record
  SELECT es.* INTO submission_record
  FROM episode_submissions es
  WHERE es.id = submission_id AND es.status = 'approved';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Submission not found or not approved';
  END IF;
  
  -- Get the episode season
  SELECT e.season INTO episode_season
  FROM episodes e
  WHERE e.id = submission_record.episode_id;
  
  IF episode_season IS NULL THEN
    RAISE EXCEPTION 'Episode not found for submission';
  END IF;
  
  -- Start transaction
  BEGIN
    -- Delete existing transcript lines for this episode
    DELETE FROM transcript_lines 
    WHERE episode_id = submission_record.episode_id;
    
    -- Insert new transcript lines from submission
    FOR transcript_line IN SELECT * FROM jsonb_array_elements(submission_record.transcript_data)
    LOOP
      INSERT INTO transcript_lines (
        episode_id,
        season,
        timestamp_str,
        speaker,
        line,
        edited,
        created_at,
        updated_at
      ) VALUES (
        submission_record.episode_id,
        episode_season, -- Use season from episode, not transcript line
        (transcript_line->>'time')::TEXT,
        (transcript_line->>'speaker')::TEXT,
        (transcript_line->>'line')::TEXT,
        true, -- Mark as edited since it came from a submission
        NOW(),
        NOW()
      );
    END LOOP;
    
    RETURN TRUE;
  EXCEPTION
    WHEN OTHERS THEN
      -- Rollback on error
      RAISE EXCEPTION 'Failed to apply submission: %', SQLERRM;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users (moderators/admins will use this)
GRANT EXECUTE ON FUNCTION apply_episode_submission(UUID) TO authenticated;