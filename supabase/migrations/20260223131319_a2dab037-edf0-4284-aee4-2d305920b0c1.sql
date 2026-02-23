
-- ====== TABLE: families ======
CREATE TABLE public.families (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  created_by uuid NOT NULL,
  plano text NOT NULL DEFAULT 'free',
  invite_code text NOT NULL DEFAULT upper(substr(md5(random()::text), 1, 8)),
  ai_enabled boolean NOT NULL DEFAULT false,
  auto_share boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(invite_code)
);

-- ====== TABLE: family_members ======
CREATE TABLE public.family_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member',
  permissions jsonb NOT NULL DEFAULT '{}',
  privacy_settings jsonb NOT NULL DEFAULT '{"auto_share": false, "hidden_categories": [], "show_creator": true, "allow_ai_analysis": true}',
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(family_id, user_id)
);

CREATE INDEX idx_family_members_family ON public.family_members(family_id);
CREATE INDEX idx_family_members_user ON public.family_members(user_id);

-- ====== TABLE: shared_transactions ======
CREATE TABLE public.shared_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  shared_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(family_id, transaction_id)
);

CREATE INDEX idx_shared_transactions_family ON public.shared_transactions(family_id);
CREATE INDEX idx_shared_transactions_created ON public.shared_transactions(created_at);

-- ====== TABLE: family_goals ======
CREATE TABLE public.family_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  nome text NOT NULL,
  descricao text,
  valor_objetivo numeric NOT NULL DEFAULT 0,
  valor_atual numeric NOT NULL DEFAULT 0,
  prazo date,
  status text NOT NULL DEFAULT 'ativa',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_family_goals_family ON public.family_goals(family_id);

-- ====== TABLE: family_insights ======
CREATE TABLE public.family_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  tipo text NOT NULL DEFAULT 'mensal',
  conteudo text NOT NULL,
  impacto_estimado text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_family_insights_family ON public.family_insights(family_id);
CREATE INDEX idx_family_insights_created ON public.family_insights(created_at);

-- ====== ENABLE RLS ======
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_insights ENABLE ROW LEVEL SECURITY;

-- ====== RLS: families ======
CREATE POLICY "Members can view their family"
  ON public.families FOR SELECT
  USING (
    id IN (SELECT family_id FROM public.family_members WHERE user_id = auth.uid())
    OR created_by = auth.uid()
  );

CREATE POLICY "Users can create families"
  ON public.families FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Family admins can update"
  ON public.families FOR UPDATE
  USING (
    id IN (SELECT family_id FROM public.family_members WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Family creator can delete"
  ON public.families FOR DELETE
  USING (created_by = auth.uid());

-- ====== RLS: family_members ======
CREATE POLICY "Members can view family members"
  ON public.family_members FOR SELECT
  USING (
    family_id IN (SELECT fm.family_id FROM public.family_members fm WHERE fm.user_id = auth.uid())
  );

CREATE POLICY "Users can join families"
  ON public.family_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update members"
  ON public.family_members FOR UPDATE
  USING (
    family_id IN (SELECT fm.family_id FROM public.family_members fm WHERE fm.user_id = auth.uid() AND fm.role = 'admin')
    OR user_id = auth.uid()
  );

CREATE POLICY "Admins can remove members"
  ON public.family_members FOR DELETE
  USING (
    family_id IN (SELECT fm.family_id FROM public.family_members fm WHERE fm.user_id = auth.uid() AND fm.role = 'admin')
    OR user_id = auth.uid()
  );

-- ====== RLS: shared_transactions ======
CREATE POLICY "Family members can view shared transactions"
  ON public.shared_transactions FOR SELECT
  USING (
    family_id IN (SELECT family_id FROM public.family_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can share transactions"
  ON public.shared_transactions FOR INSERT
  WITH CHECK (
    auth.uid() = shared_by
    AND family_id IN (SELECT family_id FROM public.family_members WHERE user_id = auth.uid() AND role IN ('admin', 'member'))
  );

CREATE POLICY "Members can unshare own transactions"
  ON public.shared_transactions FOR DELETE
  USING (shared_by = auth.uid());

-- ====== RLS: family_goals ======
CREATE POLICY "Family members can view goals"
  ON public.family_goals FOR SELECT
  USING (
    family_id IN (SELECT family_id FROM public.family_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can create goals"
  ON public.family_goals FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    AND family_id IN (SELECT family_id FROM public.family_members WHERE user_id = auth.uid() AND role IN ('admin', 'member'))
  );

CREATE POLICY "Members can update goals"
  ON public.family_goals FOR UPDATE
  USING (
    family_id IN (SELECT family_id FROM public.family_members WHERE user_id = auth.uid() AND role IN ('admin', 'member'))
  );

CREATE POLICY "Admins can delete goals"
  ON public.family_goals FOR DELETE
  USING (
    family_id IN (SELECT family_id FROM public.family_members WHERE user_id = auth.uid() AND role = 'admin')
  );

-- ====== RLS: family_insights ======
CREATE POLICY "Family members can view insights"
  ON public.family_insights FOR SELECT
  USING (
    family_id IN (SELECT family_id FROM public.family_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can insert insights"
  ON public.family_insights FOR INSERT
  WITH CHECK (
    family_id IN (SELECT family_id FROM public.family_members WHERE user_id = auth.uid() AND role = 'admin')
  );

-- ====== Triggers ======
CREATE TRIGGER update_families_updated_at
  BEFORE UPDATE ON public.families
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_family_goals_updated_at
  BEFORE UPDATE ON public.family_goals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
