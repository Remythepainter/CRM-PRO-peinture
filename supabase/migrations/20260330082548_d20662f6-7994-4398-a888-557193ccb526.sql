-- Fix 1: Scope the documents bucket DELETE policy to owner's path
DROP POLICY IF EXISTS "Owner delete documents" ON storage.objects;

CREATE POLICY "Owner delete documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Admin delete any documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents'
  AND public.has_role(auth.uid(), 'admin')
);

-- Fix 2: Restrict inventory-images UPDATE/DELETE to admin only
DROP POLICY IF EXISTS "Allow authenticated uploads inventory-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates inventory-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes inventory-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read inventory-images" ON storage.objects;

-- Re-create INSERT: any authenticated user can upload
CREATE POLICY "Allow authenticated uploads inventory-images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'inventory-images');

-- Re-create SELECT: public read
CREATE POLICY "Allow public read inventory-images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'inventory-images');

-- UPDATE restricted to admin
CREATE POLICY "Admin update inventory-images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'inventory-images'
  AND public.has_role(auth.uid(), 'admin')
);

-- DELETE restricted to admin
CREATE POLICY "Admin delete inventory-images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'inventory-images'
  AND public.has_role(auth.uid(), 'admin')
);