import { useState, useMemo } from 'react';
import { useFinanceContext } from '@/contexts/FinanceContext';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react';
import { format, subMonths, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, PieChart, Pie } from 'recharts';
import { getIconByName } from '@/lib/icons';
import { cn } from '@/lib/utils';

export default function Reports() {
  const { getCategoryStats, getMonthlyStats, formatCurrency, getTransactionsForMonth } = useFinanceContext();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');

  const monthTransactions = getTransactionsForMonth(selectedDate);
  const categoryStats = getCategoryStats(selectedDate, activeTab);
  const monthlyStats = getMonthlyStats(6);

  const totals = useMemo(() => {
    const income = monthTransactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
    const expense = monthTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
    return { income, expense, balance: income - expense };
  }, [monthTransactions]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setSelectedDate(prev => direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1));
  };

  // Custom colors for pie chart
  const COLORS = categoryStats.map(c => c.color);

  return (
    <div className="min-h-screen bg-background pb-24 safe-top">
      {/* Header */}
      <header className="px-4 pt-6 pb-4">
        <h1 className="text-2xl font-bold">Relatórios</h1>
      </header>

      <main className="px-4 space-y-6">
        {/* Month Selector */}
        <div className="flex items-center justify-between card-finance">
          <button 
            onClick={() => navigateMonth('prev')}
            className="p-2 rounded-full hover:bg-secondary touch-scale"
          >
            <ChevronLeft size={24} />
          </button>
          <span className="font-semibold text-lg capitalize">
            {format(selectedDate, 'MMMM yyyy', { locale: ptBR })}
          </span>
          <button 
            onClick={() => navigateMonth('next')}
            className="p-2 rounded-full hover:bg-secondary touch-scale"
          >
            <ChevronRight size={24} />
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="card-finance">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={16} className="text-income" />
              <span className="text-sm text-muted-foreground">Entradas</span>
            </div>
            <p className="font-mono text-xl font-bold text-income">
              {formatCurrency(totals.income)}
            </p>
          </div>
          <div className="card-finance">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown size={16} className="text-expense" />
              <span className="text-sm text-muted-foreground">Saídas</span>
            </div>
            <p className="font-mono text-xl font-bold text-expense">
              {formatCurrency(totals.expense)}
            </p>
          </div>
        </div>

        {/* Monthly Comparison Chart */}
        <div className="card-finance">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">Comparação Mensal</h3>
          {monthlyStats.some(s => s.income > 0 || s.expense > 0) ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={monthlyStats} barGap={4}>
                <XAxis 
                  dataKey="month" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Bar dataKey="income" radius={[4, 4, 0, 0]} name="Entradas">
                  {monthlyStats.map((_, index) => (
                    <Cell key={`income-${index}`} fill="hsl(var(--income))" />
                  ))}
                </Bar>
                <Bar dataKey="expense" radius={[4, 4, 0, 0]} name="Saídas">
                  {monthlyStats.map((_, index) => (
                    <Cell key={`expense-${index}`} fill="hsl(var(--expense))" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">
              Sem dados para exibir
            </div>
          )}
        </div>

        {/* Category Breakdown */}
        <div className="card-finance">
          {/* Tabs */}
          <div className="flex gap-2 p-1 bg-secondary rounded-xl mb-4">
            <button
              onClick={() => setActiveTab('expense')}
              className={cn(
                'flex-1 py-2 rounded-lg font-medium transition-all text-sm',
                activeTab === 'expense' 
                  ? 'bg-destructive text-destructive-foreground' 
                  : 'text-muted-foreground'
              )}
            >
              Saídas
            </button>
            <button
              onClick={() => setActiveTab('income')}
              className={cn(
                'flex-1 py-2 rounded-lg font-medium transition-all text-sm',
                activeTab === 'income' 
                  ? 'bg-success text-success-foreground' 
                  : 'text-muted-foreground'
              )}
            >
              Entradas
            </button>
          </div>

          {categoryStats.length > 0 ? (
            <>
              {/* Pie Chart */}
              <div className="flex justify-center mb-4">
                <ResponsiveContainer width={180} height={180}>
                  <PieChart>
                    <Pie
                      data={categoryStats}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="total"
                    >
                      {categoryStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Category List */}
              <div className="space-y-2">
                {categoryStats.map(stat => {
                  const IconComponent = getIconByName(stat.icon);
                  return (
                    <div key={stat.categoryId} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: `${stat.color}20` }}
                      >
                        <IconComponent size={20} style={{ color: stat.color }} />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{stat.categoryName}</p>
                        <p className="text-xs text-muted-foreground">
                          {stat.count} transaç{stat.count === 1 ? 'ão' : 'ões'} • {stat.percentage.toFixed(1)}%
                        </p>
                      </div>
                      <span className="font-mono font-semibold" style={{ color: stat.color }}>
                        {formatCurrency(stat.total)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="py-8 text-center text-muted-foreground text-sm">
              Nenhuma transação neste mês
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
