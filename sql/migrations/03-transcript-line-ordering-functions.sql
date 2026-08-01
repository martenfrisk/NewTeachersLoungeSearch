-- Transcript line ordering, step 3 of 4: replace the write path.
-- Requires 01-transcript-line-ordering-columns.sql.
--
-- Deliberately runs BEFORE the NOT NULL constraint in step 04. From here on every
-- write populates line_number, which closes the window in which an approval could
-- insert a NULL ordinal and make step 04 fail.

BEGIN;

-- Carry line_number into the archive, or a restored version would come back in a
-- different order than it was archived in.
CREATE OR REPLACE FUNCTION archive_current_transcript_lines(
  target_episode_id UUID,
  target_version_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  archived_count INTEGER;
BEGIN
  INSERT INTO transcript_lines_archive (
    id,
    episode_id,
    season,
    timestamp_str,
    speaker,
    line,
    edited,
    line_number,
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
    line_number,
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

CREATE OR REPLACE FUNCTION apply_episode_submission(submission_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  submission_record episode_submissions;
  episode_season TEXT;
  new_version_id UUID;
  archived_count INTEGER;
  inserted_count INTEGER := 0;
BEGIN
  SELECT es.* INTO submission_record
  FROM episode_submissions es
  WHERE es.id = submission_id AND es.status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Submission not found or not pending';
  END IF;

  SELECT e.season INTO episode_season
  FROM episodes e
  WHERE e.id = submission_record.episode_id;

  IF episode_season IS NULL THEN
    RAISE EXCEPTION 'Episode not found for submission';
  END IF;

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

    -- Step 4: Insert new transcript lines from submission.
    --
    -- The submission array's order IS the editor's intended order, and until now
    -- it was thrown away. WITH ORDINALITY captures each element's position so it
    -- survives the round trip; a set-based INSERT also replaces the old row-at-a-
    -- time FOR loop, which cost one statement per line.
    INSERT INTO transcript_lines (
      episode_id,
      season,
      timestamp_str,
      speaker,
      line,
      edited,
      line_number,
      created_at,
      updated_at
    )
    SELECT
      submission_record.episode_id,
      episode_season, -- Use season from episode, not transcript line
      transcript_line->>'time',
      transcript_line->>'speaker',
      transcript_line->>'line',
      -- Per-line provenance, not a blanket true. `edited` is the human-reviewed
      -- badge shown in search results; only lines the editor explicitly committed
      -- carry it, and lines that already carried it keep it because the client
      -- round-trips the flag it read in fetchEpisodeTranscript.
      COALESCE((transcript_line->>'edited')::BOOLEAN, false),
      ordinality::INTEGER,
      NOW(),
      NOW()
    FROM jsonb_array_elements(submission_record.transcript_data::jsonb)
      WITH ORDINALITY AS elements(transcript_line, ordinality);

    GET DIAGNOSTICS inserted_count = ROW_COUNT;

    -- Step 5: Update version record with actual line count and mark as current
    UPDATE episode_transcript_versions
    SET lines_count = inserted_count
    WHERE id = new_version_id;

    PERFORM set_current_version(new_version_id);

    RAISE LOG 'Applied submission % for episode %: archived %, inserted % lines, version %',
      submission_id, submission_record.episode_id, archived_count, inserted_count, new_version_id;

    RETURN TRUE;

  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Failed to apply submission with version history: %', SQLERRM;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION restore_episode_version(target_version_id UUID, restore_by_user_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
  version_record episode_transcript_versions;
  new_version_id UUID;
  restored_count INTEGER := 0;
  archive_count INTEGER;
BEGIN
  SELECT * INTO version_record
  FROM episode_transcript_versions
  WHERE id = target_version_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Version not found: %', target_version_id;
  END IF;

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

    -- Step 4: Restore lines from the archived version. Ids are regenerated, which
    -- is why line_number has to be carried across explicitly -- it is now the only
    -- record of the restored ordering.
    INSERT INTO transcript_lines (
      id,
      episode_id,
      season,
      timestamp_str,
      speaker,
      line,
      edited,
      line_number,
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
      line_number,
      NOW(), -- New created_at
      NOW()  -- New updated_at
    FROM transcript_lines_archive
    WHERE version_id = target_version_id;

    GET DIAGNOSTICS restored_count = ROW_COUNT;

    UPDATE episode_transcript_versions
    SET lines_count = restored_count
    WHERE id = new_version_id;

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

COMMIT;
