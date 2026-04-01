
-- Table for punch in/out records with GPS
CREATE TABLE public.punch_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_member_id uuid REFERENCES public.team_members(id) ON DELETE SET NULL,
  punch_type text NOT NULL CHECK (punch_type IN ('in', 'out')),
  punched_at timestamptz NOT NULL DEFAULT now(),
  latitude double precision,
  longitude double precision,
  address text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.punch_records ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admin full access punch_records"
  ON public.punch_records FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Employee insert own
CREATE POLICY "Employee insert own punch_records"
  ON public.punch_records FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Employee select own
CREATE POLICY "Employee select own punch_records"
  ON public.punch_records FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));

-- Index for performance
CREATE INDEX idx_punch_records_user_date ON public.punch_records (user_id, punched_at DESC);
