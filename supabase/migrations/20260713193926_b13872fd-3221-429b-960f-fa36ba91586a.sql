
CREATE TABLE public.feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'Geral',
  icon text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.feature_flags TO authenticated;
GRANT ALL ON public.feature_flags TO service_role;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "feature_flags read all authenticated" ON public.feature_flags
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "feature_flags admin manage" ON public.feature_flags
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER feature_flags_set_updated
  BEFORE UPDATE ON public.feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.plan_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.subscription_plans(id) ON DELETE CASCADE,
  feature_id uuid NOT NULL REFERENCES public.feature_flags(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_id, feature_id)
);
GRANT SELECT ON public.plan_features TO authenticated;
GRANT ALL ON public.plan_features TO service_role;
ALTER TABLE public.plan_features ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plan_features read all authenticated" ON public.plan_features
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "plan_features admin manage" ON public.plan_features
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER plan_features_set_updated
  BEFORE UPDATE ON public.plan_features
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.plan_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.subscription_plans(id) ON DELETE CASCADE,
  key text NOT NULL,
  value integer NOT NULL DEFAULT 0,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_id, key)
);
GRANT SELECT ON public.plan_limits TO authenticated;
GRANT ALL ON public.plan_limits TO service_role;
ALTER TABLE public.plan_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plan_limits read all authenticated" ON public.plan_limits
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "plan_limits admin manage" ON public.plan_limits
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER plan_limits_set_updated
  BEFORE UPDATE ON public.plan_limits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.feature_flags (slug, name, description, category, icon) VALUES
  ('dashboard_premium','Dashboard Premium','Visual premium do dashboard','Dashboard','LayoutDashboard'),
  ('dashboard_customization','Personalização do Dashboard','Reorganizar e ocultar cards','Dashboard','Settings2'),
  ('custom_dashboard','Dashboard Personalizado','Cards customizados','Dashboard','LayoutGrid'),
  ('widgets','Widgets','Widgets adicionais no dashboard','Dashboard','Grid3x3'),
  ('calendar','Calendário Financeiro','Visão em calendário','Dashboard','Calendar'),
  ('financial_planning','Planejamento Financeiro','Metas e projeções inteligentes','Planejamento','Target'),
  ('goals','Metas','Criar metas financeiras','Planejamento','Flag'),
  ('shared_goals','Metas Compartilhadas','Metas em família','Planejamento','Users'),
  ('investments','Central de Investimentos','Carteira de investimentos','Investimentos','TrendingUp'),
  ('advanced_investments','Investimentos Avançados','Simuladores e dividendos','Investimentos','LineChart'),
  ('ai_finance','IA Financeira','Análises com IA','IA','Sparkles'),
  ('unlimited_ai','IA Ilimitada','Sem limite de requisições','IA','Infinity'),
  ('advanced_reports','Relatórios Avançados','Relatórios detalhados','Relatórios','FileBarChart'),
  ('pdf_export','Exportar PDF','Exportação em PDF','Exportação','FileText'),
  ('excel_export','Exportar Excel','Exportação em Excel','Exportação','FileSpreadsheet'),
  ('csv_export','Exportar CSV','Exportação em CSV','Exportação','FileDown'),
  ('backup','Backup','Backup dos dados','Backup','Database'),
  ('restore_backup','Restaurar Backup','Restaurar backup','Backup','DatabaseBackup'),
  ('cloud_sync','Sincronização Nuvem','Sync entre dispositivos','Backup','Cloud'),
  ('ofx_import','Importar OFX','Importar arquivos OFX','Importação','FileInput'),
  ('csv_import','Importar CSV','Importar arquivos CSV','Importação','FileInput'),
  ('excel_import','Importar Excel','Importar planilhas','Importação','FileInput'),
  ('smart_import','Importação Inteligente','Categorização automática','Importação','Wand2'),
  ('unlimited_categories','Categorias Ilimitadas','Sem limite de categorias','Premium','Tags'),
  ('unlimited_accounts','Contas Ilimitadas','Sem limite de contas','Premium','Wallet'),
  ('premium_themes','Temas Premium','Temas exclusivos','Premium','Palette'),
  ('premium_badge','Selo Premium','Selo exclusivo no perfil','Premium','BadgeCheck'),
  ('finango_coins','Finango Coins','Sistema de moedas','Premium','Coins'),
  ('family_accounts','Modo Família','Compartilhar finanças em família','Família','Users'),
  ('notifications_advanced','Notificações Avançadas','Alertas personalizados','Premium','BellRing'),
  ('beta_features','Recursos Beta','Acesso ao laboratório','Laboratório','FlaskConical'),
  ('roadmap_vote','Votar em Roadmap','Votar em próximas features','Laboratório','Vote'),
  ('api_access','Acesso à API','Integrações via API','Integrações','Code'),
  ('priority_support','Suporte Prioritário','Atendimento prioritário','Premium','LifeBuoy')
ON CONFLICT (slug) DO NOTHING;

