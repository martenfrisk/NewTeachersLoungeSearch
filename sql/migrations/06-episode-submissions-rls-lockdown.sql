-- Migration: stop anonymous visitors reading episode_submissions
--
-- Problem
-- -------
-- An unauthenticated request with the publishable key returns every row:
--
--   curl "$PUBLIC_SUPABASE_URL/rest/v1/episode_submissions?select=*" \
--        -H "apikey: $PUBLIC_SUPABASE_ANON_KEY"
--
-- returns 2 of 2 rows, including contributor_display_name, contributor_session_id,
-- contributor_contact_hash, notes, reviewer_notes and the full transcript_data.
--
-- Cause (confirmed against production via
-- sql/queries/diagnose-episode-submissions-rls.sql)
-- ------------------------------------------------
-- RLS is enabled (`relrowsecurity = t`, not forced). The read is granted by a
-- policy that exists in no migration in this repository:
--
--   SELECT | PERMISSIVE | roles={public}
--   USING ((submitted_by = auth.uid()) OR (submitted_by IS NULL))
--   name "Users can view their own submissions"
--
-- `roles={public}` applies to every role including `anon`, and
-- `submitted_by IS NULL` is true of every anonymous submission. So a clause
-- meant to express "you can see your own" actually reads "anyone can see every
-- anonymous submission": when the submitter is anonymous there is no identity to
-- compare against, and the NULL fallback matches everybody. Both rows currently
-- in the table are anonymous, which is why anon sees 2 of 2.
--
-- Production also carries a parallel set of policies under different names from
-- the checked-in SQL ("Anyone can submit episode transcripts" rather than
-- "Anyone can create episode submissions"; "Moderators can update submissions"
-- rather than "Moderators and admins can update episode submissions"), so four
-- permissive SELECT policies are OR'd together — two from
-- fix-episode-submissions-rls.sql and two from an untracked source. That is why
-- the drops below enumerate pg_policies instead of naming policies: a named DROP
-- would miss the one actually granting the access.
--
-- Nothing depends on the anonymous read. The only contributor-facing read is
-- /api/profile/contributions, which requires a bearer token and filters on
-- submitted_by = auth.uid(); there is no feature that shows an anonymous
-- contributor their own submission back.
--
-- Why the existing "Anonymous users cannot read submissions" policy did not help
-- -----------------------------------------------------------------------------
-- Permissive policies are OR'd together, so a policy whose USING clause is
-- `false` can never remove access — `false OR x` is `x`. Its comment claims it
-- is "more explicit than relying on the authenticated-only policy above", but
-- the authenticated-only policy was the whole protection. Below, anonymous
-- access is denied by the *absence* of any permissive policy for `anon`, and
-- then belt-and-braces by an `AS RESTRICTIVE` policy, which does subtract.

BEGIN;

-- 1. Make sure row-level security is actually on.
--    No-op if it already is. Deliberately NOT `FORCE`: apply_episode_submission()
--    and restore_episode_version() are SECURITY DEFINER and execute as the table
--    owner, and forcing RLS would apply these policies to them and break the
--    moderator approval path.
ALTER TABLE public.episode_submissions ENABLE ROW LEVEL SECURITY;

-- 2. Remove every existing SELECT policy, including any created through the
--    dashboard that no migration knows the name of. Named drops alone would
--    leave an unknown permissive policy in place, which is the more likely of
--    the two hypotheses.
DO $$
DECLARE
	pol RECORD;
BEGIN
	FOR pol IN
		SELECT policyname
		FROM pg_policies
		WHERE schemaname = 'public'
		  AND tablename = 'episode_submissions'
		  AND cmd = 'SELECT'
	LOOP
		EXECUTE format(
			'DROP POLICY IF EXISTS %I ON public.episode_submissions',
			pol.policyname
		);
	END LOOP;
END $$;

-- 3. The single intended read policy.
--
--    Contributors read their own submissions (this is what
--    /api/profile/contributions relies on, filtering by submitted_by with the
--    caller's bearer token); moderators and admins read everything (this is what
--    the /moderate queue relies on). `anon` is named nowhere, so anonymous
--    requests match no permissive policy and see nothing.
CREATE POLICY "Contributors read own submissions, moderators read all"
ON public.episode_submissions
FOR SELECT
TO authenticated
USING (
	submitted_by = auth.uid()
	OR EXISTS (
		SELECT 1 FROM public.users
		WHERE users.id = auth.uid()
		  AND users.role IN ('moderator', 'admin')
	)
);

