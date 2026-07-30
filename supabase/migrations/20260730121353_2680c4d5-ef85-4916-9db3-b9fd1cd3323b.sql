-- Extend vip_codes
ALTER TABLE public.vip_codes
  ADD COLUMN IF NOT EXISTS internal_name text,
  ADD COLUMN IF NOT EXISTS code_type text NOT NULL DEFAULT 'premium',
  ADD COLUMN IF NOT EXISTS benefit_type text NOT NULL DEFAULT 'days',
  ADD COLUMN IF NOT EXISTS discount_percent numeric,
  ADD COLUMN IF NOT EXISTS discount_amount numeric,
  ADD COLUMN IF NOT EXISTS is_lifetime boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS campaign_source text NOT NULL DEFAULT 'organic',
  ADD COLUMN IF NOT EXISTS campaign_label text,
  ADD COLUMN IF NOT EXISTS starts_at timestamptz,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS single_use_per_user boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS unlimited boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_by uuid,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

UPDATE public.vip_codes SET status = CASE WHEN is_active THEN 'active' ELSE 'paused' END WHERE status IS NULL OR status = 'active';

ALTER TABLE public.vip_codes DROP CONSTRAINT IF EXISTS vip_codes_status_check;
ALTER TABLE public.vip_codes ADD CONSTRAINT vip_codes_status_check
  CHECK (status IN ('active','paused','expired','archived'));
ALTER TABLE public.vip_codes DROP CONSTRAINT IF EXISTS vip_codes_code_type_check;
ALTER TABLE public.vip_codes ADD CONSTRAINT vip_codes_code_type_check
  CHECK (code_type IN ('premium','discount','invite','influencer','partner','employee','beta'));
ALTER TABLE public.vip_codes DROP CONSTRAINT IF EXISTS vip_codes_benefit_type_check;
ALTER TABLE public.vip_codes ADD CONSTRAINT vip_codes_benefit_type_check
  CHECK (benefit_type IN ('days','lifetime','percent_discount','fixed_discount'));

CREATE UNIQUE INDEX IF NOT EXISTS vip_codes_code_upper_uidx ON public.vip_codes (upper(code));
CREATE INDEX IF NOT EXISTS vip_codes_status_idx ON public.vip_codes (status);
CREATE INDEX IF NOT EXISTS vip_codes_campaign_source_idx ON public.vip_codes (campaign_source);

-- Extend vip_redemptions
ALTER TABLE public.vip_redemptions
  ADD COLUMN IF NOT EXISTS days_granted integer,
  ADD COLUMN IF NOT EXISTS source_campaign text,
  ADD COLUMN IF NOT EXISTS user_agent text,
  ADD COLUMN IF NOT EXISTS ip text,
  ADD COLUMN IF NOT EXISTS device text;

DELETE FROM public.vip_redemptions a
  USING public.vip_redemptions b
 WHERE a.ctid < b.ctid AND a.vip_code_id = b.vip_code_id AND a.user_id = b.user_id;

CREATE UNIQUE INDEX IF NOT EXISTS vip_redemptions_code_user_uidx
  ON public.vip_redemptions (vip_code_id, user_id);
CREATE INDEX IF NOT EXISTS vip_redemptions_code_date_idx
  ON public.vip_redemptions (vip_code_id, redeemed_at DESC);

-- Audit events
CREATE TABLE IF NOT EXISTS public.vip_code_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vip_code_id uuid,
  code text,
  actor_id uuid,
  action text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.vip_code_events TO authenticated;
GRANT ALL ON public.vip_code_events TO service_role;

ALTER TABLE public.vip_code_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view vip code events" ON public.vip_code_events;
CREATE POLICY "Admins can view vip code events"
  ON public.vip_code_events FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS vip_code_events_code_idx ON public.vip_code_events (vip_code_id, created_at DESC);