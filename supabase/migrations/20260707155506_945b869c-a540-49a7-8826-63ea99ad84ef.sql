
CREATE TABLE public.installment_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  family_id UUID REFERENCES public.families(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  total_amount NUMERIC(14,2) NOT NULL,
  installments_count INT NOT NULL CHECK (installments_count > 0 AND installments_count <= 360),
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  first_due_date DATE NOT NULL,
  card_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.installment_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID NOT NULL REFERENCES public.installment_purchases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  installment_number INT NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  due_date DATE NOT NULL,
  is_paid BOOLEAN NOT NULL DEFAULT false,
  paid_at TIMESTAMPTZ,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (purchase_id, installment_number)
);

CREATE INDEX idx_installment_items_purchase ON public.installment_items(purchase_id);
CREATE INDEX idx_installment_items_user_due ON public.installment_items(user_id, due_date);
CREATE INDEX idx_installment_purchases_user ON public.installment_purchases(user_id);
CREATE INDEX idx_installment_purchases_family ON public.installment_purchases(family_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.installment_purchases TO authenticated;
GRANT ALL ON public.installment_purchases TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.installment_items TO authenticated;
GRANT ALL ON public.installment_items TO service_role;

ALTER TABLE public.installment_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installment_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own or family purchases select" ON public.installment_purchases
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR (family_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.family_members fm
      WHERE fm.family_id = installment_purchases.family_id AND fm.user_id = auth.uid()
    ))
  );

CREATE POLICY "own purchases insert" ON public.installment_purchases
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own or family purchases update" ON public.installment_purchases
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = user_id
    OR (family_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.family_members fm
      WHERE fm.family_id = installment_purchases.family_id AND fm.user_id = auth.uid()
    ))
  );

CREATE POLICY "own purchases delete" ON public.installment_purchases
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "own or family items select" ON public.installment_items
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.installment_purchases p
      WHERE p.id = installment_items.purchase_id
        AND p.family_id IS NOT NULL
        AND EXISTS (SELECT 1 FROM public.family_members fm WHERE fm.family_id = p.family_id AND fm.user_id = auth.uid())
    )
  );

CREATE POLICY "own items insert" ON public.installment_items
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own or family items update" ON public.installment_items
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.installment_purchases p
      WHERE p.id = installment_items.purchase_id
        AND p.family_id IS NOT NULL
        AND EXISTS (SELECT 1 FROM public.family_members fm WHERE fm.family_id = p.family_id AND fm.user_id = auth.uid())
    )
  );

CREATE POLICY "own items delete" ON public.installment_items
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER trg_installment_purchases_updated_at
  BEFORE UPDATE ON public.installment_purchases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_installment_items_updated_at
  BEFORE UPDATE ON public.installment_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
