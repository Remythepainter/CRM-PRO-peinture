
-- 1. TRIGGER: Enforce hourly_rate from team_members on time_entries
CREATE OR REPLACE FUNCTION public.enforce_team_member_rate()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.team_member_id IS NOT NULL THEN
    SELECT hourly_rate INTO NEW.hourly_rate
    FROM public.team_members
    WHERE id = NEW.team_member_id;
  END IF;
  NEW.total_cost := NEW.hours * NEW.hourly_rate;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_time_entry_rate
BEFORE INSERT OR UPDATE ON public.time_entries
FOR EACH ROW EXECUTE FUNCTION public.enforce_team_member_rate();

-- 2. TRIGGER: Set activity_log user_name server-side
CREATE OR REPLACE FUNCTION public.set_activity_log_user_name()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  NEW.user_name := (SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = auth.uid());
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_activity_log_user_name
BEFORE INSERT ON public.activity_log
FOR EACH ROW EXECUTE FUNCTION public.set_activity_log_user_name();

-- 3. Fix tag_assignments INSERT policy: restrict to entity owners or admins
DROP POLICY IF EXISTS "Authenticated insert tag_assignments" ON public.tag_assignments;

CREATE POLICY "Owner or admin insert tag_assignments"
ON public.tag_assignments FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR (entity_type = 'lead' AND EXISTS (SELECT 1 FROM public.leads WHERE id = tag_assignments.entity_id AND created_by = auth.uid()))
  OR (entity_type = 'project' AND EXISTS (SELECT 1 FROM public.projects WHERE id = tag_assignments.entity_id AND created_by = auth.uid()))
  OR (entity_type = 'client' AND EXISTS (SELECT 1 FROM public.clients WHERE id = tag_assignments.entity_id AND created_by = auth.uid()))
);

-- 4. Make sensitive buckets private
UPDATE storage.buckets SET public = false WHERE id IN ('documents', 'voice-recordings', 'project-photos', 'work-order-photos');
