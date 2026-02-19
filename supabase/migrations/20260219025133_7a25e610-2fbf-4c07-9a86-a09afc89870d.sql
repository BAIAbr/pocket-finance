
-- Missions definitions table
CREATE TABLE public.missions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'Target',
  xp_reward INTEGER NOT NULL DEFAULT 10,
  category TEXT NOT NULL DEFAULT 'general',
  medal_type TEXT NOT NULL DEFAULT 'bronze',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Missions are readable by all authenticated users"
ON public.missions FOR SELECT
USING (auth.uid() IS NOT NULL);

-- User mission history
CREATE TABLE public.user_mission_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  mission_id UUID NOT NULL REFERENCES public.missions(id),
  xp_earned INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  shown_home BOOLEAN NOT NULL DEFAULT false,
  shown_popup BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE public.user_mission_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own mission history"
ON public.user_mission_history FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own mission history"
ON public.user_mission_history FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own mission history"
ON public.user_mission_history FOR UPDATE
USING (auth.uid() = user_id);

-- User notifications for gamification
CREATE TABLE public.user_gamification_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL DEFAULT 'mission_complete',
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL DEFAULT 'Trophy',
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_gamification_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own gamification notifications"
ON public.user_gamification_notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own gamification notifications"
ON public.user_gamification_notifications FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own gamification notifications"
ON public.user_gamification_notifications FOR UPDATE
USING (auth.uid() = user_id);

-- User XP tracking
CREATE TABLE public.user_xp (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  total_xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_xp ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own xp"
ON public.user_xp FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own xp"
ON public.user_xp FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own xp"
ON public.user_xp FOR UPDATE
USING (auth.uid() = user_id);

CREATE TRIGGER update_user_xp_updated_at
BEFORE UPDATE ON public.user_xp
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed initial missions
INSERT INTO public.missions (key, name, description, icon, xp_reward, category, medal_type) VALUES
('first_transaction', 'Primeira Transação', 'Registre sua primeira transação financeira', 'Receipt', 50, 'beginner', 'bronze'),
('first_income', 'Primeira Receita', 'Registre sua primeira receita', 'TrendingUp', 30, 'beginner', 'bronze'),
('first_expense', 'Controle Iniciado', 'Registre sua primeira despesa', 'ShoppingBag', 30, 'beginner', 'bronze'),
('streak_3', 'Consistência Bronze', 'Acesse o app 3 dias seguidos', 'Flame', 75, 'streak', 'bronze'),
('streak_7', 'Consistência Prata', 'Acesse o app 7 dias seguidos', 'Flame', 150, 'streak', 'silver'),
('streak_30', 'Consistência Ouro', 'Acesse o app 30 dias seguidos', 'Flame', 500, 'streak', 'gold'),
('ten_transactions', 'Registrador Ativo', 'Registre 10 transações', 'ClipboardList', 100, 'progress', 'silver'),
('fifty_transactions', 'Controlador Financeiro', 'Registre 50 transações', 'ClipboardList', 300, 'progress', 'gold'),
('first_saving_goal', 'Primeira Meta', 'Crie sua primeira meta de economia', 'Target', 50, 'savings', 'bronze'),
('saving_goal_complete', 'Meta Atingida!', 'Complete uma meta de economia', 'Trophy', 200, 'savings', 'gold'),
('first_piggy_bank', 'Cofrinho Criado', 'Crie seu primeiro cofrinho', 'PiggyBank', 50, 'savings', 'bronze'),
('budget_master', 'Mestre do Orçamento', 'Termine o mês com saldo positivo', 'Crown', 250, 'mastery', 'gold');
