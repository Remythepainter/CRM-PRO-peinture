
CREATE TABLE public.company_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL DEFAULT 'Peinture Rémy Ouellette',
  company_address TEXT DEFAULT '',
  company_phone TEXT DEFAULT '',
  company_email TEXT DEFAULT '',
  company_website TEXT DEFAULT '',
  license_rbq TEXT DEFAULT '',
  tax_tps TEXT DEFAULT '',
  tax_tvq TEXT DEFAULT '',
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to company_settings" ON public.company_settings
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert default row
INSERT INTO public.company_settings (company_name) VALUES ('Peinture Rémy Ouellette');

-- Storage bucket for logos
INSERT INTO storage.buckets (id, name, public) VALUES ('company-assets', 'company-assets', true);

CREATE POLICY "Allow authenticated uploads to company-assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'company-assets');

CREATE POLICY "Allow authenticated updates to company-assets"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'company-assets');

CREATE POLICY "Allow public read of company-assets"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'company-assets');

CREATE POLICY "Allow authenticated delete of company-assets"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'company-assets');
