-- Read-only diagnosis for anonymous read access to episode_submissions.
--
-- Run this in the Supabase SQL editor BEFORE applying
-- sql/migrations/06-episode-submissions-rls-lockdown.sql, and keep the output.
--
-- Deliberately a SINGLE statement: the Supabase SQL editor displays only the
-- last result set when several statements are run together, which silently hides
-- everything but the final one. Everything below is UNION ALL'd into one table
-- of (section, detail) so nothing can be lost that way.
--
-- Nothing here writes.
--
-- What the output tells you
-- -------------------------
--   section 'rls'
--     enabled=false  -> RLS was never switched on for this table. The ALTER on
--                       line 30 of episode-submissions.sql did not run, and no
--                       policy is being consulted at all.
--     enabled=true   -> RLS is on, so a permissive policy is granting the read.
--                       Look for it in the 'policy' rows below.
--     forced         -> should be false. apply_episode_submission() and
--                       restore_episode_version() are SECURITY DEFINER and run
--                       as the table owner; forcing RLS would subject them to
--                       these policies and break moderator approvals.
--
--   section 'policy'
--     One row per policy. The culprit, if there is one, is a row with
--     cmd=SELECT, permissive=PERMISSIVE, roles containing `anon` or `public`,
--     and a using expression that is not `false`.
--
--     Permissive policies are OR'd together, so the existing
--     "Anonymous users cannot read submissions" policy (roles={anon},
--     using=false) contributes nothing whatsoever: `false OR x` is `x`. Only an
--     `AS RESTRICTIVE` policy can subtract access.
--
--   section 'grant'
--     Table-level privileges. A missing SELECT grant would surface as a
--     permission error rather than an empty result, so this separates
--     "denied by RLS" from "denied by grants".

SELECT
	'1-rls' AS section,
	format(
		'enabled=%s  forced=%s',
		c.relrowsecurity,
		c.relforcerowsecurity
	) AS detail
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname = 'episode_submissions'

UNION ALL

SELECT
	'2-policy',
	format(
		'%s | %s | roles=%s | using=%s | check=%s | name=%s',
		p.cmd,
		p.permissive,
		p.roles::text,
		coalesce(p.qual, '-'),
		coalesce(p.with_check, '-'),
		p.policyname
	)
FROM pg_policies p
WHERE p.schemaname = 'public'
  AND p.tablename = 'episode_submissions'

UNION ALL

SELECT
	'3-grant',
	format('%s -> %s', g.grantee, g.privilege_type)
FROM information_schema.role_table_grants g
WHERE g.table_schema = 'public'
  AND g.table_name = 'episode_submissions'
  AND g.grantee IN ('anon', 'authenticated', 'public', 'service_role')

ORDER BY 1, 2;
