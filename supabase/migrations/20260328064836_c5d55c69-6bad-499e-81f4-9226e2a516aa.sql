-- Clients table (distinct from leads)
CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  address text,
  notes text,
  satisfaction_rating integer DEFAULT 0,
  total_revenue numeric NOT NULL DEFAULT 0,
  project_count integer NOT NULL DEFAULT 0,
  source text DEFAULT 'direct',
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access to clients" ON public.clients FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Employee select own clients" ON public.clients FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR created_by = auth.uid());
CREATE POLICY "Employee insert clients" ON public.clients FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "Employee update own clients" ON public.clients FOR UPDATE TO authenticated
  USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY "Employee delete own clients" ON public.clients FOR DELETE TO authenticated
  USING (created_by = auth.uid());

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Tasks table
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'todo',
  priority text NOT NULL DEFAULT 'medium',
  due_date date,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  assigned_to uuid REFERENCES public.team_members(id) ON DELETE SET NULL,
  created_by uuid,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access to tasks" ON public.tasks FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Employee select own tasks" ON public.tasks FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR created_by = auth.uid());
CREATE POLICY "Employee insert tasks" ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "Employee update own tasks" ON public.tasks FOR UPDATE TO authenticated
  USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY "Employee delete own tasks" ON public.tasks FOR DELETE TO authenticated
  USING (created_by = auth.uid());

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Activity log table
CREATE TABLE public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  entity_name text,
  details text,
  user_id uuid,
  user_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read activity_log" ON public.activity_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert activity_log" ON public.activity_log FOR INSERT TO authenticated WITH CHECK (true);

-- Documents table
CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  file_url text NOT NULL,
  file_type text NOT NULL DEFAULT 'other',
  file_size integer DEFAULT 0,
  category text NOT NULL DEFAULT 'general',
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access to documents" ON public.documents FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Employee select own documents" ON public.documents FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR created_by = auth.uid());
CREATE POLICY "Employee insert documents" ON public.documents FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "Employee delete own documents" ON public.documents FOR DELETE TO authenticated
  USING (created_by = auth.uid());

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Tags table
CREATE TABLE public.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text NOT NULL DEFAULT '#c49a2a',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read tags" ON public.tags FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage tags" ON public.tags FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Employee insert tags" ON public.tags FOR INSERT TO authenticated WITH CHECK (true);

-- Tag assignments (polymorphic)
CREATE TABLE public.tag_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_id uuid REFERENCES public.tags(id) ON DELETE CASCADE NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tag_id, entity_type, entity_id)
);

ALTER TABLE public.tag_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read tag_assignments" ON public.tag_assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated manage tag_assignments" ON public.tag_assignments FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text,
  type text NOT NULL DEFAULT 'info',
  is_read boolean NOT NULL DEFAULT false,
  link text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own notifications" ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "System insert notifications" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (true);

-- Auto-deduct inventory trigger
CREATE OR REPLACE FUNCTION public.auto_deduct_inventory()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  qty_diff numeric;
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.inventory_items
    SET quantity = GREATEST(0, quantity - NEW.quantity_used)
    WHERE id = NEW.inventory_item_id;
  ELSIF TG_OP = 'UPDATE' THEN
    qty_diff := NEW.quantity_used - OLD.quantity_used;
    IF qty_diff != 0 THEN
      UPDATE public.inventory_items
      SET quantity = GREATEST(0, quantity - qty_diff)
      WHERE id = NEW.inventory_item_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER auto_deduct_inventory_on_material
AFTER INSERT OR UPDATE OF quantity_used ON public.project_materials
FOR EACH ROW EXECUTE FUNCTION public.auto_deduct_inventory();

-- Storage bucket for documents
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', true);

CREATE POLICY "Authenticated upload documents" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents');
CREATE POLICY "Public read documents" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documents');
CREATE POLICY "Owner delete documents" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'documents');