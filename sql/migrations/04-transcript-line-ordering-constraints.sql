-- Transcript line ordering, step 4 of 4: enforce and index.
-- Requires 01, 02 and 03.
--
-- IF THIS FAILS with a NOT NULL violation, an approval landed between step 02 and
-- step 03 and inserted rows with a NULL ordinal. Re-run 02, then this file again;
-- 02 only touches episodes that still contain a NULL, so it will number exactly
-- those rows and leave every already-migrated episode alone. Note it numbers them
-- by (timestamp_str, id), so a duplicate-timestamp pair inside that one submission
-- may need a manual pass in the editor.

BEGIN;

ALTER TABLE transcript_lines ALTER COLUMN line_number SET NOT NULL;
ALTER TABLE transcript_lines_archive ALTER COLUMN line_number SET NOT NULL;

-- Uniqueness is what makes the ordering total -- without it a buggy write could
-- reintroduce exactly the ambiguity this series exists to remove.
-- ADD CONSTRAINT has no IF NOT EXISTS, so guard it for re-runs.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_line_number_per_episode'
  ) THEN
    ALTER TABLE transcript_lines
      ADD CONSTRAINT unique_line_number_per_episode
      UNIQUE (episode_id, line_number) DEFERRABLE INITIALLY IMMEDIATE;
  END IF;
END $$;

-- Covers EditorRepository.fetchEpisodeTranscript and ContextService.loadTranscript:
-- filter by episode, order by (timestamp_str, line_number).
CREATE INDEX IF NOT EXISTS idx_transcript_lines_episode_order
  ON transcript_lines (episode_id, timestamp_str, line_number);

CREATE INDEX IF NOT EXISTS idx_transcript_lines_archive_version_order
  ON transcript_lines_archive (version_id, timestamp_str, line_number);

COMMIT;
