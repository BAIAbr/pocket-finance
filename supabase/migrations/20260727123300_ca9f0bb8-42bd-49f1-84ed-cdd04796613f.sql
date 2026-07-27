
ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS plan_group text,
  ADD COLUMN IF NOT EXISTS billing_interval text,
  ADD COLUMN IF NOT EXISTS interval_count integer,
  ADD COLUMN IF NOT EXISTS badge_label text,
  ADD COLUMN IF NOT EXISTS badge_color text,
  ADD COLUMN IF NOT EXISTS discount_percent numeric;

-- Ensure allowed values
ALTER TABLE public.subscription_plans
  DROP CONSTRAINT IF EXISTS subscription_plans_billing_interval_check;
ALTER TABLE public.subscription_plans
  ADD CONSTRAINT subscription_plans_billing_interval_check
  CHECK (billing_interval IS NULL OR billing_interval IN ('month','quarter','semester','year'));

-- Backfill existing plans
UPDATE public.subscription_plans
  SET plan_group = 'premium',
      billing_interval = 'month',
      interval_count = 1
WHERE code = 'premium';

UPDATE public.subscription_plans
  SET plan_group = 'premium',
      billing_interval = 'year',
      interval_count = 12,
      badge_label = COALESCE(badge_label, 'Melhor Oferta')
WHERE code = 'premium_yearly';

-- Seed trimestral & semestral (inactive by default; admin activates)
INSERT INTO public.subscription_plans
  (code, name, description, price_monthly, features, is_highlighted, sort_order, is_active,
   plan_group, billing_interval, interval_count, badge_label, discount_percent, billing_cycle, currency)
SELECT 'premium_quarterly', 'Premium Trimestral',
       'Assinatura Premium com renovação a cada 3 meses.',
       14.00, '[]'::jsonb, false, 6, false,
       'premium', 'quarter', 3, 'Economia leve', 6, 'monthly', 'BRL'
WHERE NOT EXISTS (SELECT 1 FROM public.subscription_plans WHERE code = 'premium_quarterly');

INSERT INTO public.subscription_plans
  (code, name, description, price_monthly, features, is_highlighted, sort_order, is_active,
   plan_group, billing_interval, interval_count, badge_label, discount_percent, billing_cycle, currency)
SELECT 'premium_semester', 'Premium Semestral',
       'Assinatura Premium com renovação a cada 6 meses.',
       27.00, '[]'::jsonb, false, 7, false,
       'premium', 'semester', 6, 'Melhor Custo-benefício', 10, 'monthly', 'BRL'
WHERE NOT EXISTS (SELECT 1 FROM public.subscription_plans WHERE code = 'premium_semester');
