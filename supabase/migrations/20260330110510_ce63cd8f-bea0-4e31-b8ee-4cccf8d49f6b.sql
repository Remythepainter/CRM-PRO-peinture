
CREATE TABLE public.client_interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'note',
  summary TEXT NOT NULL,
  details TEXT,
  interaction_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.client_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access client_interactions"
  ON public.client_interactions FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Employee insert own client_interactions"
  ON public.client_interactions FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Employee select own client_interactions"
  ON public.client_interactions FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR created_by = auth.uid());

CREATE POLICY "Employee delete own client_interactions"
  ON public.client_interactions FOR DELETE TO authenticated
  USING (created_by = auth.uid());
