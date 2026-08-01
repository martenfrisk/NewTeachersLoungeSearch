-- Transcript line ordering, step 2 of 4: backfill existing rows.
-- Requires 01-transcript-line-ordering-columns.sql.
--
-- Existing rows have no recorded order, so reconstruct the only defensible one:
-- the exact order the application has been reading them in until now. This keeps
-- currently-displayed transcripts byte-identical across the migration.
--
-- It does NOT recover orderings that a past save already scrambled. Where two
-- lines were swapped by an earlier approval, the backfill freezes them in the
-- swapped order -- it has no record of the original. Those need a manual pass in
-- the editor, which will stick once this series is applied.
--
-- Scoped to episodes/versions that still contain an unnumbered row. This is what
-- makes the file safely re-runnable, and it is not cosmetic: numbering purely by
-- (timestamp_str, id) is a guess, so applying it to rows that already carry a
-- correct ordinal would re-scramble exactly the duplicate-timestamp groups this
-- series exists to pin down. Once no NULLs remain, this file is a no-op.
--
-- Scoping by episode rather than by row is safe because apply_episode_submission
-- replaces an entire episode at once (DELETE then INSERT), so an episode is either
-- fully numbered or fully NULL -- never a mix that would collide on renumbering.

BEGIN;

WITH affected AS (
  SELECT DISTINCT episode_id
  FROM transcript_lines
  WHERE line_number IS NULL
),
numbered AS (
  SELECT
    id,
    row_number() OVER (PARTITION BY episode_id ORDER BY timestamp_str, id) AS rn
  FROM transcript_lines
  WHERE episode_id IN (SELECT episode_id FROM affected)
)
UPDATE transcript_lines tl
SET line_number = numbered.rn
FROM numbered
WHERE tl.id = numbered.id
  AND tl.line_number IS DISTINCT FROM numbered.rn;

WITH affected AS (
  SELECT DISTINCT version_id
  FROM transcript_lines_archive
  WHERE line_number IS NULL
),
numbered AS (
  SELECT
    id,
    version_id,
    row_number() OVER (PARTITION BY version_id ORDER BY timestamp_str, id) AS rn
  FROM transcript_lines_archive
  WHERE version_id IN (SELECT version_id FROM affected)
)
UPDATE transcript_lines_archive a
SET line_number = numbered.rn
FROM numbered
WHERE a.id = numbered.id
  AND a.version_id = numbered.version_id
  AND a.line_number IS DISTINCT FROM numbered.rn;

COMMIT;