-- 4. Belt and braces. Unlike a permissive `USING (false)`, a RESTRICTIVE policy
--    is AND'ed with the others, so this genuinely subtracts anonymous access and
--    will keep doing so even if someone later adds a permissive policy that
--    names `anon` or `public`.
CREATE POLICY "Anonymous visitors read nothing"
ON public.episode_submissions
AS RESTRICTIVE
FOR SELECT
TO anon
USING (false);

-- 5. Collapse the UPDATE policies down to one.
--
--    The live policy "Moderators can update submissions" already carries a
--    WITH CHECK, so the gap the checked-in SQL implies is not present in
--    production. It is scoped roles={public} rather than {authenticated}, which
--    is harmless — its predicate requires auth.uid() to resolve to a moderator,
--    which anon can never satisfy — but it means the checked-in policy name and
--    the deployed one differ, and a named DROP would leave both in place.
--
--    Enumerating rather than naming, for the same reason as the SELECT drops.
DO $$
DECLARE
	pol RECORD;
BEGIN
	FOR pol IN
		SELECT policyname
		FROM pg_policies
		WHERE schemaname = 'public'
		  AND tablename = 'episode_submissions'
		  AND cmd = 'UPDATE'
	LOOP
		EXECUTE format(
			'DROP POLICY IF EXISTS %I ON public.episode_submissions',
			pol.policyname
		);
	END LOOP;
END $$;

CREATE POLICY "Moderators and admins can update submissions"
ON public.episode_submissions
FOR UPDATE
TO authenticated
USING (
	EXISTS (
		SELECT 1 FROM public.users
		WHERE users.id = auth.uid()
		  AND users.role IN ('moderator', 'admin')
	)
)
WITH CHECK (
	EXISTS (
		SELECT 1 FROM public.users
		WHERE users.id = auth.uid()
		  AND users.role IN ('moderator', 'admin')
	)
);

-- The INSERT policy is deliberately left alone. In production it is
--   "Anyone can submit episode transcripts" | roles={public} | WITH CHECK (true)
-- (the checked-in SQL calls it "Anyone can create episode submissions"; same
-- effect, different name). Anonymous contribution is the product's intent and
-- the editor submits with the publishable key.
--
-- Two known gaps left open here on purpose, each its own change:
--   * WITH CHECK (true) permits an arbitrary `submitted_by`, since nothing ties
--     it to auth.uid(). Constraining it has a compatibility question for the
--     anonymous path, where submitted_by is legitimately NULL.
--   * There is no DELETE policy at all, so no one — moderators included — can
--     delete a submission through the API. That may be intentional (submissions
--     are an audit trail) but it is worth an explicit decision.
--
-- On the grants reported by the diagnostic: anon and authenticated hold the full
-- SELECT/INSERT/UPDATE/DELETE/TRUNCATE set. That is Supabase's default blanket
-- grant on public-schema tables, not something this project configured, and RLS
-- is what actually constrains those roles. TRUNCATE is the one privilege RLS
-- does not gate, but it is unreachable here: PostgREST exposes no TRUNCATE verb,
-- and `anon` is not a login role, so it cannot be reached over a direct
-- connection either.

COMMIT;

-- Verification
-- ------------
-- From the repo root, this must print an empty array:
--
--   eval "$(grep -m1 '^PUBLIC_SUPABASE_URL=' .env)"
--   eval "$(grep -m1 '^PUBLIC_SUPABASE_ANON_KEY=' .env)"
--   curl -s "${PUBLIC_SUPABASE_URL%/}/rest/v1/episode_submissions?select=*&limit=1" \
--        -H "apikey: $PUBLIC_SUPABASE_ANON_KEY"
--
-- Then confirm the two authenticated paths still work, because RLS is their only
-- real enforcement:
--   * /moderate signed in as a user whose users.role is 'moderator' — the queue
--     must still list pending submissions, and approve/reject must still work.
--   * /profile signed in as a user who has submitted — their own contributions
--     must still be listed.
