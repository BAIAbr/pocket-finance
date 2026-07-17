-- Recreate public wrapper as SECURITY DEFINER so it can call private.cc_ensure_invoice.
-- Ownership check remains: only the authenticated owner of the card can create/get its invoice.
CREATE OR REPLACE FUNCTION public.cc_ensure_invoice(_card_id uuid, _reference_month date)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  _uid UUID := auth.uid();
  _owner UUID;
  _inv UUID;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT user_id INTO _owner FROM public.credit_cards WHERE id = _card_id;
  IF _owner IS NULL OR _owner <> _uid THEN
    RAISE EXCEPTION 'card not found or forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT id INTO _inv
    FROM public.credit_card_invoices
   WHERE card_id = _card_id AND reference_month = _reference_month;
  IF _inv IS NOT NULL THEN
    RETURN _inv;
  END IF;

  RETURN private.cc_ensure_invoice(_uid, _card_id, _reference_month);
END;
$function$;

-- Lock down and re-grant execute permissions explicitly.
REVOKE ALL ON FUNCTION public.cc_ensure_invoice(uuid, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cc_ensure_invoice(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cc_ensure_invoice(uuid, date) TO service_role;