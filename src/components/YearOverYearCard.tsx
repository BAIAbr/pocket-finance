import { useMemo } from 'react';
import { CalendarRange, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { useEffectiveFinance } from '@/hooks/useEffectiveFinance';
import { parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

type MetricKey = 'income' | 'expense' | 'balance';

export function YearOverYearCard() {
  const { transactions, formatCurrency } = useEffectiveFinance() as any;

  const now = new Date();
  const currentYear = now.getFullYear();
  const previousYear = currentYear - 1;
  const currentMonthIdx = now.getMonth();

  const yearData = useMemo(() => {
    const build = (year: number) => {
      const income = Array(12).fill(0);
      const expense = Array(12).fill(0);
      (transactions as any[]).forEach((t) => {
        try {
          const d = parseISO(t.date);
          if (d.getFullYear() !== year) return;
          const m = d.getMonth();
          const amt = Number(t.amount) || 0;
          if (t.type === 'income') income[m] += amt;
          else if (t.type === 'expense') expense[m] += amt;
        } catch { /* noop */ }
      });
      return { income, expense };
    };

    const cur = build(currentYear);
    const prev = build(previousYear);

    const chart = MONTH_LABELS.map((label, i) => ({
      month: label,
      atual: cur.income[i] - cur.expense[i],
      anterior: prev.income[i] - prev.expense[i],
    }));

    // Totals (only up to current month for a fair YoY comparison)
    const sum = (arr: number[], upTo: number) =>
      arr.slice(0, upTo + 1).reduce((s, v) => s + v, 0);

    const totals = {
      current: {
        income: sum(cur.income, currentMonthIdx),
        expense: sum(cur.expense, currentMonthIdx),
        balance: sum(cur.income, currentMonthIdx) - sum(cur.expense, currentMonthIdx),
      },
      previous: {
        income: sum(prev.income, currentMonthIdx),
        expense: sum(prev.expense, currentMonthIdx),
        balance: sum(prev.income, currentMonthIdx) - sum(prev.expense, currentMonthIdx),
      },
    };

    return { chart, totals };
  }, [transactions, currentYear, previousYear, currentMonthIdx]);

  const hasCurrentData = yearData.chart.some(c => c.atual !== 0);
  const hasPreviousData = yearData.chart.some(c => c.anterior !== 0);

  const deltaPct = (a: number, b: number) => {
    if (b === 0) return a === 0 ? 0 : 100;
    return Math.round(((a - b) / Math.abs(b)) * 100);
  };

  const deltas = {
    income: deltaPct(yearData.totals.current.income, yearData.totals.previous.income),
    expense: deltaPct(yearData.totals.current.expense, yearData.totals.previous.expense),
    balance: deltaPct(yearData.totals.current.balance, yearData.totals.previous.balance),
  };

  const metrics: { key: MetricKey; label: string; goodWhenUp: boolean }[] = [
    { key: 'income', label: 'Entradas', goodWhenUp: true },
    { key: 'expense', label: 'Gastos', goodWhenUp: false },
    { key: 'balance', label: 'Saldo', goodWhenUp: true },
  ];

  return (
    <div className="card-finance">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
            <CalendarRange size={16} />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Comparativo Ano vs Ano</h3>
            <p className="text-[11px] text-muted-foreground">
              {currentYear} vs {previousYear} · acumulado até {MONTH_LABELS[currentMonthIdx]}
            </p>
          </div>
        </div>
      </div>

      {/* Metric tiles */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {metrics.map(m => {
          const cur = yearData.totals.current[m.key];
          const prev = yearData.totals.previous[m.key];
          const d = deltas[m.key];
          const isFlat = d === 0;
          const positive = m.goodWhenUp ? d > 0 : d < 0;
          const tone = isFlat
            ? 'text-muted-foreground bg-secondary'
            : positive
              ? 'text-income bg-income/10'
              : 'text-expense bg-expense/10';
          const Icon = isFlat ? Minus : d > 0 ? TrendingUp : TrendingDown;
          return (
            <div key={m.key} className="rounded-xl bg-secondary/40 p-2.5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{m.label}</p>
              <p className="text-sm font-bold mt-0.5 truncate">{formatCurrency(cur)}</p>
              <div className="flex items-center gap-1 mt-1">
                <span className={cn('inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full', tone)}>
                  <Icon size={10} />
                  {isFlat ? '0%' : `${d > 0 ? '+' : ''}${d}%`}
                </span>
                <span className="text-[10px] text-muted-foreground truncate">
                  vs {formatCurrency(prev)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Chart */}
      {!hasCurrentData && !hasPreviousData ? (
        <p className="py-6 text-center text-xs text-muted-foreground">
          Sem dados suficientes para comparar os anos ainda.
        </p>
      ) : (
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={yearData.chart} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => {
                const n = Number(v);
                if (Math.abs(n) >= 1000) return `${Math.round(n / 1000)}k`;
                return String(n);
              }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(v: any) => formatCurrency(Number(v))}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} iconSize={8} />
              <Bar dataKey="anterior" name={String(previousYear)} fill="hsl(var(--muted-foreground) / 0.4)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="atual" name={String(currentYear)} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
