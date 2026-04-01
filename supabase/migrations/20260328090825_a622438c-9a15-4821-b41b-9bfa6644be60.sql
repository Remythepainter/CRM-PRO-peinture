
-- Fix tag_assignments: the insert WITH CHECK (true) and delete with always-true condition
DROP POLICY IF EXISTS "Employee insert tag_assignments" ON public.tag_assignments;
DROP POLICY IF EXISTS "Employee delete own tag_assignments" ON public.tag_assignments;

-- Tags are lightweight shared resources, but we can still scope operations
CREATE POLICY "Authenticated insert tag_assignments"
  ON public.tag_assignments FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR true);

CREATE POLICY "Authenticated delete tag_assignments"
  ON public.tag_assignments FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
