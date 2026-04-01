
-- Timestamp trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- LEADS table
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  source TEXT NOT NULL CHECK (source IN ('website','referral','google','facebook','door-to-door')),
  project_type TEXT NOT NULL CHECK (project_type IN ('interior','exterior','commercial')),
  budget NUMERIC NOT NULL DEFAULT 0,
  urgency TEXT NOT NULL CHECK (urgency IN ('low','medium','high','urgent')),
  score INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('new','contacted','qualified','proposal','negotiation','won','lost')) DEFAULT 'new',
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_contact TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to leads" ON public.leads FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- PIPELINE DEALS table
CREATE TABLE public.pipeline_deals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  value NUMERIC NOT NULL DEFAULT 0,
  probability INTEGER NOT NULL DEFAULT 0,
  stage TEXT NOT NULL CHECK (stage IN ('new','contacted','qualified','proposal','negotiation','won','lost')) DEFAULT 'new',
  project_type TEXT NOT NULL CHECK (project_type IN ('interior','exterior','commercial')),
  expected_close DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pipeline_deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to pipeline_deals" ON public.pipeline_deals FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_pipeline_deals_updated_at BEFORE UPDATE ON public.pipeline_deals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- FOLLOW-UP SEQUENCES template table
CREATE TABLE public.follow_up_sequences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.follow_up_sequences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to follow_up_sequences" ON public.follow_up_sequences FOR ALL USING (true) WITH CHECK (true);

-- FOLLOW-UP SEQUENCE STEPS template
CREATE TABLE public.follow_up_sequence_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sequence_id UUID REFERENCES public.follow_up_sequences(id) ON DELETE CASCADE NOT NULL,
  step_order INTEGER NOT NULL,
  label TEXT NOT NULL,
  delay_hours INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('email','sms','call')),
  template_name TEXT NOT NULL,
  template_body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.follow_up_sequence_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to follow_up_sequence_steps" ON public.follow_up_sequence_steps FOR ALL USING (true) WITH CHECK (true);

-- ACTIVE FOLLOW-UPS (instances for a lead)
CREATE TABLE public.follow_ups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
  sequence_id UUID REFERENCES public.follow_up_sequences(id) ON DELETE SET NULL,
  quote_value NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('active','completed','paused','converted')) DEFAULT 'active',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to follow_ups" ON public.follow_ups FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_follow_ups_updated_at BEFORE UPDATE ON public.follow_ups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- FOLLOW-UP STEP STATUSES (per-step execution tracking)
CREATE TABLE public.follow_up_step_statuses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  follow_up_id UUID REFERENCES public.follow_ups(id) ON DELETE CASCADE NOT NULL,
  step_id UUID REFERENCES public.follow_up_sequence_steps(id) ON DELETE CASCADE NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  executed_at TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('pending','sent','overdue','skipped','replied')) DEFAULT 'pending',
  client_reply_message TEXT,
  client_reply_received_at TIMESTAMPTZ,
  client_reply_channel TEXT CHECK (client_reply_channel IN ('email','sms','call')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.follow_up_step_statuses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to follow_up_step_statuses" ON public.follow_up_step_statuses FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_follow_up_step_statuses_updated_at BEFORE UPDATE ON public.follow_up_step_statuses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
