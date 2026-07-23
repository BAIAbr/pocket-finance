
CREATE TABLE public.credit_card_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id UUID REFERENCES public.credit_cards(id) ON DELETE CASCADE,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('category_limit','auto_category','high_amount')),
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.credit_card_rules TO authenticated;
GRANT ALL ON public.credit_card_rules TO service_role;

ALTER TABLE public.credit_card_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own credit card rules"
  ON public.credit_card_rules FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_credit_card_rules_updated
  BEFORE UPDATE ON public.credit_card_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_credit_card_rules_user ON public.credit_card_rules(user_id, is_active);
