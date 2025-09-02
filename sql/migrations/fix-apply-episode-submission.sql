-- Fix apply_episode_submission function to properly handle season lookup
-- This fixes the "null value in column season" constraint violation

CREATE OR REPLACE FUNCTION apply_episode_submission(submission_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  submission_record episode_submissions;
  episode_season TEXT;
  transcript_line JSONB;
BEGIN
  -- Get the submission record (should be pending when called from approval flow)
  SELECT es.* INTO submission_record
  FROM episode_submissions es
  WHERE es.id = submission_id AND es.status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Submission not found or not pending';
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
    FOR transcript_line IN SELECT * FROM jsonb_array_elements(submission_record.transcript_data::jsonb)
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