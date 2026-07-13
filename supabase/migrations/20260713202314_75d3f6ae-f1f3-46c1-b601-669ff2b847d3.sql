
-- Add MP fields to user_subscriptions
ALTER TABLE public.user_subscriptions
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS provider_subscription_id text,
  ADD COLUMN IF NOT EXISTS provider_customer_id text,
  ADD COLUMN IF NOT EXISTS next_billing_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_user_subs_provider_sub ON public.user_subscriptions(provider_subscription_id);

-- Payments table
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES public.user_subscriptions(id) ON DELETE SET NULL,
  plan_code text,
  provider text NOT NULL DEFAULT 'mercado_pago',
  provider_payment_id text,
  provider_subscription_id text,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'BRL',
  status text NOT NULL DEFAULT 'pending',
  status_detail text,
  payment_method text,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own payments" ON public.payments
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_payments_user ON public.payments(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_provider_payment ON public.payments(provider_payment_id);

CREATE TRIGGER trg_payments_updated_at BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed Family plan (idempotent)
INSERT INTO public.subscription_plans (code, name, description, price_monthly, features, is_active, is_highlighted, sort_order)
VALUES (
  'family',
  'Família',
  'Plano compartilhado para toda a família com finanças unificadas.',
  9.90,
  '[
    {"label":"Tudo do Premium","enabled":true},
    {"label":"Até 5 membros na família","enabled":true},
    {"label":"Finanças compartilhadas","enabled":true},
    {"label":"Metas e cofrinhos em grupo","enabled":true},
    {"label":"Relatórios consolidados","enabled":true}
  ]'::jsonb,
  true,
  false,
  3
)
ON CONFLICT (code) DO UPDATE
  SET name = EXCLUDED.name,
      description = EXCLUDED.description,
      price_monthly = EXCLUDED.price_monthly,
      is_active = true;
