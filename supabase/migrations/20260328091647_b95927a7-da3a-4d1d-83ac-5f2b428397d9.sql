
-- Revoke access from anon role so only authenticated users can read the view
REVOKE ALL ON public.team_members_public FROM anon;
GRANT SELECT ON public.team_members_public TO authenticated;
