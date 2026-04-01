
DROP POLICY IF EXISTS "Employee insert tags" ON public.tags;
CREATE POLICY "Employee insert tags"
  ON public.tags FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
