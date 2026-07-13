
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  theme_mode text NOT NULL DEFAULT 'dark',
  primary_color text,
  density text NOT NULL DEFAULT 'comfortable',
  animations text NOT NULL DEFAULT 'on',
  dashboard_layout jsonb NOT NULL DEFAULT '{"order":["balance","weeklySummary","quickDeposit","upcomingBills","missions","chart","transactions"],"hidden":[],"preset":"custom","sizes":{}}'::jsonb,
  menu_layout jsonb NOT NULL DEFAULT '{"bottomHidden":[],"sidebarHidden":[],"order":[]}'::jsonb,
  notifications jsonb NOT NULL DEFAULT '{"incomes":true,"expenses":true,"goals":true,"planning":true,"investments":true,"cards":true,"subscriptions":true,"upcomingBills":true,"weeklyDigest":true,"monthlyDigest":true,"news":true,"updates":true}'::jsonb,
  regional jsonb NOT NULL DEFAULT '{"language":"pt-BR","currency":"BRL","dateFormat":"dd/MM/yyyy","weekStart":"sunday","timezone":"America/Sao_Paulo","numberFormat":"pt-BR"}'::jsonb,
  labs jsonb NOT NULL DEFAULT '{"newDashboard":false,"newPlanning":false,"financialRadar":false,"financialHealth":false,"foxAssistant":false}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_preferences TO authenticated;
GRANT ALL ON public.user_preferences TO service_role;

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own preferences" ON public.user_preferences;
CREATE POLICY "Users can view own preferences" ON public.user_preferences
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own preferences" ON public.user_preferences;
CREATE POLICY "Users can insert own preferences" ON public.user_preferences
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own preferences" ON public.user_preferences;
CREATE POLICY "Users can update own preferences" ON public.user_preferences
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own preferences" ON public.user_preferences;
CREATE POLICY "Users can delete own preferences" ON public.user_preferences
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON public.user_preferences;
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Extend handle_new_user to seed defaults
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  BEGIN
    INSERT INTO public.profiles (user_id, name, email)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)), NEW.email);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
  END;

  BEGIN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to create role for user %: %', NEW.id, SQLERRM;
  END;

  BEGIN
    INSERT INTO public.user_analytics (user_id) VALUES (NEW.id);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to create analytics for user %: %', NEW.id, SQLERRM;
  END;

  BEGIN
    INSERT INTO public.user_preferences (user_id) VALUES (NEW.id);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to create preferences for user %: %', NEW.id, SQLERRM;
  END;

  BEGIN
    INSERT INTO public.categories (user_id, name, icon, color, type, is_default) VALUES
    (NEW.id, 'Salário', 'Briefcase', '#10B981', 'income', true),
    (NEW.id, 'Freelance', 'Laptop', '#34D399', 'income', true),
    (NEW.id, 'Investimentos', 'TrendingUp', '#6EE7B7', 'income', true),
    (NEW.id, 'Presentes', 'Gift', '#A7F3D0', 'income', true),
    (NEW.id, 'Outros', 'Plus', '#059669', 'income', true);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to create income categories for user %: %', NEW.id, SQLERRM;
  END;

  BEGIN
    INSERT INTO public.categories (user_id, name, icon, color, type, is_default) VALUES
    (NEW.id, 'Alimentação', 'UtensilsCrossed', '#F43F5E', 'expense', true),
    (NEW.id, 'Transporte', 'Car', '#FB7185', 'expense', true),
    (NEW.id, 'Moradia', 'Home', '#FDA4AF', 'expense', true),
    (NEW.id, 'Lazer', 'Gamepad2', '#E11D48', 'expense', true),
    (NEW.id, 'Saúde', 'Heart', '#BE123C', 'expense', true),
    (NEW.id, 'Educação', 'GraduationCap', '#9F1239', 'expense', true),
    (NEW.id, 'Compras', 'ShoppingBag', '#881337', 'expense', true),
    (NEW.id, 'Contas', 'Receipt', '#F472B6', 'expense', true),
    (NEW.id, 'Outros', 'MoreHorizontal', '#DB2777', 'expense', true);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to create expense categories for user %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$function$;

-- Enable Realtime
ALTER TABLE public.user_preferences REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'user_preferences'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_preferences;
  END IF;
END $$;
