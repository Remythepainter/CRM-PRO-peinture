
-- Allow admins to read all documents (not just their own folder)
CREATE POLICY "Admin read all documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'documents' AND
  (SELECT public.has_role(auth.uid(), 'admin'::public.app_role))
);

-- Allow admins to read all voice recordings
CREATE POLICY "Admin read all voice-recordings"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'voice-recordings' AND
  (SELECT public.has_role(auth.uid(), 'admin'::public.app_role))
);
