-- Table for daily work order reports
CREATE TABLE public.work_order_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_event_id uuid REFERENCES public.schedule_events(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  team_member_id uuid REFERENCES public.team_members(id) ON DELETE CASCADE NOT NULL,
  report_date date NOT NULL DEFAULT CURRENT_DATE,
  description text,
  break_minutes integer DEFAULT 0,
  break_notes text,
  disposable_materials_used jsonb DEFAULT '[]'::jsonb,
  paint_usage jsonb DEFAULT '[]'::jsonb,
  job_completed boolean DEFAULT false,
  submitted_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(team_member_id, report_date, project_id)
);

-- Table for work order photos
CREATE TABLE public.work_order_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid REFERENCES public.work_order_reports(id) ON DELETE CASCADE NOT NULL,
  image_url text NOT NULL,
  caption text,
  photo_type text NOT NULL DEFAULT 'progress',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.work_order_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_order_photos ENABLE ROW LEVEL SECURITY;

-- RLS: Admin full access
CREATE POLICY "Admin full access work_order_reports" ON public.work_order_reports
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin full access work_order_photos" ON public.work_order_photos
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- RLS: All authenticated can insert/select/update (employees fill these via link)
CREATE POLICY "All can insert work_order_reports" ON public.work_order_reports
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "All can select work_order_reports" ON public.work_order_reports
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "All can update work_order_reports" ON public.work_order_reports
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "All can insert work_order_photos" ON public.work_order_photos
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "All can select work_order_photos" ON public.work_order_photos
  FOR SELECT TO authenticated USING (true);

-- Create storage bucket for work order photos
INSERT INTO storage.buckets (id, name, public) VALUES ('work-order-photos', 'work-order-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS
CREATE POLICY "Anyone can upload work order photos" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'work-order-photos');

CREATE POLICY "Anyone can view work order photos" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'work-order-photos');

-- Trigger updated_at
CREATE TRIGGER update_work_order_reports_updated_at
  BEFORE UPDATE ON public.work_order_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();