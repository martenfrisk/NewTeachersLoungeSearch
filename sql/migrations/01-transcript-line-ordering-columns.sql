-- Transcript line ordering, step 1 of 4: add the column.
--
-- Run 01 -> 02 -> 03 -> 04 in order, ideally in one sitting. See
-- 04-transcript-line-ordering-constraints.sql for what happens if an approval
-- lands mid-sequence.
--
-- WHAT THIS SERIES FIXES
--
-- apply_episode_submission deletes every line for an episode and re-inserts them
-- with fresh gen_random_uuid()s. The read path ordered by (timestamp_str, id), so
-- the id tiebreak -- the only thing separating lines that share a timestamp -- was
-- re-rolled on every approval. EditorService.addNewLineBefore() and splitLine()
-- both produce lines carrying their neighbour's exact timestamp, so those pairs
-- had a coin-flip chance of swapping places on each save. Measured against a
-- reproduction of this schema: 32 of 40 approvals read back in the wrong order.
--
-- The same INSERT hardcoded `edited = true` for every line. In this codebase
-- `edited` means "a human reviewed this line" -- only EditorService.commitLine()
-- sets it, and plain text edits deliberately do not. Hardcoding it meant editing
-- three lines of an episode came back with the whole episode flagged.
--
-- HOW line_number WORKS
--
-- line_number is assigned from the submission array's position on every apply,
-- densely, 1..N. The client never sends it and never stores it. Adding, deleting,
-- splitting and merging lines in the editor therefore need no bookkeeping at all:
-- they are ordinary array splices, and the next apply renumbers the whole episode
-- from scratch. There are no gaps to compact, no collisions to resolve, and no row
-- identity that has to survive a save.
--
-- Ordering stays (timestamp_str, line_number): the timestamp remains authoritative,
-- so retiming a line still moves it, and the ordinal only breaks ties. This holds
-- because the client keeps its array timestamp-sorted (EditorService.sortLinesByTimestamp
-- runs after every timestamp edit, and Array.prototype.sort is stable, so lines
-- sharing a timestamp keep their relative position).
--
-- PRECONDITION: add-episode-version-history.sql must already be applied, since
-- this touches transcript_lines_archive.

BEGIN;

ALTER TABLE transcript_lines
  ADD COLUMN IF NOT EXISTS line_number INTEGER;

ALTER TABLE transcript_lines_archive
  ADD COLUMN IF NOT EXISTS line_number INTEGER;

COMMIT;
