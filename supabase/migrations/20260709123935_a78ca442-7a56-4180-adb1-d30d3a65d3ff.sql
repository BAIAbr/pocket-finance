
-- Investments module: assets, transactions, dividends, quotes cache

CREATE TABLE public.investment_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  ticker TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('fii','stock','etf','fixed_income')),
  name TEXT,
  segment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, ticker, type)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.investment_assets TO authenticated;
GRANT ALL ON public.investment_assets TO service_role;
ALTER TABLE public.investment_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own assets select" ON public.investment_assets FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own assets insert" ON public.investment_assets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own assets update" ON public.investment_assets FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own assets delete" ON public.investment_assets FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER trg_investment_assets_upd BEFORE UPDATE ON public.investment_assets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.investment_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  asset_id UUID NOT NULL REFERENCES public.investment_assets(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('buy','sell')),
  quantity NUMERIC(20,8) NOT NULL,
  unit_price NUMERIC(20,4) NOT NULL,
  total NUMERIC(20,4) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.investment_transactions TO authenticated;
GRANT ALL ON public.investment_transactions TO service_role;
ALTER TABLE public.investment_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own inv tx select" ON public.investment_transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own inv tx insert" ON public.investment_transactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own inv tx update" ON public.investment_transactions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own inv tx delete" ON public.investment_transactions FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX idx_inv_tx_user_asset ON public.investment_transactions(user_id, asset_id);

CREATE TABLE public.investment_dividends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  asset_id UUID NOT NULL REFERENCES public.investment_assets(id) ON DELETE CASCADE,
  amount NUMERIC(20,4) NOT NULL,
  pay_date DATE NOT NULL,
  com_date DATE,
  type TEXT NOT NULL DEFAULT 'dividend' CHECK (type IN ('dividend','jcp','rendimento')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.investment_dividends TO authenticated;
GRANT ALL ON public.investment_dividends TO service_role;
ALTER TABLE public.investment_dividends ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own inv div select" ON public.investment_dividends FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own inv div insert" ON public.investment_dividends FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own inv div update" ON public.investment_dividends FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own inv div delete" ON public.investment_dividends FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX idx_inv_div_user_asset ON public.investment_dividends(user_id, asset_id);

CREATE TABLE public.market_quotes_cache (
  ticker TEXT NOT NULL PRIMARY KEY,
  name TEXT,
  price NUMERIC(20,4),
  last_dividend NUMERIC(20,4),
  dividend_yield NUMERIC(10,4),
  segment TEXT,
  liquidity NUMERIC(20,4),
  com_date DATE,
  pay_date DATE,
  patrimonial_value NUMERIC(20,4),
  provider TEXT,
  raw JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.market_quotes_cache TO authenticated;
GRANT ALL ON public.market_quotes_cache TO service_role;
ALTER TABLE public.market_quotes_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quotes readable auth" ON public.market_quotes_cache FOR SELECT TO authenticated USING (true);
