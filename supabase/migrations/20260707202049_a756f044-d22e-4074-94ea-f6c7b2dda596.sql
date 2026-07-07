
ALTER TABLE public.vip_codes
  ADD COLUMN IF NOT EXISTS views_count integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.register_vip_view(p_code text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.vip_codes
     SET views_count = views_count + 1
   WHERE upper(code) = upper(p_code);
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_vip_view(text) TO anon, authenticated;
