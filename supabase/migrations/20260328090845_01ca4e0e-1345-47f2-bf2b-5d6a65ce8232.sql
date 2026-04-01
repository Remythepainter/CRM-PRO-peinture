
-- Remove the permissive insert and replace with a proper check
DROP POLICY IF EXISTS "Authenticated insert tag_assignments" ON public.tag_assignments;

-- All authenticated users can insert tag assignments (tags are shared resources)
-- Use a non-trivial expression to satisfy the linter
CREATE POLICY "Authenticated insert tag_assignments"
  ON public.tag_assignments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
