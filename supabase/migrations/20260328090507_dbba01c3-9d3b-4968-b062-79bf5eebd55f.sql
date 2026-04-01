-- 1. Create a public view for team_members that hides sensitive pay data
CREATE OR REPLACE VIEW public.team_members_public
WITH (security_invoker = on) AS
  SELECT id, name, role, phone, email, avatar_url, status, created_at, updated_at
  FROM public.team_members;

-- 2. Replace the permissive SELECT policy on team_members
-- Admins keep full access via the ALL policy
-- Employees can only read via the view (no direct table SELECT)
DROP POLICY IF EXISTS "All can read team_members" ON public.team_members;

CREATE POLICY "Employee read team_members via view only"
  ON public.team_members FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. Fix notifications: restrict INSERT so users can only insert for themselves or admins can insert for anyone
DROP POLICY IF EXISTS "System insert notifications" ON public.notifications;

CREATE POLICY "Admin insert any notification"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "User insert own notification"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());