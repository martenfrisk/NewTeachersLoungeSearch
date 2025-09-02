-- Update apply_episode_submission function to integrate version history
-- This ensures all transcript changes are tracked with full history

CREATE OR REPLACE FUNCTION apply_episode_submission(submission_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  submission_record episode_submissions;
  episode_season TEXT;
  transcript_line JSONB;
  new_version_id UUID;
  archived_count INTEGER;
  inserted_count INTEGER := 0;
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
  
  -- Start transaction for version history
  BEGIN
    -- Step 1: Create new version record
    SELECT create_episode_version(
      submission_record.episode_id,
      submission_record.submitted_by,
      'submission',
      submission_id,
      COALESCE(submission_record.notes, 'Applied episode submission')
    ) INTO new_version_id;
    
    -- Step 2: Archive current transcript lines (if any exist)
    SELECT archive_current_transcript_lines(
      submission_record.episode_id, 
      new_version_id
    ) INTO archived_count;
    
    RAISE LOG 'Archived % existing transcript lines for episode %', 
      archived_count, submission_record.episode_id;
    
    -- Step 3: Delete existing transcript lines 
    DELETE FROM transcript_lines 
    WHERE episode_id = submission_record.episode_id;
    
    -- Step 4: Insert new transcript lines from submission
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
      
      inserted_count := inserted_count + 1;
    END LOOP;
    
    -- Step 5: Update version record with actual line count and mark as current
    UPDATE episode_transcript_versions 
    SET lines_count = inserted_count
    WHERE id = new_version_id;
    
    -- Set this version as current
    PERFORM set_current_version(new_version_id);
    
    RAISE LOG 'Applied submission % for episode %: archived %, inserted % lines, version %', 
      submission_id, submission_record.episode_id, archived_count, inserted_count, new_version_id;
    
    RETURN TRUE;
    
  EXCEPTION
    WHEN OTHERS THEN
      -- Rollback on error
      RAISE EXCEPTION 'Failed to apply submission with version history: %', SQLERRM;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to restore a previous version of an episode transcript
CREATE OR REPLACE FUNCTION restore_episode_version(target_version_id UUID, restore_by_user_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
  version_record episode_transcript_versions;
  new_version_id UUID;
  restored_count INTEGER := 0;
  archive_count INTEGER;
BEGIN
  -- Get the version record to restore
  SELECT * INTO version_record
  FROM episode_transcript_versions
  WHERE id = target_version_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Version not found: %', target_version_id;
  END IF;
  
  -- Check if this version is already current
  IF version_record.is_current THEN
    RAISE NOTICE 'Version % is already current', target_version_id;
    RETURN TRUE;
  END IF;
  
  BEGIN
    -- Step 1: Create new version record for this restoration
    SELECT create_episode_version(
      version_record.episode_id,
      restore_by_user_id,
      'manual',
      NULL,
      'Restored to version ' || version_record.version_number
    ) INTO new_version_id;
    
    -- Step 2: Archive current transcript lines
    SELECT archive_current_transcript_lines(
      version_record.episode_id,
      new_version_id
    ) INTO archive_count;
    
    -- Step 3: Delete current transcript lines
    DELETE FROM transcript_lines 
    WHERE episode_id = version_record.episode_id;
    
    -- Step 4: Restore lines from the archived version
    INSERT INTO transcript_lines (
      id,
      episode_id,
      season,
      timestamp_str,
      speaker,
      line,
      edited,
      created_at,
      updated_at
    )
    SELECT 
      gen_random_uuid(), -- New IDs for restored lines
      episode_id,
      season,
      timestamp_str,
      speaker,
      line,
      edited,
      NOW(), -- New created_at
      NOW()  -- New updated_at
    FROM transcript_lines_archive
    WHERE version_id = target_version_id;
    
    GET DIAGNOSTICS restored_count = ROW_COUNT;
    
    -- Step 5: Update version record with actual line count and mark as current
    UPDATE episode_transcript_versions 
    SET lines_count = restored_count
    WHERE id = new_version_id;
    
    -- Set this version as current
    PERFORM set_current_version(new_version_id);
    
    RAISE LOG 'Restored episode % to version %: archived %, restored % lines', 
      version_record.episode_id, version_record.version_number, archive_count, restored_count;
    
    RETURN TRUE;
    
  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Failed to restore version: %', SQLERRM;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get a diff summary between two versions
CREATE OR REPLACE FUNCTION get_version_diff_summary(from_version_id UUID, to_version_id UUID)
RETURNS TABLE(
  lines_added INTEGER,
  lines_removed INTEGER,
  lines_modified INTEGER,
  total_changes INTEGER
) AS $$
DECLARE
  from_lines_count INTEGER;
  to_lines_count INTEGER;
BEGIN
  -- Get line counts for both versions
  SELECT lines_count INTO from_lines_count
  FROM episode_transcript_versions
  WHERE id = from_version_id;
  
  SELECT lines_count INTO to_lines_count  
  FROM episode_transcript_versions
  WHERE id = to_version_id;
  
  -- For now, provide basic diff summary
  -- In future, could implement more sophisticated line-by-line comparison
  RETURN QUERY
  SELECT 
    GREATEST(0, to_lines_count - from_lines_count) as lines_added,
    GREATEST(0, from_lines_count - to_lines_count) as lines_removed,
    LEAST(from_lines_count, to_lines_count) as lines_modified, -- Simplified assumption
    ABS(to_lines_count - from_lines_count) as total_changes;
END;
$$ LANGUAGE plpgsql;