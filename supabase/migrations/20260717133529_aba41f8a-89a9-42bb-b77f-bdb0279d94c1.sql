
-- =========================================
-- 1) CREDIT CARDS
-- =========================================
CREATE TABLE public.credit_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  bank TEXT,
  brand TEXT,
  color TEXT DEFAULT '#7c3aed',
  last_digits TEXT,
  credit_limit NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (credit_limit >= 0),
  closing_day SMALLINT NOT NULL CHECK (closing_day BETWEEN 1 AND 31),
  due_day SMALLINT NOT NULL CHECK (due_day BETWEEN 1 AND 31),
  default_category_id UUID,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.credit_cards TO authenticated;
GRANT ALL ON public.credit_cards TO service_role;

ALTER TABLE public.credit_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cc_select_own" ON public.credit_cards
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "cc_insert_own" ON public.credit_cards
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "cc_update_own" ON public.credit_cards
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "cc_delete_own" ON public.credit_cards
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_credit_cards_user ON public.credit_cards(user_id);

CREATE TRIGGER trg_credit_cards_updated_at
  BEFORE UPDATE ON public.credit_cards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- 2) INVOICES
-- =========================================
CREATE TABLE public.credit_card_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  card_id UUID NOT NULL REFERENCES public.credit_cards(id) ON DELETE CASCADE,
  reference_month DATE NOT NULL, -- first day of the reference month
  closing_date DATE NOT NULL,
  due_date DATE NOT NULL,
  total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed','paid','partial','overdue')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(card_id, reference_month)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.credit_card_invoices TO authenticated;
GRANT ALL ON public.credit_card_invoices TO service_role;

ALTER TABLE public.credit_card_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cci_select_own" ON public.credit_card_invoices
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "cci_insert_own" ON public.credit_card_invoices
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "cci_update_own" ON public.credit_card_invoices
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "cci_delete_own" ON public.credit_card_invoices
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_cci_card ON public.credit_card_invoices(card_id, reference_month);
CREATE INDEX idx_cci_user ON public.credit_card_invoices(user_id);

CREATE TRIGGER trg_cci_updated_at
  BEFORE UPDATE ON public.credit_card_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- 3) PURCHASES
-- =========================================
CREATE TABLE public.credit_card_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  card_id UUID NOT NULL REFERENCES public.credit_cards(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  category_id UUID,
  total_amount NUMERIC(14,2) NOT NULL CHECK (total_amount > 0),
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  installments_count SMALLINT NOT NULL DEFAULT 1 CHECK (installments_count BETWEEN 1 AND 60),
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','canceled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.credit_card_purchases TO authenticated;
GRANT ALL ON public.credit_card_purchases TO service_role;

ALTER TABLE public.credit_card_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ccp_select_own" ON public.credit_card_purchases
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "ccp_insert_own" ON public.credit_card_purchases
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ccp_update_own" ON public.credit_card_purchases
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ccp_delete_own" ON public.credit_card_purchases
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_ccp_card ON public.credit_card_purchases(card_id);
CREATE INDEX idx_ccp_user ON public.credit_card_purchases(user_id);

CREATE TRIGGER trg_ccp_updated_at
  BEFORE UPDATE ON public.credit_card_purchases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- 4) INSTALLMENTS
