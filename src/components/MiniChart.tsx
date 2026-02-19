import { useFinanceContext } from '@/contexts/FinanceContext';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';

const formatBRL = (value: number) =>
  Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const income = Number(payload.find((p: any) => p.dataKey === 'income')?.value ?? 0);
  const expense = Number(payload.find((p: any) => p.dataKey === 'expense')?.value ?? 0);
  const balance = income - expense;
  return (
    <div
      style={{
        backgroundColor: 'hsl(var(--popover))',
        border: '1px solid hsl(var(--border))',
        borderRadius: '8px',
        padding: '8px 12px',
        fontSize: '12px',
        color: 'hsl(var(--foreground))',
      }}
    >
      <p className="font-medium mb-1">{label}</p>
      <p style={{ color: 'hsl(var(--income))' }}>Entradas: {formatBRL(income)}</p>
      <p style={{ color: 'hsl(var(--expense))' }}>Saídas: {formatBRL(expense)}</p>
      <p className="mt-1 font-semibold" style={{ color: balance >= 0 ? 'hsl(142 71% 45%)' : 'hsl(0 84% 60%)' }}>
        Saldo: {formatBRL(balance)}
      </p>
    </div>
  );
};

export function MiniChart() {
  const { getMonthlyStats } = useFinanceContext();
  const allStats = getMonthlyStats(6);
  const stats = allStats.filter(s => s.income > 0 || s.expense > 0);

  if (stats.length === 0) {
    return (
      <div className="card-finance h-40 flex items-center justify-center">
        <p className="text-muted-foreground text-sm">
          Adicione transações para ver o gráfico
        </p>
      </div>
    );
  }

  return (
    <div className="card-finance">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-foreground">Últimos 6 meses</h3>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'hsl(var(--income))' }} />
            <span className="text-xs text-foreground">Entradas</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'hsl(var(--expense))' }} />
            <span className="text-xs text-foreground">Saídas</span>
          </div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={120}>
        <BarChart data={stats} barGap={2} margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
          <XAxis 
            dataKey="month" 
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'hsl(var(--foreground))', fontSize: 10 }}
          />
          <YAxis hide />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="income" radius={[4, 4, 0, 0]} name="Entradas">
            {stats.map((_, index) => (
              <Cell key={`income-${index}`} fill="hsl(var(--income))" />
            ))}
          </Bar>
          <Bar dataKey="expense" radius={[4, 4, 0, 0]} name="Saídas">
            {stats.map((_, index) => (
              <Cell key={`expense-${index}`} fill="hsl(var(--expense))" />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
