-- Fix project-photos DELETE policy: scope to owner path + admin override
DROP POLICY IF EXISTS "Allow authenticated delete of project-photos" ON storage.objects;

CREATE POLICY "Owner delete project-photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'project-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Admin delete project-photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'project-photos'
  AND public.has_role(auth.uid(), 'admin')
);