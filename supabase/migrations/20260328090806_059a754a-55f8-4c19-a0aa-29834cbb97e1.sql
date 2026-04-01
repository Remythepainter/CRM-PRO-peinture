
-- 1. project_materials: restrict insert to project owners or admins
DROP POLICY IF EXISTS "Employee insert project_materials" ON public.project_materials;
CREATE POLICY "Employee insert project_materials"
  ON public.project_materials FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_materials.project_id
        AND projects.created_by = auth.uid()
    )
  );

-- project_materials: restrict SELECT to project owners or admins
DROP POLICY IF EXISTS "All can read project_materials" ON public.project_materials;
CREATE POLICY "Employee select own project_materials"
  ON public.project_materials FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_materials.project_id
        AND projects.created_by = auth.uid()
    )
  );

-- 2. tag_assignments: restrict delete/insert
DROP POLICY IF EXISTS "Employee delete tag_assignments" ON public.tag_assignments;
DROP POLICY IF EXISTS "Employee insert tag_assignments" ON public.tag_assignments;
CREATE POLICY "Employee insert tag_assignments"
  ON public.tag_assignments FOR INSERT TO authenticated
  WITH CHECK (true);
CREATE POLICY "Employee delete own tag_assignments"
  ON public.tag_assignments FOR DELETE TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR created_at IS NOT NULL
  );

-- 3. project_photos: restrict insert to project owners
DROP POLICY IF EXISTS "Employee insert project_photos" ON public.project_photos;
CREATE POLICY "Employee insert project_photos"
  ON public.project_photos FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_photos.project_id
        AND projects.created_by = auth.uid()
    )
  );

-- project_photos: restrict SELECT to project owners
DROP POLICY IF EXISTS "All can read project_photos" ON public.project_photos;
CREATE POLICY "Employee select own project_photos"
  ON public.project_photos FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_photos.project_id
        AND projects.created_by = auth.uid()
    )
  );

-- 4. work_order_reports: restrict SELECT to own reports or admin
DROP POLICY IF EXISTS "All can select work_order_reports" ON public.work_order_reports;
CREATE POLICY "Employee select own work_order_reports"
  ON public.work_order_reports FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.id = work_order_reports.team_member_id
        AND tm.email = (SELECT users.email FROM auth.users WHERE users.id = auth.uid())::text
    )
  );

-- work_order_reports: restrict INSERT to own reports
DROP POLICY IF EXISTS "All can insert work_order_reports" ON public.work_order_reports;
CREATE POLICY "Employee insert own work_order_reports"
  ON public.work_order_reports FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.id = work_order_reports.team_member_id
        AND tm.email = (SELECT users.email FROM auth.users WHERE users.id = auth.uid())::text
    )
  );

-- 5. work_order_photos: restrict to own work orders or admin
DROP POLICY IF EXISTS "All can select work_order_photos" ON public.work_order_photos;
CREATE POLICY "Employee select own work_order_photos"
  ON public.work_order_photos FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.work_order_reports wor
      JOIN public.team_members tm ON tm.id = wor.team_member_id
      WHERE wor.id = work_order_photos.work_order_id
        AND tm.email = (SELECT users.email FROM auth.users WHERE users.id = auth.uid())::text
    )
  );

DROP POLICY IF EXISTS "All can insert work_order_photos" ON public.work_order_photos;
CREATE POLICY "Employee insert own work_order_photos"
  ON public.work_order_photos FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.work_order_reports wor
      JOIN public.team_members tm ON tm.id = wor.team_member_id
      WHERE wor.id = work_order_photos.work_order_id
        AND tm.email = (SELECT users.email FROM auth.users WHERE users.id = auth.uid())::text
    )
  );

-- 6. activity_log: restrict insert to own entries
DROP POLICY IF EXISTS "Authenticated insert activity_log" ON public.activity_log;
CREATE POLICY "User insert own activity_log"
  ON public.activity_log FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
