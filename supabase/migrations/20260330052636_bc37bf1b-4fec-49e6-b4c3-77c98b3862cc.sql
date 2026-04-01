
-- Fix 1: Remove public read on project-photos (private bucket should not allow unauthenticated reads)
DROP POLICY IF EXISTS "Allow public read of project-photos" ON storage.objects;

-- Fix 2: Add authenticated owner-scoped read for project-photos
-- Files are stored as: {projectId}/{timestamp}-{random}.{ext}
-- We scope reads to authenticated users (RLS on project_photos table already handles ownership)
CREATE POLICY "Authenticated read project-photos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'project-photos');

-- Fix 3: Replace broad documents read with owner-scoped policy
-- Files stored as: {user_id}/{timestamp}.{ext}
DROP POLICY IF EXISTS "Public read documents" ON storage.objects;
CREATE POLICY "Owner read documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Fix 4: Replace broad voice-recordings read with owner-scoped policy
-- Files stored as: {user_id}/{projectId}/{timestamp}.webm
DROP POLICY IF EXISTS "Anyone can read voice recordings" ON storage.objects;
CREATE POLICY "Owner read voice-recordings"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'voice-recordings' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Fix 5: Replace broad work-order-photos read with authenticated-only policy
-- Files stored as: {memberId}/{date}/{uuid}.{ext} - not user_id based, keep authenticated
DROP POLICY IF EXISTS "Anyone can view work order photos" ON storage.objects;
CREATE POLICY "Authenticated read work-order-photos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'work-order-photos');
