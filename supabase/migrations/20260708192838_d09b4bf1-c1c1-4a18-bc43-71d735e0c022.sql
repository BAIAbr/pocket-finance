
CREATE TABLE public.financial_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  family_id UUID REFERENCES public.families(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  goal_type TEXT NOT NULL DEFAULT 'custom',
  icon TEXT NOT NULL DEFAULT 'Target',
  color TEXT NOT NULL DEFAULT '#FF6A00',
  target_amount NUMERIC(14,2) NOT NULL CHECK (target_amount > 0),
  initial_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (initial_amount >= 0),
  monthly_contribution NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (monthly_contribution >= 0),
  target_date DATE,
  cdi_percentage NUMERIC(6,2) NOT NULL DEFAULT 100 CHECK (cdi_percentage >= 0),
  custom_annual_rate NUMERIC(6,2),
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  piggy_bank_id UUID REFERENCES public.piggy_bank(id) ON DELETE SET NULL,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_financial_goals_user ON public.financial_goals(user_id);
CREATE INDEX idx_financial_goals_family ON public.financial_goals(family_id) WHERE family_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_goals TO authenticated;
GRANT ALL ON public.financial_goals TO service_role;

ALTER TABLE public.financial_goals ENABLE ROW LEVEL SECURITY;

-- Owner can do everything with their own goals
CREATE POLICY "Users can view their own financial goals"
  ON public.financial_goals FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR (family_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.family_members fm
      WHERE fm.family_id = financial_goals.family_id AND fm.user_id = auth.uid()
    ))
  );

CREATE POLICY "Users can insert their own financial goals"
  ON public.financial_goals FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own financial goals"
  ON public.financial_goals FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own financial goals"
  ON public.financial_goals FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_financial_goals_updated_at
  BEFORE UPDATE ON public.financial_goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Ensure only one primary goal per user/family combo
CREATE OR REPLACE FUNCTION public.enforce_single_primary_goal()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.is_primary THEN
    UPDATE public.financial_goals
       SET is_primary = false
     WHERE id <> NEW.id
       AND user_id = NEW.user_id
       AND COALESCE(family_id::text, '') = COALESCE(NEW.family_id::text, '')
       AND is_primary = true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_single_primary_goal_trg
  BEFORE INSERT OR UPDATE ON public.financial_goals
  FOR EACH ROW EXECUTE FUNCTION public.enforce_single_primary_goal();
