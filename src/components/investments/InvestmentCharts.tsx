import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { InvestmentAsset, InvestmentDividend, QuoteCache } from '@/hooks/useInvestments';
import { AssetMetrics } from '@/lib/investments/calculations';
import { formatBRL } from '@/lib/currency';

const COLORS = ['hsl(var(--primary))', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#F472B6', '#84CC16'];

interface Props {
  data: { asset: InvestmentAsset; quote?: QuoteCache; metrics: AssetMetrics }[];
  dividends: InvestmentDividend[];
}

export function InvestmentCharts({ data, dividends }: Props) {
  const allocation = useMemo(() =>
    data.filter((d) => d.metrics.patrimony > 0).map((d) => ({ name: d.asset.ticker, value: d.metrics.patrimony })),
  [data]);

  const monthlyDividends = useMemo(() => {
    const map: Record<string, number> = {};
    dividends.forEach((d) => {
      const k = d.pay_date.slice(0, 7);
      map[k] = (map[k] ?? 0) + Number(d.amount);
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, value]) => ({ month: month.slice(5) + '/' + month.slice(2, 4), value }));
  }, [dividends]);

  if (allocation.length === 0 && monthlyDividends.length === 0) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {allocation.length > 0 && (
        <div className="p-4 rounded-2xl bg-card border border-border">
          <h3 className="font-bold text-sm mb-2">Distribuição da carteira</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={allocation} dataKey="value" nameKey="name" innerRadius={40} outerRadius={80} paddingAngle={2}>
                  {allocation.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => formatBRL(v)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {monthlyDividends.length > 0 && (
        <div className="p-4 rounded-2xl bg-card border border-border">
          <h3 className="font-bold text-sm mb-2">Proventos mensais</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyDividends}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${v.toFixed(0)}`} />
                <Tooltip formatter={(v: any) => formatBRL(v)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12 }} />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
