
CREATE TABLE public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  price_monthly numeric(10,2) NOT NULL DEFAULT 0,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_highlighted boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.subscription_plans TO anon, authenticated;
GRANT ALL ON public.subscription_plans TO service_role;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active plans" ON public.subscription_plans FOR SELECT USING (is_active = true OR EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'::app_role));
CREATE POLICY "Admins manage plans" ON public.subscription_plans FOR ALL USING (EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'::app_role)) WITH CHECK (EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'::app_role));
CREATE TRIGGER trg_subscription_plans_updated BEFORE UPDATE ON public.subscription_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_code text NOT NULL DEFAULT 'free' REFERENCES public.subscription_plans(code),
  status text NOT NULL DEFAULT 'active',
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_subscriptions TO authenticated;
GRANT ALL ON public.user_subscriptions TO service_role;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User views own subscription" ON public.user_subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "User inserts own subscription" ON public.user_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "User updates own subscription" ON public.user_subscriptions FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "User deletes own subscription" ON public.user_subscriptions FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER trg_user_subscriptions_updated BEFORE UPDATE ON public.user_subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  ip_address text,
  user_agent text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.security_events TO authenticated;
GRANT ALL ON public.security_events TO service_role;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User views own security events" ON public.security_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "User logs own security events" ON public.security_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_security_events_user_created ON public.security_events(user_id, created_at DESC);

INSERT INTO public.subscription_plans (code, name, description, price_monthly, features, is_highlighted, sort_order) VALUES
('free', 'Gratuito', 'Comece a organizar suas finanças sem custo.', 0,
 '["Transações ilimitadas","Cofrinho com 1 meta","Relatórios básicos","Suporte por e-mail"]'::jsonb, false, 1),
('pro', 'Pro', 'Para quem quer levar as finanças a sério.', 19.90,
 '["Tudo do Gratuito","Cofrinhos ilimitados","IA financeira avançada","Assinaturas & Contas recorrentes","Compras parceladas","Calendário financeiro","Notificações push"]'::jsonb, true, 2),
('premium', 'Premium', 'Toda a família com o Finango completo.', 39.90,
 '["Tudo do Pro","Modo Família (multi-usuário)","Metas familiares compartilhadas","Prioridade no suporte","Rendimento CDI personalizado","Exportação avançada de relatórios"]'::jsonb, false, 3)
ON CONFLICT (code) DO NOTHING;
