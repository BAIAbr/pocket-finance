import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { computeAssetMetrics, AssetMetrics } from '@/lib/investments/calculations';

export type AssetType = 'fii' | 'stock' | 'etf' | 'fixed_income';

export interface InvestmentAsset {
  id: string;
  user_id: string;
  ticker: string;
  type: AssetType;
  name: string | null;
  segment: string | null;
  created_at: string;
}

export interface InvestmentTx {
  id: string;
  asset_id: string;
  kind: 'buy' | 'sell';
  quantity: number;
  unit_price: number;
  total: number;
  date: string;
  notes: string | null;
  created_at: string;
}

export interface InvestmentDividend {
  id: string;
  asset_id: string;
  amount: number;
  pay_date: string;
  com_date: string | null;
  type: 'dividend' | 'jcp' | 'rendimento';
  created_at: string;
}

export interface QuoteCache {
  ticker: string;
  name: string | null;
  price: number | null;
  last_dividend: number | null;
  dividend_yield: number | null;
  segment: string | null;
  updated_at: string;
}

export function useInvestments() {
  const { user } = useAuth();
  const uid = user?.id ?? null;
  const [assets, setAssets] = useState<InvestmentAsset[]>([]);
  const [transactions, setTransactions] = useState<InvestmentTx[]>([]);
  const [dividends, setDividends] = useState<InvestmentDividend[]>([]);
  const [quotes, setQuotes] = useState<Record<string, QuoteCache>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!uid) { setLoading(false); return; }
    setLoading(true);
    const [a, t, d] = await Promise.all([
      supabase.from('investment_assets').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
      supabase.from('investment_transactions').select('*').eq('user_id', uid).order('date', { ascending: false }),
      supabase.from('investment_dividends').select('*').eq('user_id', uid).order('pay_date', { ascending: false }),
    ]);
    setAssets((a.data ?? []) as any);
    setTransactions((t.data ?? []).map((x: any) => ({
      ...x, quantity: Number(x.quantity), unit_price: Number(x.unit_price), total: Number(x.total),
    })));
    setDividends((d.data ?? []).map((x: any) => ({ ...x, amount: Number(x.amount) })));
    setLoading(false);
  }, [uid]);

  useEffect(() => { load(); }, [load]);

  const refreshQuotes = useCallback(async (tickers?: string[]) => {
    const list = tickers ?? assets.map((a) => a.ticker);
    if (list.length === 0) return;
    try {
      const { data, error } = await supabase.functions.invoke('market-quote', {
        body: { tickers: list },
      });
      if (error) throw error;
      const map: Record<string, QuoteCache> = { ...quotes };
      (data?.quotes ?? []).forEach((q: any) => { map[q.ticker] = q; });
      setQuotes(map);
    } catch (e) {
      console.error('refreshQuotes error', e);
    }
  }, [assets, quotes]);

  useEffect(() => {
    if (!loading && assets.length > 0) {
      refreshQuotes(assets.map((a) => a.ticker));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, assets.length]);

  const addAsset = async (input: { ticker: string; type: AssetType; name?: string; segment?: string }) => {
    if (!uid) return null;
    const ticker = input.ticker.trim().toUpperCase();
    const { data, error } = await supabase.from('investment_assets').upsert({
      user_id: uid, ticker, type: input.type, name: input.name ?? null, segment: input.segment ?? null,
    }, { onConflict: 'user_id,ticker,type' }).select().single();
    if (error) throw error;
    await load();
    return data;
  };

  const addContribution = async (input: {
    asset_id: string; kind?: 'buy' | 'sell'; quantity: number; unit_price: number; date?: string; notes?: string;
  }) => {
    if (!uid) return null;
    const total = input.quantity * input.unit_price;
    const { error } = await supabase.from('investment_transactions').insert({
      user_id: uid,
      asset_id: input.asset_id,
      kind: input.kind ?? 'buy',
      quantity: input.quantity,
      unit_price: input.unit_price,
      total,
      date: input.date ?? new Date().toISOString().slice(0, 10),
      notes: input.notes ?? null,
    });
    if (error) throw error;
    await load();
  };

  const addDividend = async (input: { asset_id: string; amount: number; pay_date: string; type?: 'dividend' | 'jcp' | 'rendimento'; com_date?: string; }) => {
    if (!uid) return null;
    const { error } = await supabase.from('investment_dividends').insert({
      user_id: uid,
      asset_id: input.asset_id,
      amount: input.amount,
      pay_date: input.pay_date,
      com_date: input.com_date ?? null,
      type: input.type ?? 'dividend',
    });
    if (error) throw error;
    await load();
  };

  const deleteAsset = async (id: string) => {
    if (!uid) return;
    await supabase.from('investment_assets').delete().eq('id', id).eq('user_id', uid);
    await load();
  };

  const assetsWithMetrics = useMemo(() => {
    return assets.map((a) => {
      const txs = transactions.filter((t) => t.asset_id === a.id);
      const divs = dividends.filter((d) => d.asset_id === a.id);
      const q = quotes[a.ticker];
      const metrics: AssetMetrics = computeAssetMetrics(
        txs.map((t) => ({ kind: t.kind, quantity: t.quantity, unit_price: t.unit_price, total: t.total, date: t.date })),
        divs.map((d) => ({ amount: d.amount, pay_date: d.pay_date })),
        q?.price ?? null,
      );
      return { asset: a, quote: q, metrics };
    });
  }, [assets, transactions, dividends, quotes]);

  const portfolio = useMemo(() => {
    const totalInvested = assetsWithMetrics.reduce((s, x) => s + x.metrics.invested, 0);
    const totalPatrimony = assetsWithMetrics.reduce((s, x) => s + x.metrics.patrimony, 0);
    const totalProfit = totalPatrimony - totalInvested;
    const totalProfitPct = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;
    const totalDividendsAll = dividends.reduce((s, d) => s + Number(d.amount || 0), 0);
    const now = new Date();
    const monthlyDividends = dividends
      .filter((d) => {
        const dt = new Date(d.pay_date);
        return dt.getFullYear() === now.getFullYear() && dt.getMonth() === now.getMonth();
      })
      .reduce((s, d) => s + Number(d.amount || 0), 0);
    const yearlyDividends = dividends
      .filter((d) => new Date(d.pay_date).getFullYear() === now.getFullYear())
      .reduce((s, d) => s + Number(d.amount || 0), 0);
    const best = [...assetsWithMetrics].filter((x) => x.metrics.invested > 0).sort((a, b) => b.metrics.profitPct - a.metrics.profitPct)[0] ?? null;
    const worst = [...assetsWithMetrics].filter((x) => x.metrics.invested > 0).sort((a, b) => a.metrics.profitPct - b.metrics.profitPct)[0] ?? null;
    const portfolioDy = totalPatrimony > 0 ? (yearlyDividends / totalPatrimony) * 100 : 0;
    return {
      totalInvested,
      totalPatrimony,
      totalProfit,
      totalProfitPct,
      totalDividendsAll,
      monthlyDividends,
      yearlyDividends,
      portfolioDy,
      best,
      worst,
    };
  }, [assetsWithMetrics, dividends]);

  return {
    loading,
    assets,
    transactions,
    dividends,
    quotes,
    assetsWithMetrics,
    portfolio,
    addAsset,
    addContribution,
    addDividend,
    deleteAsset,
    refreshQuotes,
    reload: load,
  };
}

export async function fetchQuote(ticker: string): Promise<QuoteCache | null> {
  try {
    const { data, error } = await supabase.functions.invoke('market-quote', {
      body: { ticker: ticker.toUpperCase() },
    });
    if (error) throw error;
    return data?.quotes?.[0] ?? null;
  } catch (e) {
    console.error('fetchQuote error', e);
    return null;
  }
}
