ALTER TABLE public.team_members
  ADD COLUMN rate_ccq_commercial numeric NOT NULL DEFAULT 0,
  ADD COLUMN rate_ccq_residential_light numeric NOT NULL DEFAULT 0,
  ADD COLUMN rate_ccq_residential_heavy numeric NOT NULL DEFAULT 0,
  ADD COLUMN das_percent numeric NOT NULL DEFAULT 14.5;