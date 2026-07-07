
CREATE TABLE public.theme_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  mode text NOT NULL DEFAULT 'both' CHECK (mode IN ('light', 'dark', 'both')),
  is_active boolean NOT NULL DEFAULT false,
  is_default boolean NOT NULL DEFAULT false,
  is_preset boolean NOT NULL DEFAULT false,
  tokens_light jsonb NOT NULL DEFAULT '{}'::jsonb,
  tokens_dark jsonb NOT NULL DEFAULT '{}'::jsonb,
  typography jsonb NOT NULL DEFAULT '{}'::jsonb,
  layout jsonb NOT NULL DEFAULT '{}'::jsonb,
  identity jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.theme_settings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.theme_settings TO authenticated;
GRANT ALL ON public.theme_settings TO service_role;

ALTER TABLE public.theme_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "theme_settings_read_all"
  ON public.theme_settings FOR SELECT USING (true);

CREATE POLICY "theme_settings_admin_insert"
  ON public.theme_settings FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "theme_settings_admin_update"
  ON public.theme_settings FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "theme_settings_admin_delete"
  ON public.theme_settings FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role) AND is_preset = false);

CREATE TRIGGER theme_settings_updated_at
  BEFORE UPDATE ON public.theme_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.enforce_single_active_theme()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.is_active THEN
    UPDATE public.theme_settings
       SET is_active = false
     WHERE id <> NEW.id AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER theme_settings_single_active
  AFTER INSERT OR UPDATE OF is_active ON public.theme_settings
  FOR EACH ROW WHEN (NEW.is_active = true)
  EXECUTE FUNCTION public.enforce_single_active_theme();

CREATE TABLE public.theme_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_id uuid REFERENCES public.theme_settings(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  changes jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.theme_audit_log TO authenticated;
GRANT ALL ON public.theme_audit_log TO service_role;

ALTER TABLE public.theme_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "theme_audit_admin_read"
  ON public.theme_audit_log FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.log_theme_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.theme_audit_log (theme_id, user_id, action, changes)
    VALUES (NEW.id, auth.uid(), 'create', to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.theme_audit_log (theme_id, user_id, action, changes)
    VALUES (NEW.id, auth.uid(), 'update',
      jsonb_build_object('before', to_jsonb(OLD), 'after', to_jsonb(NEW)));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.theme_audit_log (theme_id, user_id, action, changes)
    VALUES (OLD.id, auth.uid(), 'delete', to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER theme_settings_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.theme_settings
  FOR EACH ROW EXECUTE FUNCTION public.log_theme_change();

INSERT INTO public.theme_settings
  (name, description, mode, is_active, is_default, is_preset,
   tokens_light, tokens_dark, typography, layout, identity)
VALUES (
  'Finango Orange',
  'Tema padrão do Finango — laranja sobre preto',
  'both', true, true, true,
  jsonb_build_object(
    'background', '0 0% 98%',
    'foreground', '0 0% 7%',
    'card', '0 0% 100%',
    'card-foreground', '0 0% 7%',
    'primary', '25 100% 50%',
    'primary-foreground', '0 0% 100%',
    'secondary', '220 14% 94%',
    'muted', '220 14% 96%',
    'muted-foreground', '220 9% 45%',
    'accent', '25 100% 50%',
    'destructive', '0 84% 55%',
    'border', '220 13% 88%',
    'input', '220 14% 94%',
    'ring', '25 100% 50%'
  ),
  jsonb_build_object(
    'background', '0 0% 4%',
    'foreground', '0 0% 100%',
    'card', '0 0% 7%',
    'card-foreground', '0 0% 100%',
    'primary', '25 100% 50%',
    'primary-foreground', '0 0% 100%',
    'secondary', '0 0% 12%',
    'muted', '0 0% 10%',
    'muted-foreground', '220 9% 65%',
    'accent', '25 100% 50%',
    'destructive', '0 84% 60%',
    'border', '0 0% 15%',
    'input', '0 0% 12%',
    'ring', '25 100% 50%'
  ),
  jsonb_build_object(
    'font-sans', 'DM Sans, system-ui, -apple-system, sans-serif',
    'font-mono', 'JetBrains Mono, monospace'
  ),
  jsonb_build_object('radius', '1rem'),
  jsonb_build_object(
    'system_name', 'FINANGO',
    'browser_title', 'FINANGO - Gestão Financeira',
    'logo_url', null,
    'logo_reduced_url', null,
    'favicon_url', null
  )
);
