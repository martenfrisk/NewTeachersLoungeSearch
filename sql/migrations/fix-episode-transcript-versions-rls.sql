-- Migration: Allow public read access to episode_transcript_versions and
-- transcript_lines_archive.
--
-- These tables were created by add-episode-version-history.sql with RLS
-- enabled by default and no SELECT policy ever added, unlike episodes /
-- transcript_lines / users in supabase-schema.sql. With RLS on and zero
-- policies, Postgres default-denies every role except postgres/service_role
-- - so anon (and authenticated) reads silently return zero rows, no error.
--
-- Effect: the "X edits" history badge and history panel on /ep/[id] have
-- never been visible to unauthenticated visitors, since HistoryService
-- queries these tables with the public anon key. This makes them public
-- read-only, same trust level as the already-public episodes/transcript_lines.
--
-- Neither table exposes anything sensitive once readable: episode_transcript_versions
-- includes a created_by UUID, but the users table stays locked to
-- "auth.uid() = id" (see supabase-schema.sql), so the users!created_by
-- embedded join used for display names keeps resolving to null/"Unknown"
-- for anonymous visitors - no email or username leaks through this change.

CREATE POLICY "Anyone can read episode transcript versions"
ON episode_transcript_versions FOR SELECT
USING (true);

CREATE POLICY "Anyone can read transcript lines archive"
ON transcript_lines_archive FOR SELECT
USING (true);
