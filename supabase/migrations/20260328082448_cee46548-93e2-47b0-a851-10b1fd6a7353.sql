
-- 1. Fix work_order_reports: restrict UPDATE to admin or the submitting team member
DROP POLICY IF EXISTS "All can update work_order_reports" ON public.work_order_reports;
CREATE POLICY "Admin or owner update work_order_reports"
  ON public.work_order_reports FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR (EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.id = work_order_reports.team_member_id
      AND tm.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    ))
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR (EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.id = work_order_reports.team_member_id
      AND tm.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    ))
  );

-- 2. Fix tool_assignments: admin full access, employees read only
DROP POLICY IF EXISTS "Authenticated users can manage tool assignments" ON public.tool_assignments;
CREATE POLICY "Admin full access tool_assignments"
  ON public.tool_assignments FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "All can read tool_assignments"
  ON public.tool_assignments FOR SELECT TO authenticated
  USING (true);

-- 3. Fix inventory_requests: employees manage own, admins manage all
DROP POLICY IF EXISTS "Authenticated users can manage inventory requests" ON public.inventory_requests;
CREATE POLICY "Admin full access inventory_requests"
  ON public.inventory_requests FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Employee select own inventory_requests"
  ON public.inventory_requests FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR requested_by = auth.uid());
CREATE POLICY "Employee insert inventory_requests"
  ON public.inventory_requests FOR INSERT TO authenticated
  WITH CHECK (requested_by = auth.uid());
CREATE POLICY "Employee update own inventory_requests"
  ON public.inventory_requests FOR UPDATE TO authenticated
  USING (requested_by = auth.uid())
  WITH CHECK (requested_by = auth.uid());

-- 4. Fix tag_assignments: keep read, restrict write to admin
DROP POLICY IF EXISTS "Authenticated manage tag_assignments" ON public.tag_assignments;
CREATE POLICY "Admin full access tag_assignments"
  ON public.tag_assignments FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Employee insert tag_assignments"
  ON public.tag_assignments FOR INSERT TO authenticated
  WITH CHECK (true);
CREATE POLICY "Employee delete tag_assignments"
  ON public.tag_assignments FOR DELETE TO authenticated
  USING (true);

-- 5. Fix activity_log: restrict to admin or own entries
DROP POLICY IF EXISTS "Authenticated read activity_log" ON public.activity_log;
CREATE POLICY "Admin read all activity_log"
  ON public.activity_log FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Employee read own activity_log"
  ON public.activity_log FOR SELECT TO authenticated
  USING (user_id = auth.uid());
