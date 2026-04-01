
-- Add created_by column to all data tables (nullable to not break existing rows)
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);
ALTER TABLE public.pipeline_deals ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);
ALTER TABLE public.follow_ups ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);
ALTER TABLE public.schedule_events ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);
ALTER TABLE public.time_entries ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- ============================================================
-- Replace all RLS policies with role-based ones
-- Pattern: Admins → full access; Employees → SELECT all, INSERT/UPDATE/DELETE own
-- ============================================================

-- LEADS
DROP POLICY IF EXISTS "Authenticated access to leads" ON public.leads;
CREATE POLICY "Admin full access to leads" ON public.leads FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Employee select leads" ON public.leads FOR SELECT TO authenticated USING (true);
CREATE POLICY "Employee insert leads" ON public.leads FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Employee update own leads" ON public.leads FOR UPDATE TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY "Employee delete own leads" ON public.leads FOR DELETE TO authenticated USING (created_by = auth.uid());

-- PIPELINE_DEALS
DROP POLICY IF EXISTS "Authenticated access to pipeline_deals" ON public.pipeline_deals;
CREATE POLICY "Admin full access to pipeline_deals" ON public.pipeline_deals FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Employee select pipeline_deals" ON public.pipeline_deals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Employee insert pipeline_deals" ON public.pipeline_deals FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Employee update own pipeline_deals" ON public.pipeline_deals FOR UPDATE TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY "Employee delete own pipeline_deals" ON public.pipeline_deals FOR DELETE TO authenticated USING (created_by = auth.uid());

-- QUOTES
DROP POLICY IF EXISTS "Authenticated access to quotes" ON public.quotes;
CREATE POLICY "Admin full access to quotes" ON public.quotes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Employee select quotes" ON public.quotes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Employee insert quotes" ON public.quotes FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Employee update own quotes" ON public.quotes FOR UPDATE TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY "Employee delete own quotes" ON public.quotes FOR DELETE TO authenticated USING (created_by = auth.uid());

-- FOLLOW_UPS
DROP POLICY IF EXISTS "Authenticated access to follow_ups" ON public.follow_ups;
CREATE POLICY "Admin full access to follow_ups" ON public.follow_ups FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Employee select follow_ups" ON public.follow_ups FOR SELECT TO authenticated USING (true);
CREATE POLICY "Employee insert follow_ups" ON public.follow_ups FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Employee update own follow_ups" ON public.follow_ups FOR UPDATE TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY "Employee delete own follow_ups" ON public.follow_ups FOR DELETE TO authenticated USING (created_by = auth.uid());

-- PROJECTS
DROP POLICY IF EXISTS "Allow all access to projects" ON public.projects;
CREATE POLICY "Admin full access to projects" ON public.projects FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Employee select projects" ON public.projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Employee insert projects" ON public.projects FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Employee update own projects" ON public.projects FOR UPDATE TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY "Employee delete own projects" ON public.projects FOR DELETE TO authenticated USING (created_by = auth.uid());

-- SCHEDULE_EVENTS
DROP POLICY IF EXISTS "Allow all access to schedule_events" ON public.schedule_events;
CREATE POLICY "Admin full access to schedule_events" ON public.schedule_events FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Employee select schedule_events" ON public.schedule_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Employee insert schedule_events" ON public.schedule_events FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Employee update own schedule_events" ON public.schedule_events FOR UPDATE TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY "Employee delete own schedule_events" ON public.schedule_events FOR DELETE TO authenticated USING (created_by = auth.uid());

-- TIME_ENTRIES
DROP POLICY IF EXISTS "Allow all access to time_entries" ON public.time_entries;
CREATE POLICY "Admin full access to time_entries" ON public.time_entries FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Employee select time_entries" ON public.time_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Employee insert time_entries" ON public.time_entries FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Employee update own time_entries" ON public.time_entries FOR UPDATE TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY "Employee delete own time_entries" ON public.time_entries FOR DELETE TO authenticated USING (created_by = auth.uid());

-- INVENTORY_ITEMS
DROP POLICY IF EXISTS "Allow all access to inventory_items" ON public.inventory_items;
CREATE POLICY "Admin full access to inventory_items" ON public.inventory_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Employee select inventory_items" ON public.inventory_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Employee insert inventory_items" ON public.inventory_items FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Employee update own inventory_items" ON public.inventory_items FOR UPDATE TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY "Employee delete own inventory_items" ON public.inventory_items FOR DELETE TO authenticated USING (created_by = auth.uid());

-- SHARED/READ-ONLY TABLES (all authenticated can read, only admin can modify)
-- company_settings
DROP POLICY IF EXISTS "Allow all access to company_settings" ON public.company_settings;
CREATE POLICY "All can read company_settings" ON public.company_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage company_settings" ON public.company_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- team_members
DROP POLICY IF EXISTS "Allow all access to team_members" ON public.team_members;
CREATE POLICY "All can read team_members" ON public.team_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage team_members" ON public.team_members FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- follow_up_sequences (templates)
DROP POLICY IF EXISTS "Authenticated access to follow_up_sequences" ON public.follow_up_sequences;
CREATE POLICY "All can read follow_up_sequences" ON public.follow_up_sequences FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage follow_up_sequences" ON public.follow_up_sequences FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- follow_up_sequence_steps (templates)
DROP POLICY IF EXISTS "Authenticated access to follow_up_sequence_steps" ON public.follow_up_sequence_steps;
CREATE POLICY "All can read follow_up_sequence_steps" ON public.follow_up_sequence_steps FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage follow_up_sequence_steps" ON public.follow_up_sequence_steps FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- follow_up_step_statuses
DROP POLICY IF EXISTS "Authenticated access to follow_up_step_statuses" ON public.follow_up_step_statuses;
CREATE POLICY "All can read follow_up_step_statuses" ON public.follow_up_step_statuses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage follow_up_step_statuses" ON public.follow_up_step_statuses FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- project_photos
DROP POLICY IF EXISTS "Allow all access to project_photos" ON public.project_photos;
CREATE POLICY "All can read project_photos" ON public.project_photos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage project_photos" ON public.project_photos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Employee insert project_photos" ON public.project_photos FOR INSERT TO authenticated WITH CHECK (true);

-- project_materials
DROP POLICY IF EXISTS "Allow all access to project_materials" ON public.project_materials;
CREATE POLICY "All can read project_materials" ON public.project_materials FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage project_materials" ON public.project_materials FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Employee insert project_materials" ON public.project_materials FOR INSERT TO authenticated WITH CHECK (true);