-- =========================================
CREATE TABLE public.credit_card_installments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  purchase_id UUID NOT NULL REFERENCES public.credit_card_purchases(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES public.credit_cards(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.credit_card_invoices(id) ON DELETE SET NULL,
  installment_number SMALLINT NOT NULL,
  total_installments SMALLINT NOT NULL,
  amount NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
  reference_month DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','billed','paid','canceled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.credit_card_installments TO authenticated;
GRANT ALL ON public.credit_card_installments TO service_role;

ALTER TABLE public.credit_card_installments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cci2_select_own" ON public.credit_card_installments
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "cci2_insert_own" ON public.credit_card_installments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "cci2_update_own" ON public.credit_card_installments
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "cci2_delete_own" ON public.credit_card_installments
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_cci2_card_month ON public.credit_card_installments(card_id, reference_month);
CREATE INDEX idx_cci2_invoice ON public.credit_card_installments(invoice_id);
CREATE INDEX idx_cci2_user ON public.credit_card_installments(user_id);

CREATE TRIGGER trg_cci2_updated_at
  BEFORE UPDATE ON public.credit_card_installments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- 5) INVOICE PAYMENTS
-- =========================================
CREATE TABLE public.credit_card_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  invoice_id UUID NOT NULL REFERENCES public.credit_card_invoices(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES public.credit_cards(id) ON DELETE CASCADE,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  source_account TEXT,
  transaction_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.credit_card_payments TO authenticated;
GRANT ALL ON public.credit_card_payments TO service_role;

ALTER TABLE public.credit_card_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ccpay_select_own" ON public.credit_card_payments
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "ccpay_insert_own" ON public.credit_card_payments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ccpay_update_own" ON public.credit_card_payments
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ccpay_delete_own" ON public.credit_card_payments
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_ccpay_invoice ON public.credit_card_payments(invoice_id);
CREATE INDEX idx_ccpay_user ON public.credit_card_payments(user_id);

CREATE TRIGGER trg_ccpay_updated_at
  BEFORE UPDATE ON public.credit_card_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- 6) HELPER FUNCTIONS
-- =========================================

-- Compute reference month for a purchase based on closing_day
CREATE OR REPLACE FUNCTION public.cc_reference_month(_purchase_date DATE, _closing_day SMALLINT)
RETURNS DATE
LANGUAGE plpgsql IMMUTABLE
SET search_path = public
AS $$
DECLARE
  _year INT := EXTRACT(YEAR FROM _purchase_date);
  _month INT := EXTRACT(MONTH FROM _purchase_date);
  _day INT := EXTRACT(DAY FROM _purchase_date);
BEGIN
  -- If purchase happens after closing day, it goes to next month's invoice
  IF _day > _closing_day THEN
    _month := _month + 1;
    IF _month > 12 THEN
      _month := 1;
      _year := _year + 1;
    END IF;
  END IF;
  RETURN make_date(_year, _month, 1);
END;
$$;

-- Ensure an invoice exists for (card, reference_month); returns invoice id
CREATE OR REPLACE FUNCTION public.cc_ensure_invoice(
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

REVOKE ALL ON FUNCTION public.cc_ensure_invoice(UUID, UUID, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cc_ensure_invoice(UUID, UUID, DATE) TO authenticated, service_role;

-- Recalculate invoice totals from its installments
CREATE OR REPLACE FUNCTION public.cc_recalc_invoice(_invoice_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _total NUMERIC(14,2);
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

REVOKE ALL ON FUNCTION public.cc_recalc_invoice(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cc_recalc_invoice(UUID) TO authenticated, service_role;

-- Trigger: after installment insert/update/delete, recalc invoice totals
CREATE OR REPLACE FUNCTION public.cc_installment_after_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.invoice_id IS NOT NULL THEN
      PERFORM public.cc_recalc_invoice(OLD.invoice_id);
    END IF;
    RETURN OLD;
  ELSE
    IF NEW.invoice_id IS NOT NULL THEN
      PERFORM public.cc_recalc_invoice(NEW.invoice_id);
    END IF;
    IF TG_OP = 'UPDATE' AND OLD.invoice_id IS DISTINCT FROM NEW.invoice_id AND OLD.invoice_id IS NOT NULL THEN
      PERFORM public.cc_recalc_invoice(OLD.invoice_id);
    END IF;
    RETURN NEW;
  END IF;
END;
$$;

CREATE TRIGGER trg_cc_installment_recalc
  AFTER INSERT OR UPDATE OR DELETE ON public.credit_card_installments
  FOR EACH ROW EXECUTE FUNCTION public.cc_installment_after_change();

-- Trigger: after payment insert/update/delete, refresh paid_amount and status
CREATE OR REPLACE FUNCTION public.cc_payment_after_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _inv UUID := COALESCE(NEW.invoice_id, OLD.invoice_id);
  _paid NUMERIC(14,2);
BEGIN
  SELECT COALESCE(SUM(amount),0) INTO _paid
    FROM public.credit_card_payments WHERE invoice_id = _inv;
  UPDATE public.credit_card_invoices SET paid_amount = _paid WHERE id = _inv;
  PERFORM public.cc_recalc_invoice(_inv);
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_cc_payment_recalc
  AFTER INSERT OR UPDATE OR DELETE ON public.credit_card_payments
  FOR EACH ROW EXECUTE FUNCTION public.cc_payment_after_change();

-- Utility view: current usage per card (limit used = sum of unpaid installments)
CREATE OR REPLACE VIEW public.credit_card_usage
WITH (security_invoker=on) AS
SELECT
  c.id AS card_id,
  c.user_id,
  c.credit_limit,
  COALESCE(SUM(CASE WHEN i.status IN ('open','billed') THEN i.amount ELSE 0 END), 0) AS used_amount,
  GREATEST(c.credit_limit - COALESCE(SUM(CASE WHEN i.status IN ('open','billed') THEN i.amount ELSE 0 END), 0), 0) AS available_amount
FROM public.credit_cards c
LEFT JOIN public.credit_card_installments i ON i.card_id = c.id AND i.status <> 'canceled'
GROUP BY c.id, c.user_id, c.credit_limit;

GRANT SELECT ON public.credit_card_usage TO authenticated, service_role;
