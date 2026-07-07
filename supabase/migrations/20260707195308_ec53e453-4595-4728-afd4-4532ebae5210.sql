
CREATE TABLE public.vip_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  plan_code TEXT NOT NULL REFERENCES public.subscription_plans(code),
  duration_days INTEGER NOT NULL DEFAULT 30 CHECK (duration_days > 0),
  max_uses INTEGER,
  uses_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vip_codes TO authenticated;
GRANT ALL ON public.vip_codes TO service_role;

ALTER TABLE public.vip_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage vip codes" ON public.vip_codes
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER trg_vip_codes_updated
  BEFORE UPDATE ON public.vip_codes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.vip_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vip_code_id UUID NOT NULL REFERENCES public.vip_codes(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_code TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (vip_code_id, user_id)
);

GRANT SELECT, INSERT ON public.vip_redemptions TO authenticated;
GRANT ALL ON public.vip_redemptions TO service_role;

ALTER TABLE public.vip_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own redemptions" ON public.vip_redemptions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins manage redemptions" ON public.vip_redemptions
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.get_vip_code_info(p_code TEXT)
RETURNS TABLE (
  valid BOOLEAN,
  reason TEXT,
  code TEXT,
  description TEXT,
  plan_code TEXT,
  plan_name TEXT,
  duration_days INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code public.vip_codes%ROWTYPE;
  v_plan_name TEXT;
BEGIN
  SELECT * INTO v_code FROM public.vip_codes WHERE upper(vip_codes.code) = upper(p_code);
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'not_found'::TEXT, p_code, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::INTEGER;
    RETURN;
  END IF;
  IF NOT v_code.is_active THEN
    RETURN QUERY SELECT false, 'inactive'::TEXT, v_code.code, v_code.description, v_code.plan_code, NULL::TEXT, v_code.duration_days;
    RETURN;
  END IF;
  IF v_code.expires_at IS NOT NULL AND v_code.expires_at < now() THEN
    RETURN QUERY SELECT false, 'expired'::TEXT, v_code.code, v_code.description, v_code.plan_code, NULL::TEXT, v_code.duration_days;
    RETURN;
  END IF;
  IF v_code.max_uses IS NOT NULL AND v_code.uses_count >= v_code.max_uses THEN
    RETURN QUERY SELECT false, 'max_uses'::TEXT, v_code.code, v_code.description, v_code.plan_code, NULL::TEXT, v_code.duration_days;
    RETURN;
  END IF;
  SELECT name INTO v_plan_name FROM public.subscription_plans WHERE subscription_plans.code = v_code.plan_code;
  RETURN QUERY SELECT true, 'ok'::TEXT, v_code.code, v_code.description, v_code.plan_code, v_plan_name, v_code.duration_days;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_vip_code_info(TEXT) TO anon, authenticated;
