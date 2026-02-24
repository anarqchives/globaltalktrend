
-- Drop the restrictive INSERT policy
DROP POLICY IF EXISTS "Anyone can submit feedback" ON public.trend_feedback;

-- Recreate as PERMISSIVE (default) so anonymous inserts work
CREATE POLICY "Anyone can submit feedback"
ON public.trend_feedback
FOR INSERT
TO anon, authenticated
WITH CHECK (true);
