
-- Ensure private schema exists
CREATE SCHEMA IF NOT EXISTS private;

-- Drop triggers first
DROP TRIGGER IF EXISTS trg_cc_installment_recalc ON public.credit_card_installments;
DROP TRIGGER IF EXISTS trg_cc_payment_recalc ON public.credit_card_payments;

-- Drop public functions
DROP FUNCTION IF EXISTS public.cc_ensure_invoice(UUID, UUID, DATE);
DROP FUNCTION IF EXISTS public.cc_recalc_invoice(UUID);
DROP FUNCTION IF EXISTS public.cc_installment_after_change();
DROP FUNCTION IF EXISTS public.cc_payment_after_change();

-- Recreate in private schema
CREATE OR REPLACE FUNCTION private.cc_ensure_invoice(
  _user_id UUID, _card_id UUID, _reference_month DATE
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _inv_id UUID;
  _closing_day SMALLINT;
  _due_day SMALLINT;
  _closing DATE;
  _due DATE;
BEGIN
  SELECT id INTO _inv_id FROM public.credit_card_invoices
   WHERE card_id = _card_id AND reference_month = _reference_month;
  IF _inv_id IS NOT NULL THEN RETURN _inv_id; END IF;

  SELECT closing_day, due_day INTO _closing_day, _due_day
    FROM public.credit_cards WHERE id = _card_id;

  _closing := LEAST(
    make_date(EXTRACT(YEAR FROM _reference_month)::INT, EXTRACT(MONTH FROM _reference_month)::INT, _closing_day),
    (_reference_month + INTERVAL '1 month - 1 day')::date
  );
  _due := CASE
    WHEN _due_day >= _closing_day
      THEN LEAST(make_date(EXTRACT(YEAR FROM _reference_month)::INT, EXTRACT(MONTH FROM _reference_month)::INT, _due_day),
                 (_reference_month + INTERVAL '1 month - 1 day')::date)
    ELSE LEAST(make_date(EXTRACT(YEAR FROM _reference_month + INTERVAL '1 month')::INT,
                        EXTRACT(MONTH FROM _reference_month + INTERVAL '1 month')::INT, _due_day),
               (_reference_month + INTERVAL '2 months - 1 day')::date)
  END;

  INSERT INTO public.credit_card_invoices (user_id, card_id, reference_month, closing_date, due_date)
  VALUES (_user_id, _card_id, _reference_month, _closing, _due)
  RETURNING id INTO _inv_id;

  RETURN _inv_id;
END;
$$;
REVOKE ALL ON FUNCTION private.cc_ensure_invoice(UUID,UUID,DATE) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.cc_recalc_invoice(_invoice_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _total NUMERIC(14,2);
BEGIN
  SELECT COALESCE(SUM(amount),0) INTO _total
    FROM public.credit_card_installments
   WHERE invoice_id = _invoice_id AND status <> 'canceled';
  UPDATE public.credit_card_invoices
     SET total_amount = _total,
         status = CASE
           WHEN paid_amount >= _total AND _total > 0 THEN 'paid'
           WHEN paid_amount > 0 AND paid_amount < _total THEN 'partial'
           WHEN CURRENT_DATE > due_date AND paid_amount < _total THEN 'overdue'
           WHEN CURRENT_DATE > closing_date THEN 'closed'
           ELSE 'open'
         END
   WHERE id = _invoice_id;
END;
$$;
REVOKE ALL ON FUNCTION private.cc_recalc_invoice(UUID) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.cc_installment_after_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.invoice_id IS NOT NULL THEN PERFORM private.cc_recalc_invoice(OLD.invoice_id); END IF;
    RETURN OLD;
  ELSE
    IF NEW.invoice_id IS NOT NULL THEN PERFORM private.cc_recalc_invoice(NEW.invoice_id); END IF;
    IF TG_OP = 'UPDATE' AND OLD.invoice_id IS DISTINCT FROM NEW.invoice_id AND OLD.invoice_id IS NOT NULL THEN
      PERFORM private.cc_recalc_invoice(OLD.invoice_id);
    END IF;
    RETURN NEW;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION private.cc_installment_after_change() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.cc_payment_after_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _inv UUID := COALESCE(NEW.invoice_id, OLD.invoice_id); _paid NUMERIC(14,2);
BEGIN
  SELECT COALESCE(SUM(amount),0) INTO _paid FROM public.credit_card_payments WHERE invoice_id = _inv;
  UPDATE public.credit_card_invoices SET paid_amount = _paid WHERE id = _inv;
  PERFORM private.cc_recalc_invoice(_inv);
  RETURN COALESCE(NEW, OLD);
END;
$$;
REVOKE ALL ON FUNCTION private.cc_payment_after_change() FROM PUBLIC, anon, authenticated;

-- Recreate triggers pointing to private functions
CREATE TRIGGER trg_cc_installment_recalc
  AFTER INSERT OR UPDATE OR DELETE ON public.credit_card_installments
  FOR EACH ROW EXECUTE FUNCTION private.cc_installment_after_change();

CREATE TRIGGER trg_cc_payment_recalc
  AFTER INSERT OR UPDATE OR DELETE ON public.credit_card_payments
  FOR EACH ROW EXECUTE FUNCTION private.cc_payment_after_change();

-- Public wrapper only for ensure_invoice, callable by owner
CREATE OR REPLACE FUNCTION public.cc_ensure_invoice(_card_id UUID, _reference_month DATE)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _owner UUID;
  _inv UUID;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT user_id INTO _owner FROM public.credit_cards WHERE id = _card_id;
  IF _owner IS NULL OR _owner <> _uid THEN RAISE EXCEPTION 'card not found or forbidden'; END IF;

  SELECT id INTO _inv FROM public.credit_card_invoices
   WHERE card_id = _card_id AND reference_month = _reference_month;
  IF _inv IS NOT NULL THEN RETURN _inv; END IF;

  -- Delegate creation to private definer function
  RETURN private.cc_ensure_invoice(_uid, _card_id, _reference_month);
END;
$$;
GRANT EXECUTE ON FUNCTION public.cc_ensure_invoice(UUID, DATE) TO authenticated, service_role;
