
-- Add new fields to inventory_items for TDS/SDS and supplier pricing
ALTER TABLE public.inventory_items 
  ADD COLUMN IF NOT EXISTS tds_url text,
  ADD COLUMN IF NOT EXISTS sds_url text,
  ADD COLUMN IF NOT EXISTS supplier_price numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS supplier text,
  ADD COLUMN IF NOT EXISTS color text,
  ADD COLUMN IF NOT EXISTS finish text;

-- Update categories to include new ones
-- (categories are just strings, no migration needed)

-- Tool assignments to employees
CREATE TABLE public.tool_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id uuid REFERENCES public.inventory_items(id) ON DELETE CASCADE NOT NULL,
  team_member_id uuid REFERENCES public.team_members(id) ON DELETE CASCADE NOT NULL,
  assigned_date date NOT NULL DEFAULT CURRENT_DATE,
  returned_date date,
  notes text,
  status text NOT NULL DEFAULT 'assigned',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tool_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage tool assignments" ON public.tool_assignments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Employee material/supply requests
CREATE TABLE public.inventory_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by uuid,
  team_member_id uuid REFERENCES public.team_members(id) ON DELETE SET NULL,
  item_name text NOT NULL,
  description text,
  quantity numeric DEFAULT 1,
  url text,
  image_url text,
  status text NOT NULL DEFAULT 'pending',
  priority text NOT NULL DEFAULT 'normal',
  notes text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.inventory_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage inventory requests" ON public.inventory_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);
