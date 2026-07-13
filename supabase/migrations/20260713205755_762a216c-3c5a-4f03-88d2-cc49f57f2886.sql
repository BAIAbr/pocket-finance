
ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'BRL',
  ADD COLUMN IF NOT EXISTS billing_cycle text NOT NULL DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS trial_days integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_yearly numeric,
  ADD COLUMN IF NOT EXISTS is_lifetime boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS lifetime_price numeric,
  ADD COLUMN IF NOT EXISTS max_seats integer,
  ADD COLUMN IF NOT EXISTS seats_taken integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS available_until timestamptz,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

UPDATE public.subscription_plans SET slug = code WHERE slug IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS subscription_plans_slug_key ON public.subscription_plans(slug);

ALTER TABLE public.user_subscriptions
  ADD COLUMN IF NOT EXISTS trial boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS amount numeric,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'BRL',
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS coupon_code text,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS receipt_url text,
  ADD COLUMN IF NOT EXISTS external_reference text;

CREATE TABLE IF NOT EXISTS public.subscription_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  subscription_id uuid REFERENCES public.user_subscriptions(id) ON DELETE SET NULL,
  plan_code text,
  event_type text NOT NULL,
  source text NOT NULL DEFAULT 'system',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.subscription_logs TO authenticated;
GRANT ALL ON public.subscription_logs TO service_role;
ALTER TABLE public.subscription_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read their own subscription logs"
  ON public.subscription_logs FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE INDEX IF NOT EXISTS subscription_logs_user_idx ON public.subscription_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS subscription_logs_event_idx ON public.subscription_logs(event_type, created_at DESC);

CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text,
  discount_type text NOT NULL CHECK (discount_type IN ('percent','fixed','free_days','first_payment')),
  discount_value numeric NOT NULL DEFAULT 0,
  free_days integer NOT NULL DEFAULT 0,
  applies_to_plan_codes text[] NOT NULL DEFAULT '{}',
  max_uses integer,
  uses_count integer NOT NULL DEFAULT 0,
  starts_at timestamptz,
  expires_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can read active coupons"
  ON public.coupons FOR SELECT TO authenticated USING (active = true);
CREATE POLICY "Admins manage coupons"
  ON public.coupons FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES public.user_subscriptions(id) ON DELETE SET NULL,
  plan_code text,
  discount_applied numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (coupon_id, user_id)
);
GRANT SELECT ON public.coupon_redemptions TO authenticated;
GRANT ALL ON public.coupon_redemptions TO service_role;
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own redemptions"
  ON public.coupon_redemptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin'::public.app_role));

DROP TRIGGER IF EXISTS trg_coupons_updated_at ON public.coupons;
CREATE TRIGGER trg_coupons_updated_at BEFORE UPDATE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.subscription_plans (code, slug, name, description, price_monthly, currency, billing_cycle, trial_days, is_active, sort_order)
VALUES
  ('premium_yearly','premium_yearly','Premium Anual','Plano Premium com pagamento anual',0,'BRL','yearly',0,true,15),
  ('family','family','Família','Plano compartilhado para famílias',0,'BRL','monthly',7,true,20),
  ('business','business','Business','Plano para pequenos negócios',0,'BRL','monthly',7,true,30),
  ('starter','starter','Starter','Plano inicial',0,'BRL','monthly',0,true,5),
  ('pro','pro','Pro','Plano profissional',0,'BRL','monthly',0,true,25),
  ('enterprise','enterprise','Enterprise','Plano corporativo',0,'BRL','monthly',0,true,40),
  ('funder','funder','Fundador','Preço vitalício exclusivo para os primeiros apoiadores',9.90,'BRL','monthly',0,true,1)
ON CONFLICT (code) DO NOTHING;

UPDATE public.subscription_plans SET max_seats = 500, is_highlighted = true
 WHERE code = 'funder' AND max_seats IS NULL;
