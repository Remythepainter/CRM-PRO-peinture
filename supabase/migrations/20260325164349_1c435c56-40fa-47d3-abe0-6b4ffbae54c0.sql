
CREATE TABLE public.project_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  caption TEXT,
  category TEXT NOT NULL DEFAULT 'progress',
  taken_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.project_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to project_photos" ON public.project_photos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO storage.buckets (id, name, public) VALUES ('project-photos', 'project-photos', true);

CREATE POLICY "Allow authenticated uploads to project-photos"
ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'project-photos');

CREATE POLICY "Allow authenticated updates to project-photos"
ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'project-photos');

CREATE POLICY "Allow public read of project-photos"
ON storage.objects FOR SELECT TO public USING (bucket_id = 'project-photos');

CREATE POLICY "Allow authenticated delete of project-photos"
ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'project-photos');
