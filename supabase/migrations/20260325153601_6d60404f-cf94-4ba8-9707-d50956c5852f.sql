
CREATE TABLE public.schedule_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES public.pipeline_deals(id) ON DELETE SET NULL,
  event_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  event_type TEXT NOT NULL DEFAULT 'job',
  status TEXT NOT NULL DEFAULT 'scheduled',
  address TEXT,
  crew_members TEXT[] DEFAULT '{}',
  color TEXT DEFAULT '#d4a853',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.schedule_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to schedule_events"
  ON public.schedule_events
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
