-- Read-only checks for sql/migrations/0{1..4}-transcript-line-ordering-*.sql.
-- Nothing here writes; run the blocks individually in the Supabase SQL editor.

-- ==============================================================================
-- BEFORE the migration
-- ==============================================================================

-- 1. How exposed are we? Every line in a duplicate-timestamp group is a line that
--    could have been reordered by a save. Episodes at the top of this list are the
--    ones where the shuffle would have been most visible.
WITH grouped AS (
  SELECT
    episode_id,
    count(*) OVER (PARTITION BY episode_id, timestamp_str) AS group_size
  FROM transcript_lines
)
SELECT
  e.ep,
  count(*) FILTER (WHERE g.group_size > 1) AS lines_in_ambiguous_groups,
  count(*)                                 AS total_lines,
  round(
    100.0 * count(*) FILTER (WHERE g.group_size > 1) / nullif(count(*), 0),
    1
  ) AS pct_ambiguous
FROM grouped g
JOIN episodes e ON e.id = g.episode_id
GROUP BY e.ep
HAVING count(*) FILTER (WHERE g.group_size > 1) > 0
ORDER BY lines_in_ambiguous_groups DESC
LIMIT 25;

-- 2. Episodes where `edited` looks like it was set in bulk rather than per line.
--    A fully-flagged episode is the fingerprint of the hardcoded `true` -- s03e06
--    should appear here before the migration.
SELECT
  e.ep,
  count(*)                              AS total_lines,
  count(*) FILTER (WHERE tl.edited)     AS edited_lines,
  bool_and(tl.edited)                   AS every_line_flagged
FROM transcript_lines tl
JOIN episodes e ON e.id = tl.episode_id
GROUP BY e.ep
HAVING bool_and(tl.edited)
ORDER BY total_lines DESC;

-- ==============================================================================
-- AFTER the migration
-- ==============================================================================

-- 3. Every episode must have a dense 1..N ordinal with no gaps or repeats.
--    This should return zero rows.
SELECT
  e.ep,
  count(*)                       AS total_lines,
  count(DISTINCT tl.line_number) AS distinct_ordinals,
  min(tl.line_number)            AS min_ordinal,
  max(tl.line_number)            AS max_ordinal
FROM transcript_lines tl
JOIN episodes e ON e.id = tl.episode_id
GROUP BY e.ep
HAVING count(*) <> count(DISTINCT tl.line_number)
    OR min(tl.line_number) <> 1
    OR max(tl.line_number) <> count(*);

-- 4. Same check for the archive, partitioned by version. Also zero rows.
SELECT
  version_id,
  count(*)                    AS total_lines,
  count(DISTINCT line_number) AS distinct_ordinals
FROM transcript_lines_archive
GROUP BY version_id
HAVING count(*) <> count(DISTINCT line_number)
    OR min(line_number) <> 1
    OR max(line_number) <> count(*);

-- 5. The backfill must not have changed what anyone sees. For a given episode the
--    new ordering (timestamp_str, line_number) has to reproduce the old ordering
--    (timestamp_str, id) exactly. Zero rows means the transcript is unchanged.
--    Run this per episode; replace the ep below.
WITH old_order AS (
  SELECT tl.id, row_number() OVER (ORDER BY tl.timestamp_str, tl.id) AS pos
  FROM transcript_lines tl
  JOIN episodes e ON e.id = tl.episode_id
  WHERE e.ep = 's03e06'
),
new_order AS (
  SELECT tl.id, row_number() OVER (ORDER BY tl.timestamp_str, tl.line_number) AS pos
  FROM transcript_lines tl
  JOIN episodes e ON e.id = tl.episode_id
  WHERE e.ep = 's03e06'
)
SELECT o.id, o.pos AS old_pos, n.pos AS new_pos
FROM old_order o
JOIN new_order n USING (id)
WHERE o.pos <> n.pos;

-- ==============================================================================
-- AFTER the next edit-and-approve cycle
-- ==============================================================================

-- 6. Confirm both fixes landed together. `edited_lines` should now match the
--    number of lines actually committed in the editor rather than the line count,
--    and the ordinals should still be dense.
SELECT
  e.ep,
  count(*)                          AS total_lines,
  count(*) FILTER (WHERE tl.edited) AS edited_lines,
  max(tl.line_number)               AS max_ordinal,
  count(DISTINCT tl.timestamp_str)  AS distinct_timestamps
FROM transcript_lines tl
JOIN episodes e ON e.id = tl.episode_id
WHERE e.ep = 's03e06'
GROUP BY e.ep;

-- 7. Inspect the duplicate-timestamp groups directly -- these are the lines whose
--    relative order used to be a coin flip. Their line_numbers should be
--    consecutive and in the order the transcript reads.
SELECT
  tl.timestamp_str,
  tl.line_number,
  tl.speaker,
  left(tl.line, 60) AS line_preview
FROM transcript_lines tl
JOIN episodes e ON e.id = tl.episode_id
WHERE e.ep = 's03e06'
  AND tl.timestamp_str IN (
    SELECT timestamp_str
    FROM transcript_lines tl2
    WHERE tl2.episode_id = tl.episode_id
    GROUP BY timestamp_str
    HAVING count(*) > 1
  )
ORDER BY tl.timestamp_str, tl.line_number;
