
-- Table for project notes (text, photo, voice)
CREATE TABLE public.project_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'photo', 'voice')),
  content text,
  image_url text,
  audio_url text,
  transcription text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.project_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access to project_notes"
  ON public.project_notes FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Employee select project_notes for own projects"
  ON public.project_notes FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM projects WHERE projects.id = project_notes.project_id AND projects.created_by = auth.uid())
    OR created_by = auth.uid()
  );

CREATE POLICY "Employee insert project_notes"
  ON public.project_notes FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Employee delete own project_notes"
  ON public.project_notes FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- Storage bucket for voice recordings
INSERT INTO storage.buckets (id, name, public) VALUES ('voice-recordings', 'voice-recordings', true);

-- Storage policies for voice-recordings
CREATE POLICY "Authenticated users can upload voice recordings"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'voice-recordings');

CREATE POLICY "Anyone can read voice recordings"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'voice-recordings');

CREATE POLICY "Users can delete own voice recordings"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'voice-recordings' AND (auth.uid())::text = (storage.foldername(name))[1]);
