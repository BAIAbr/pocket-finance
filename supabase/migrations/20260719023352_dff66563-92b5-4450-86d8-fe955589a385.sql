CREATE TABLE public.credit_card_recurring (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  card_id UUID NOT NULL REFERENCES public.credit_cards(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  category_id UUID,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  day_of_month SMALLINT NOT NULL CHECK (day_of_month BETWEEN 1 AND 31),
  starts_on DATE NOT NULL DEFAULT CURRENT_DATE,
  ends_on DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_charged_month DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cc_recurring_user ON public.credit_card_recurring(user_id);
CREATE INDEX idx_cc_recurring_card ON public.credit_card_recurring(card_id);
CREATE INDEX idx_cc_recurring_active ON public.credit_card_recurring(is_active) WHERE is_active = true;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.credit_card_recurring TO authenticated;
GRANT ALL ON public.credit_card_recurring TO service_role;

ALTER TABLE public.credit_card_recurring ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users select own cc recurring"
  ON public.credit_card_recurring FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users insert own cc recurring"
  ON public.credit_card_recurring FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own cc recurring"
  ON public.credit_card_recurring FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own cc recurring"
  ON public.credit_card_recurring FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER update_credit_card_recurring_updated_at
  BEFORE UPDATE ON public.credit_card_recurring
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to process recurring cc charges (idempotent per month)
CREATE OR REPLACE FUNCTION public.cc_process_recurring()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  _today DATE := CURRENT_DATE;
  _month_start DATE := date_trunc('month', CURRENT_DATE)::date;
  _last_day INT := EXTRACT(DAY FROM (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month - 1 day'));
  _effective_day INT;
  _purchase_date DATE;
  _card RECORD;
  _ref_month DATE;
  _inv_id UUID;
  _purchase_id UUID;
  _count INT := 0;
BEGIN
  FOR r IN
    SELECT * FROM public.credit_card_recurring
    WHERE is_active = true
      AND starts_on <= _today
      AND (ends_on IS NULL OR ends_on >= _today)
      AND (last_charged_month IS NULL OR last_charged_month < _month_start)
  LOOP
    -- clamp day to last day of month if needed
    _effective_day := LEAST(r.day_of_month, _last_day);
    IF EXTRACT(DAY FROM _today) < _effective_day THEN
      CONTINUE;
    END IF;

    _purchase_date := make_date(EXTRACT(YEAR FROM _today)::int, EXTRACT(MONTH FROM _today)::int, _effective_day);

    SELECT * INTO _card FROM public.credit_cards WHERE id = r.card_id;
    IF _card IS NULL OR _card.is_active = false THEN CONTINUE; END IF;

    _ref_month := public.cc_reference_month(_purchase_date, _card.closing_day);

    -- ensure invoice
    _inv_id := private.cc_ensure_invoice(r.user_id, r.card_id, _ref_month);

    -- create purchase
    INSERT INTO public.credit_card_purchases
      (user_id, card_id, description, category_id, total_amount, purchase_date, installments_count, is_recurring)
    VALUES
      (r.user_id, r.card_id, r.description, COALESCE(r.category_id, _card.default_category_id),
       r.amount, _purchase_date, 1, true)
    RETURNING id INTO _purchase_id;

    -- create single installment
    INSERT INTO public.credit_card_installments
      (user_id, purchase_id, card_id, invoice_id, installment_number, total_installments, amount, reference_month, status)
    VALUES
      (r.user_id, _purchase_id, r.card_id, _inv_id, 1, 1, r.amount, _ref_month, 'open');

    UPDATE public.credit_card_recurring
       SET last_charged_month = _month_start
     WHERE id = r.id;

    _count := _count + 1;
  END LOOP;
  RETURN _count;
END;
$$;

REVOKE ALL ON FUNCTION public.cc_process_recurring() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cc_process_recurring() TO service_role;