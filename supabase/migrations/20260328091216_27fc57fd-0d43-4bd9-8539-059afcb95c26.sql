
-- 1. Add employee UPDATE policy for documents
CREATE POLICY "Employee update own documents"
  ON public.documents FOR UPDATE TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());