WITH plans AS (
  SELECT id, code FROM public.subscription_plans WHERE code IN ('free','pro','premium')
),
mapping(plan_code, slug, enabled) AS (VALUES
  ('free','goals',true),
  ('free','investments',true),
  ('free','csv_import',true),
  ('free','csv_export',true),
  ('pro','dashboard_customization',true),
  ('pro','financial_planning',true),
  ('pro','goals',true),
  ('pro','investments',true),
  ('pro','ai_finance',true),
  ('pro','advanced_reports',true),
  ('pro','pdf_export',true),
  ('pro','excel_export',true),
  ('pro','csv_export',true),
  ('pro','ofx_import',true),
  ('pro','csv_import',true),
  ('pro','excel_import',true),
  ('pro','smart_import',true),
  ('pro','unlimited_categories',true),
  ('pro','unlimited_accounts',true),
  ('pro','backup',true),
  ('premium','dashboard_premium',true),
  ('premium','dashboard_customization',true),
  ('premium','custom_dashboard',true),
  ('premium','widgets',true),
  ('premium','calendar',true),
  ('premium','financial_planning',true),
  ('premium','goals',true),
  ('premium','shared_goals',true),
  ('premium','investments',true),
  ('premium','advanced_investments',true),
  ('premium','ai_finance',true),
  ('premium','unlimited_ai',true),
  ('premium','advanced_reports',true),
  ('premium','pdf_export',true),
  ('premium','excel_export',true),
  ('premium','csv_export',true),
  ('premium','backup',true),
  ('premium','restore_backup',true),
  ('premium','cloud_sync',true),
  ('premium','ofx_import',true),
  ('premium','csv_import',true),
  ('premium','excel_import',true),
  ('premium','smart_import',true),
  ('premium','unlimited_categories',true),
  ('premium','unlimited_accounts',true),
  ('premium','premium_themes',true),
  ('premium','premium_badge',true),
  ('premium','finango_coins',true),
  ('premium','family_accounts',true),
  ('premium','notifications_advanced',true),
  ('premium','beta_features',true),
  ('premium','roadmap_vote',true),
  ('premium','api_access',true),
  ('premium','priority_support',true)
)
INSERT INTO public.plan_features (plan_id, feature_id, enabled)
SELECT p.id, f.id, m.enabled
FROM mapping m
JOIN plans p ON p.code = m.plan_code
JOIN public.feature_flags f ON f.slug = m.slug
ON CONFLICT (plan_id, feature_id) DO UPDATE SET enabled = EXCLUDED.enabled;

WITH plans AS (
  SELECT id, code FROM public.subscription_plans WHERE code IN ('free','pro','premium')
),
lim(plan_code, key, value, description) AS (VALUES
  ('free','accounts_limit',1,'Máximo de contas'),
  ('free','categories_limit',15,'Máximo de categorias'),
  ('free','transactions_limit',100,'Máximo de lançamentos'),
  ('free','goals_limit',1,'Máximo de metas'),
  ('free','cards_limit',1,'Máximo de cartões'),
  ('free','exports_limit',1,'Exportações por mês'),
  ('free','family_members_limit',0,'Membros de família'),
  ('free','ai_requests_daily',0,'Requisições de IA/dia'),
  ('free','dashboard_widgets',4,'Widgets no dashboard'),
  ('free','storage_limit',10,'Armazenamento (MB)'),
  ('free','backup_limit',0,'Backups por mês'),
  ('pro','accounts_limit',-1,'Máximo de contas'),
  ('pro','categories_limit',-1,'Máximo de categorias'),
  ('pro','transactions_limit',-1,'Máximo de lançamentos'),
  ('pro','goals_limit',-1,'Máximo de metas'),
  ('pro','cards_limit',-1,'Máximo de cartões'),
  ('pro','exports_limit',-1,'Exportações por mês'),
  ('pro','family_members_limit',0,'Membros de família'),
  ('pro','ai_requests_daily',50,'Requisições de IA/dia'),
  ('pro','dashboard_widgets',12,'Widgets no dashboard'),
  ('pro','storage_limit',500,'Armazenamento (MB)'),
  ('pro','backup_limit',10,'Backups por mês'),
  ('premium','accounts_limit',-1,'Máximo de contas'),
  ('premium','categories_limit',-1,'Máximo de categorias'),
  ('premium','transactions_limit',-1,'Máximo de lançamentos'),
  ('premium','goals_limit',-1,'Máximo de metas'),
  ('premium','cards_limit',-1,'Máximo de cartões'),
  ('premium','exports_limit',-1,'Exportações por mês'),
  ('premium','family_members_limit',-1,'Membros de família'),
  ('premium','ai_requests_daily',-1,'Requisições de IA/dia'),
  ('premium','dashboard_widgets',-1,'Widgets no dashboard'),
  ('premium','storage_limit',-1,'Armazenamento (MB)'),
  ('premium','backup_limit',-1,'Backups por mês')
)
INSERT INTO public.plan_limits (plan_id, key, value, description)
SELECT p.id, l.key, l.value, l.description
FROM lim l
JOIN plans p ON p.code = l.plan_code
ON CONFLICT (plan_id, key) DO UPDATE SET value = EXCLUDED.value, description = EXCLUDED.description;

CREATE OR REPLACE FUNCTION public.user_plan_code(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT plan_code FROM public.user_subscriptions
      WHERE user_id = _user_id
        AND status IN ('active','trial','vip')
        AND (expires_at IS NULL OR expires_at > now())
      ORDER BY started_at DESC LIMIT 1),
    'free'
  );
$$;

CREATE OR REPLACE FUNCTION public.has_feature(_user_id uuid, _slug text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.plan_features pf
    JOIN public.feature_flags f ON f.id = pf.feature_id AND f.active = true
    JOIN public.subscription_plans sp ON sp.id = pf.plan_id
    WHERE f.slug = _slug
      AND pf.enabled = true
      AND sp.code = public.user_plan_code(_user_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.get_plan_limit(_user_id uuid, _key text)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pl.value
  FROM public.plan_limits pl
  JOIN public.subscription_plans sp ON sp.id = pl.plan_id
  WHERE sp.code = public.user_plan_code(_user_id)
    AND pl.key = _key
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.user_plan_code(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_feature(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_plan_limit(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_plan_code(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_feature(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_plan_limit(uuid, text) TO authenticated, service_role;
