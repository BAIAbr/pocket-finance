
CREATE TABLE public.recurring_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  family_id uuid REFERENCES public.families(id) ON DELETE CASCADE,
  name text NOT NULL,
  amount numeric NOT NULL CHECK (amount >= 0),
  type text NOT NULL CHECK (type IN ('income','expense')),
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  frequency text NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('weekly','monthly','yearly')),
  day_of_month integer CHECK (day_of_month BETWEEN 1 AND 31),
  next_due_date date NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  color text,
  icon text,
  last_paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_recurring_user ON public.recurring_transactions(user_id);
CREATE INDEX idx_recurring_family ON public.recurring_transactions(family_id) WHERE family_id IS NOT NULL;
CREATE INDEX idx_recurring_due ON public.recurring_transactions(next_due_date) WHERE is_active = true;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.recurring_transactions TO authenticated;
GRANT ALL ON public.recurring_transactions TO service_role;

ALTER TABLE public.recurring_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own recurring"
  ON public.recurring_transactions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR (family_id IS NOT NULL AND family_id IN (SELECT private.get_my_family_ids())));

CREATE POLICY "Users can insert own recurring"
  ON public.recurring_transactions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND (family_id IS NULL OR family_id IN (SELECT private.get_my_family_ids())));

CREATE POLICY "Users can update own recurring"
  ON public.recurring_transactions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR (family_id IS NOT NULL AND family_id IN (SELECT private.get_my_family_ids())))
  WITH CHECK (auth.uid() = user_id OR (family_id IS NOT NULL AND family_id IN (SELECT private.get_my_family_ids())));

CREATE POLICY "Users can delete own recurring"
  ON public.recurring_transactions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_recurring_transactions_updated_at
  BEFORE UPDATE ON public.recurring_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
