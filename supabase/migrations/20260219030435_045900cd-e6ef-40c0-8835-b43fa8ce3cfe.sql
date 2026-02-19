
-- Add rarity column to missions table
ALTER TABLE public.missions ADD COLUMN IF NOT EXISTS rarity text NOT NULL DEFAULT 'common';

-- Update existing missions with rarity levels
UPDATE public.missions SET rarity = 'common' WHERE key IN ('first_transaction', 'first_income', 'first_expense');
UPDATE public.missions SET rarity = 'rare' WHERE key IN ('streak_3', 'ten_transactions', 'first_saving_goal', 'first_piggy_bank');
UPDATE public.missions SET rarity = 'epic' WHERE key IN ('streak_7', 'fifty_transactions', 'saving_goal_complete', 'budget_master');
UPDATE public.missions SET rarity = 'legendary' WHERE key IN ('streak_30');

-- Add trophy missions (rare/epic/legendary)
INSERT INTO public.missions (key, name, description, icon, xp_reward, category, medal_type, rarity) VALUES
  ('hundred_transactions', 'Centurião Financeiro', 'Registre 100 transações no total', 'Award', 100, 'transactions', 'gold', 'legendary'),
  ('streak_60', 'Disciplina de Ferro', 'Mantenha uma sequência de 60 dias', 'Flame', 150, 'streak', 'gold', 'legendary'),
  ('five_saving_goals', 'Planejador Mestre', 'Crie 5 metas de economia', 'Target', 60, 'savings', 'silver', 'epic'),
  ('three_completed_goals', 'Realizador', 'Complete 3 metas de economia', 'CheckCircle', 80, 'savings', 'gold', 'epic'),
  ('five_piggy_banks', 'Colecionador de Cofrinhos', 'Crie 5 cofrinhos', 'PiggyBank', 50, 'savings', 'silver', 'rare'),
  ('streak_14', 'Duas Semanas Firme', 'Mantenha uma sequência de 14 dias', 'Zap', 40, 'streak', 'silver', 'rare'),
  ('twenty_five_transactions', 'Meio Centurião', 'Registre 25 transações', 'FileText', 30, 'transactions', 'silver', 'rare')
ON CONFLICT DO NOTHING;

-- Create weekly missions table for AI-generated missions
CREATE TABLE public.weekly_missions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL DEFAULT 'Sparkles',
  xp_reward integer NOT NULL DEFAULT 20,
  rarity text NOT NULL DEFAULT 'common',
  target_type text NOT NULL,
  target_value integer NOT NULL DEFAULT 1,
  current_value integer NOT NULL DEFAULT 0,
  is_completed boolean NOT NULL DEFAULT false,
  week_start date NOT NULL DEFAULT CURRENT_DATE,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.weekly_missions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own weekly missions"
ON public.weekly_missions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own weekly missions"
ON public.weekly_missions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own weekly missions"
ON public.weekly_missions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own weekly missions"
ON public.weekly_missions FOR DELETE
USING (auth.uid() = user_id);
