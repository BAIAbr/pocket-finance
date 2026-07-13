
-- ============ import_history ============
CREATE TABLE public.import_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  family_id uuid,
  file_name text NOT NULL,
  file_type text NOT NULL CHECK (file_type IN ('ofx','csv','xlsx')),
  bank_detected text,
  records_total integer NOT NULL DEFAULT 0,
  records_imported integer NOT NULL DEFAULT 0,
  records_duplicated integer NOT NULL DEFAULT 0,
  income_total numeric NOT NULL DEFAULT 0,
  expense_total numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','success','error','partial')),
  error_message text,
  raw_summary jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.import_history TO authenticated;
GRANT ALL ON public.import_history TO service_role;
ALTER TABLE public.import_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own import_history select" ON public.import_history
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own import_history insert" ON public.import_history
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "own import_history update" ON public.import_history
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own import_history delete" ON public.import_history
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER trg_import_history_updated
  BEFORE UPDATE ON public.import_history
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ import_rules ============
CREATE TABLE public.import_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pattern text NOT NULL,
  category_id uuid REFERENCES public.categories(id) ON DELETE CASCADE,
  match_type text NOT NULL DEFAULT 'contains' CHECK (match_type IN ('contains','equals','regex')),
  hits integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, pattern)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.import_rules TO authenticated;
GRANT ALL ON public.import_rules TO service_role;
ALTER TABLE public.import_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own import_rules all" ON public.import_rules
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TRIGGER trg_import_rules_updated
  BEFORE UPDATE ON public.import_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ imported_transactions_map ============
CREATE TABLE public.imported_transactions_map (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE CASCADE,
  import_id uuid REFERENCES public.import_history(id) ON DELETE CASCADE,
  external_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, external_hash)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.imported_transactions_map TO authenticated;
GRANT ALL ON public.imported_transactions_map TO service_role;
ALTER TABLE public.imported_transactions_map ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own imported_map all" ON public.imported_transactions_map
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============ transactions: rastreabilidade ============
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS import_id uuid REFERENCES public.import_history(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual';

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.import_history;
