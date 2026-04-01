
-- Restrict employee SELECT to only their own rows on data tables
-- Admins still see everything via the "Admin full access" FOR ALL policy

-- LEADS
DROP POLICY IF EXISTS "Employee select leads" ON public.leads;
CREATE POLICY "Employee select own leads" ON public.leads FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR created_by = auth.uid());

-- PIPELINE_DEALS
DROP POLICY IF EXISTS "Employee select pipeline_deals" ON public.pipeline_deals;
CREATE POLICY "Employee select own pipeline_deals" ON public.pipeline_deals FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR created_by = auth.uid());

-- QUOTES
DROP POLICY IF EXISTS "Employee select quotes" ON public.quotes;
CREATE POLICY "Employee select own quotes" ON public.quotes FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR created_by = auth.uid());

-- FOLLOW_UPS
DROP POLICY IF EXISTS "Employee select follow_ups" ON public.follow_ups;
CREATE POLICY "Employee select own follow_ups" ON public.follow_ups FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR created_by = auth.uid());

-- PROJECTS
DROP POLICY IF EXISTS "Employee select projects" ON public.projects;
CREATE POLICY "Employee select own projects" ON public.projects FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR created_by = auth.uid());

-- SCHEDULE_EVENTS
DROP POLICY IF EXISTS "Employee select schedule_events" ON public.schedule_events;
CREATE POLICY "Employee select own schedule_events" ON public.schedule_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR created_by = auth.uid());

-- TIME_ENTRIES
DROP POLICY IF EXISTS "Employee select time_entries" ON public.time_entries;
CREATE POLICY "Employee select own time_entries" ON public.time_entries FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR created_by = auth.uid());

-- INVENTORY_ITEMS
DROP POLICY IF EXISTS "Employee select inventory_items" ON public.inventory_items;
CREATE POLICY "Employee select own inventory_items" ON public.inventory_items FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR created_by = auth.uid());
