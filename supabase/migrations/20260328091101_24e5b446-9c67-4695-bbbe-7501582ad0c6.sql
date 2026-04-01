
-- Drop and recreate view without phone/email
DROP VIEW IF EXISTS public.team_members_public;

CREATE VIEW public.team_members_public
WITH (security_invoker = on) AS
  SELECT id, name, role, avatar_url, status, created_at, updated_at
  FROM public.team_members;
