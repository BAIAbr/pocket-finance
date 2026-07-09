import { useState } from 'react';
import { Search, Loader2, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { CurrencyInput } from '@/components/planning/CurrencyInput';
import { formatBRL } from '@/lib/currency';
import { fetchQuote, QuoteCache } from '@/hooks/useInvestments';
import { simulatePurchase, projectPortfolio } from '@/lib/investments/calculations';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export function SimulatorPanel() {
  const [ticker, setTicker] = useState('');
  const [available, setAvailable] = useState(0);
  const [quote, setQuote] = useState<QuoteCache | null>(null);
  const [loading, setLoading] = useState(false);

  const [monthly, setMonthly] = useState(500);
  const [years, setYears] = useState(10);
  const [yieldPct, setYieldPct] = useState(0.8);
  const [growthPct, setGrowthPct] = useState(0.3);
  const [reinvest, setReinvest] = useState(true);

  const search = async () => {
    const t = ticker.trim().toUpperCase();
    if (!t) return;
    setLoading(true);
    const q = await fetchQuote(t);
    setLoading(false);
    if (!q?.price) {
      toast.error('Sem dados', { description: 'Não foi possível obter o preço atual.' });
      setQuote(null);
      return;
    }
    setQuote(q);
  };

  const sim = quote?.price ? simulatePurchase(available, quote.price) : null;

  const projection = projectPortfolio({
    monthlyContribution: monthly,
    months: years * 12,
    monthlyDividendYield: yieldPct / 100,
    monthlyPriceGrowth: growthPct / 100,
    reinvest,
  });
  const final = projection[projection.length - 1];

  return (
    <div className="space-y-5">
      <section className="p-4 rounded-2xl bg-card border border-border">
        <h3 className="font-bold mb-3 flex items-center gap-2"><Search size={16} className="text-primary" /> Simulador de compra</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Ticker</label>
            <div className="flex gap-2 mt-1">
              <input value={ticker} onChange={(e) => setTicker(e.target.value.toUpperCase())} placeholder="Ex: MXRF11"
                className="flex-1 px-3 py-2.5 rounded-xl bg-secondary/50 border border-border text-sm font-semibold uppercase" />
              <button onClick={search} disabled={loading} className="px-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Valor disponível</label>
            <CurrencyInput value={available} onChange={setAvailable} />
          </div>
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
            <p className="text-xs text-muted-foreground">Preço da cota</p>
            <p className="text-lg font-bold text-primary tabular-nums">{quote?.price ? formatBRL(quote.price) : '—'}</p>
          </div>
        </div>

        {sim && sim.shares > 0 && (
          <div className="grid grid-cols-3 gap-2 mt-4 text-center">
            <div className="p-3 rounded-xl bg-emerald-500/10">
              <p className="text-xs text-muted-foreground">Cotas possíveis</p>
              <p className="text-xl font-bold text-emerald-500 tabular-nums">{sim.shares}</p>
            </div>
            <div className="p-3 rounded-xl bg-secondary/50">
              <p className="text-xs text-muted-foreground">Valor utilizado</p>
              <p className="text-sm font-bold tabular-nums">{formatBRL(sim.used)}</p>
            </div>
            <div className="p-3 rounded-xl bg-secondary/50">
              <p className="text-xs text-muted-foreground">Saldo restante</p>
              <p className="text-sm font-bold tabular-nums">{formatBRL(sim.remaining)}</p>
            </div>
          </div>
        )}
      </section>

      <section className="p-4 rounded-2xl bg-card border border-border">
        <h3 className="font-bold mb-3 flex items-center gap-2"><TrendingUp size={16} className="text-primary" /> Projeção de patrimônio</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Aporte mensal</label>
            <CurrencyInput value={monthly} onChange={setMonthly} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Prazo (anos)</label>
            <input type="number" min={1} max={40} value={years} onChange={(e) => setYears(Math.max(1, parseInt(e.target.value || '1')))}
              className="w-full mt-1 px-3 py-2.5 rounded-xl bg-secondary/50 border border-border text-sm font-semibold tabular-nums" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">DY mensal (%)</label>
            <input type="number" step="0.1" value={yieldPct} onChange={(e) => setYieldPct(parseFloat(e.target.value || '0'))}
              className="w-full mt-1 px-3 py-2.5 rounded-xl bg-secondary/50 border border-border text-sm font-semibold tabular-nums" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Valorização mensal (%)</label>
            <input type="number" step="0.1" value={growthPct} onChange={(e) => setGrowthPct(parseFloat(e.target.value || '0'))}
              className="w-full mt-1 px-3 py-2.5 rounded-xl bg-secondary/50 border border-border text-sm font-semibold tabular-nums" />
          </div>
        </div>

        <label className="flex items-center gap-2 mt-3 text-sm cursor-pointer">
          <input type="checkbox" checked={reinvest} onChange={(e) => setReinvest(e.target.checked)} />
          Reinvestir dividendos automaticamente
        </label>

        {final && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
            <div className="p-3 rounded-xl bg-primary/10">
              <p className="text-xs text-muted-foreground">Patrimônio final</p>
              <p className="font-bold text-sm text-primary tabular-nums">{formatBRL(final.patrimony)}</p>
            </div>
            <div className="p-3 rounded-xl bg-secondary/40">
              <p className="text-xs text-muted-foreground">Total aportado</p>
              <p className="font-bold text-sm tabular-nums">{formatBRL(final.contributed)}</p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/10">
              <p className="text-xs text-muted-foreground">Provento mensal (final)</p>
              <p className="font-bold text-sm text-emerald-500 tabular-nums">{formatBRL(final.monthlyDividend)}</p>
            </div>
            <div className="p-3 rounded-xl bg-secondary/40">
              <p className="text-xs text-muted-foreground">Proventos acumulados</p>
              <p className="font-bold text-sm tabular-nums">{formatBRL(final.accumulatedDividends)}</p>
            </div>
          </div>
        )}

        <div className="h-56 mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={projection}>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: any) => formatBRL(v)} labelFormatter={(l) => `Mês ${l}`} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12 }} />
              <Line type="monotone" dataKey="patrimony" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="Patrimônio" />
              <Line type="monotone" dataKey="contributed" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} dot={false} strokeDasharray="4 4" name="Aportado" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
