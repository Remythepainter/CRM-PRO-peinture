
-- Fix tool_assignments: restrict SELECT to admin or own assignments
DROP POLICY IF EXISTS "All can read tool_assignments" ON public.tool_assignments;
CREATE POLICY "Employee select own tool_assignments"
  ON public.tool_assignments FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.id = tool_assignments.team_member_id
        AND tm.email = (SELECT users.email FROM auth.users WHERE users.id = auth.uid())::text
    )
  );
