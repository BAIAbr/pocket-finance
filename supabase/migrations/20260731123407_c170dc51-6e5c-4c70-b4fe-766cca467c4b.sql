CREATE TABLE public.vip_redeem_throttle (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  identity text NOT NULL UNIQUE,
  user_id uuid,
  ip text,
  attempts integer NOT NULL DEFAULT 0,
  failures integer NOT NULL DEFAULT 0,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  block_level integer NOT NULL DEFAULT 0,
  blocked_until timestamptz,
  last_attempt_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_vip_redeem_throttle_blocked_until ON public.vip_redeem_throttle (blocked_until);

GRANT ALL ON public.vip_redeem_throttle TO service_role;

ALTER TABLE public.vip_redeem_throttle ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vip_redeem_throttle_no_client_access"
ON public.vip_redeem_throttle
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);

CREATE TRIGGER update_vip_redeem_throttle_updated_at
BEFORE UPDATE ON public.vip_redeem_throttle
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();