-- Migration: Fix episode_submissions RLS policy to allow users to read their own submissions
-- This fixes the issue where users cannot see their own contributions on the profile page

-- Drop the existing restrictive RLS policy
DROP POLICY IF EXISTS "Moderators and admins can view episode submissions" ON episode_submissions;

-- Create a new policy that allows:
-- 1. Users to read their own submissions (authenticated submissions)
-- 2. Moderators/admins to read all submissions
-- 3. Anonymous submissions remain private (only moderators/admins can see them)
CREATE POLICY "Users can read own submissions and moderators can read all"
ON episode_submissions FOR SELECT
TO authenticated
USING (
  -- Users can read their own submissions
  (submitted_by = auth.uid()) 
  OR 
  -- Moderators and admins can read all submissions
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('moderator', 'admin')
  )
);

-- Also create a policy for anonymous users to ensure they can't read any submissions
-- (This is more explicit than relying on the authenticated-only policy above)
CREATE POLICY "Anonymous users cannot read submissions"
ON episode_submissions FOR SELECT
TO anon
USING (false);