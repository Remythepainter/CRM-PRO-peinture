
-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "All can read follow_up_step_statuses" ON public.follow_up_step_statuses;

-- Create a restrictive policy: admin sees all, employee sees only their own follow_ups' statuses
CREATE POLICY "Employee select own follow_up_step_statuses" ON public.follow_up_step_statuses
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.follow_ups
    WHERE follow_ups.id = follow_up_step_statuses.follow_up_id
      AND follow_ups.created_by = auth.uid()
  )
);
