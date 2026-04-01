ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS latitude double precision;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS longitude double precision;

ALTER TABLE public.punch_records ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id);
ALTER TABLE public.punch_records ADD COLUMN IF NOT EXISTS out_of_zone boolean DEFAULT false;