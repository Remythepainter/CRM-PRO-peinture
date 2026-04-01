CREATE TABLE public.app_theme_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  is_global boolean NOT NULL DEFAULT false,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.app_theme_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read global theme
CREATE POLICY "Anyone can read global theme"
ON public.app_theme_settings
FOR SELECT TO authenticated
USING (is_global = true);

-- Users can read own theme
CREATE POLICY "Users can read own theme"
ON public.app_theme_settings
FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Users can insert own theme
CREATE POLICY "Users can insert own theme"
ON public.app_theme_settings
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND is_global = false);

-- Users can update own theme
CREATE POLICY "Users can update own theme"
ON public.app_theme_settings
FOR UPDATE TO authenticated
USING (user_id = auth.uid());

-- Admin can manage global theme
CREATE POLICY "Admin manage global theme"
ON public.app_theme_settings
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) AND is_global = true)
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND is_global = true);

CREATE TRIGGER update_app_theme_settings_updated_at
BEFORE UPDATE ON public.app_theme_settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();