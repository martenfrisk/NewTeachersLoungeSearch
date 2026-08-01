-- Migration: reconcile episode_submissions with the deployed schema
--
-- Background
-- ----------
-- `sql/migrations/episode-submissions.sql` creates the table with plaintext
-- `contributor_name` / `contributor_email` columns. Production does not have
-- those columns; it has a hashed, session-scoped set that
-- SupabaseEditorRepository.submitEpisodeTranscript() has been writing all along
-- (see the insert in src/lib/repositories/EditorRepository.ts).
--
-- The drift was one-directional: the client matched production and the
-- checked-in SQL did not, so anyone reconstructing the database from `sql/`
-- would get a schema the app cannot write to. This migration brings the
-- checked-in history in line with what is actually deployed.
--
-- Verified against the live database on 2026-08-01. The 21 columns below are
-- exactly the deployed set.
--
-- Idempotent: safe to run against a database that already has these columns
-- (i.e. production), and sufficient to bring a fresh database built from
-- episode-submissions.sql up to the deployed shape.

-- Contributor identity, stored without retaining plaintext contact details.
ALTER TABLE episode_submissions
  -- Display name shown in the moderation queue. Optional, self-asserted.
  ADD COLUMN IF NOT EXISTS contributor_display_name TEXT,
  -- Opaque per-browser identifier, lets an anonymous contributor be grouped
  -- across submissions without an account.
  ADD COLUMN IF NOT EXISTS contributor_session_id TEXT,
  -- SHA-256 of the contact address. Enables "same contributor?" comparisons and
  -- abuse handling without storing the address itself.
  ADD COLUMN IF NOT EXISTS contributor_contact_hash TEXT,
  -- Whether a contact address was supplied at all, since the hash above cannot
  -- distinguish "not provided" from "provided but unmatched".
  ADD COLUMN IF NOT EXISTS contact_provided BOOLEAN DEFAULT FALSE;

-- Abuse / duplicate-submission controls.
ALTER TABLE episode_submissions
  -- Content hash, used to collapse identical re-submissions.
  ADD COLUMN IF NOT EXISTS submission_fingerprint TEXT,
  -- Coarse rate-limiting bucket key.
  ADD COLUMN IF NOT EXISTS submission_rate_key TEXT;

-- Moderation and bookkeeping.
ALTER TABLE episode_submissions
  -- Free-text moderator note, distinct from the contributor's `notes`.
  ADD COLUMN IF NOT EXISTS reviewer_notes TEXT,
  -- Reserved for submission metadata; `transcript_data` remains the payload.
  ADD COLUMN IF NOT EXISTS submission_data JSONB,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Remove the plaintext contact columns that never existed in production.
-- Storing a contributor's email in the clear was the thing the hashed columns
-- above were introduced to avoid.
ALTER TABLE episode_submissions
  DROP COLUMN IF EXISTS contributor_name,
  DROP COLUMN IF EXISTS contributor_email;

-- Supports the duplicate-submission lookup performed before an insert.
CREATE INDEX IF NOT EXISTS idx_episode_submissions_fingerprint
  ON episode_submissions (submission_fingerprint);

-- Supports grouping an anonymous contributor's submissions in the queue.
CREATE INDEX IF NOT EXISTS idx_episode_submissions_session
  ON episode_submissions (contributor_session_id);
