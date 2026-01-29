import { useFinanceContext } from '@/contexts/FinanceContext';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';

export function MiniChart() {
  const { getMonthlyStats } = useFinanceContext();
  const stats = getMonthlyStats(6);

  if (stats.every(s => s.income === 0 && s.expense === 0)) {
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
      <h3 className="text-sm font-medium text-muted-foreground mb-4">Últimos 6 meses</h3>
      <ResponsiveContainer width="100%" height={120}>
        <BarChart data={stats} barGap={4}>
          <XAxis 
            dataKey="month" 
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
          />
          <YAxis hide />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--popover))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            labelStyle={{ color: 'hsl(var(--foreground))' }}
          />
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
