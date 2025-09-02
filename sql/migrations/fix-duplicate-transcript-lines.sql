-- Fix duplicate transcript lines in the database
-- This addresses the root cause of the A,A,B,B search result duplication pattern

-- First, let's identify duplicates based on content
-- We'll check for rows that have the same line, speaker, timestamp_str, and episode_id
WITH duplicate_rows AS (
  SELECT 
    line,
    speaker, 
    timestamp_str,
    episode_id,
    season,
    edited,
    COUNT(*) as duplicate_count,
    array_agg(id ORDER BY created_at) as ids
  FROM transcript_lines 
  GROUP BY line, speaker, timestamp_str, episode_id, season, edited
  HAVING COUNT(*) > 1
),
-- Keep the first occurrence of each duplicate and mark others for deletion
rows_to_delete AS (
  SELECT 
    unnest(ids[2:]) as id_to_delete
  FROM duplicate_rows
)
-- Delete the duplicate rows (keeping the first one based on created_at)
DELETE FROM transcript_lines 
WHERE id IN (SELECT id_to_delete FROM rows_to_delete);

-- Report how many rows were affected
WITH duplicate_check AS (
  SELECT 
    line,
    speaker, 
    timestamp_str,
    episode_id,
    season,
    edited,
    COUNT(*) as duplicate_count
  FROM transcript_lines 
  GROUP BY line, speaker, timestamp_str, episode_id, season, edited
  HAVING COUNT(*) > 1
)
SELECT 
  'Remaining duplicates after cleanup: ' || COUNT(*) as cleanup_result
FROM duplicate_check;