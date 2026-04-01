
-- Team members
CREATE TABLE public.team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'painter',
  phone TEXT,
  email TEXT,
  hourly_rate NUMERIC NOT NULL DEFAULT 0,
  avatar_url TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to team_members" ON public.team_members FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Inventory items
CREATE TABLE public.inventory_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'peinture',
  brand TEXT,
  sku TEXT,
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'unité',
  unit_cost NUMERIC NOT NULL DEFAULT 0,
  min_stock NUMERIC NOT NULL DEFAULT 0,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to inventory_items" ON public.inventory_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Project materials (links inventory to projects)
CREATE TABLE public.project_materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  inventory_item_id UUID REFERENCES public.inventory_items(id) ON DELETE CASCADE NOT NULL,
  quantity_needed NUMERIC NOT NULL DEFAULT 0,
  quantity_used NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.project_materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to project_materials" ON public.project_materials FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Storage bucket for inventory images
INSERT INTO storage.buckets (id, name, public) VALUES ('inventory-images', 'inventory-images', true);

CREATE POLICY "Allow authenticated uploads to inventory-images"
ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'inventory-images');

CREATE POLICY "Allow authenticated updates to inventory-images"
ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'inventory-images');

CREATE POLICY "Allow public read of inventory-images"
ON storage.objects FOR SELECT TO public USING (bucket_id = 'inventory-images');

CREATE POLICY "Allow authenticated delete of inventory-images"
ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'inventory-images');
