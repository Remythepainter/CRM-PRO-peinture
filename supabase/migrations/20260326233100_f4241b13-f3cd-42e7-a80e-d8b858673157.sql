
-- Fix: Replace all overly permissive PUBLIC policies with AUTHENTICATED-only policies

-- 1. follow_up_step_statuses (currently public)
DROP POLICY IF EXISTS "Allow all access to follow_up_step_statuses" ON public.follow_up_step_statuses;
CREATE POLICY "Authenticated access to follow_up_step_statuses"
  ON public.follow_up_step_statuses FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 2. quotes (currently public)
DROP POLICY IF EXISTS "Allow all access to quotes" ON public.quotes;
CREATE POLICY "Authenticated access to quotes"
  ON public.quotes FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 3. follow_up_sequence_steps (currently public)
DROP POLICY IF EXISTS "Allow all access to follow_up_sequence_steps" ON public.follow_up_sequence_steps;
CREATE POLICY "Authenticated access to follow_up_sequence_steps"
  ON public.follow_up_sequence_steps FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 4. leads (currently public)
DROP POLICY IF EXISTS "Allow all access to leads" ON public.leads;
CREATE POLICY "Authenticated access to leads"
  ON public.leads FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 5. follow_up_sequences (currently public)
DROP POLICY IF EXISTS "Allow all access to follow_up_sequences" ON public.follow_up_sequences;
CREATE POLICY "Authenticated access to follow_up_sequences"
  ON public.follow_up_sequences FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 6. pipeline_deals (currently public)
DROP POLICY IF EXISTS "Allow all access to pipeline_deals" ON public.pipeline_deals;
CREATE POLICY "Authenticated access to pipeline_deals"
  ON public.pipeline_deals FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 7. follow_ups (currently public)
DROP POLICY IF EXISTS "Allow all access to follow_ups" ON public.follow_ups;
CREATE POLICY "Authenticated access to follow_ups"
  ON public.follow_ups FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
