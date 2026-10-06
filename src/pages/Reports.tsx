import { useState, useMemo } from 'react';
import { useEffectiveFinance } from '@/hooks/useEffectiveFinance';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, PiggyBank, ArrowUpRight, ArrowDownRight, Minus, BarChart3 } from 'lucide-react';
import { format, subMonths, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Cell, PieChart, Pie } from 'recharts';
import { getIconByName } from '@/lib/icons';
import { cn } from '@/lib/utils';

export default function Reports() {
  const { getCategoryStats, getMonthlyStats, formatCurrency, getTransactionsForMonth, isFamily } = useEffectiveFinance();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');

  const monthTransactions = getTransactionsForMonth(selectedDate);
  const prevTransactions = getTransactionsForMonth(subMonths(selectedDate, 1));
  const categoryStats = getCategoryStats(selectedDate, activeTab);
  const monthlyStats = getMonthlyStats(6);

  const sum = (list: any[], type: string) => list.filter(t => t.type === type).reduce((s, t) => s + Number(t.amount), 0);

  const totals = useMemo(() => {
    const income = sum(monthTransactions, 'income');
    const expense = sum(monthTransactions, 'expense');
    return { income, expense, balance: income - expense };
  }, [monthTransactions]);

  const prev = useMemo(() => ({
    income: sum(prevTransactions, 'income'),
    expense: sum(prevTransactions, 'expense'),
    count: prevTransactions.length,
  }), [prevTransactions]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setSelectedDate(p => direction === 'prev' ? subMonths(p, 1) : addMonths(p, 1));
  };

  const COLORS = categoryStats.map(c => c.color);
  const hasChart = monthlyStats.some(s => s.income > 0 || s.expense > 0);
  const prevLabel = format(subMonths(selectedDate, 1), 'MMMM', { locale: ptBR });

  return (
    <div className="min-h-screen bg-background pb-24 safe-top">
      <header className="px-4 pt-6 pb-4 max-w-5xl mx-auto">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-primary border border-primary/30 bg-primary/10 rounded px-1.5 py-0.5">
          Análise financeira
        </span>
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight mt-2">
          {isFamily ? 'Relatórios Familiares' : 'Relatórios'}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Entenda seus hábitos financeiros e acompanhe sua evolução.</p>
      </header>

      <main className="px-4 space-y-4 max-w-5xl mx-auto">
        {/* Period (existing month navigation) */}
        <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-1.5">
          <button onClick={() => navigateMonth('prev')} aria-label="Mês anterior" className="w-10 h-10 rounded-xl hover:bg-secondary flex items-center justify-center touch-scale">
            <ChevronLeft size={20} />
          </button>
          <div className="text-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Período</p>
            <span className="font-semibold capitalize">{format(selectedDate, 'MMMM yyyy', { locale: ptBR })}</span>
          </div>
          <button onClick={() => navigateMonth('next')} aria-label="Próximo mês" className="w-10 h-10 rounded-xl hover:bg-secondary flex items-center justify-center touch-scale">
            <ChevronRight size={20} />
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <Kpi label="Entradas" icon={<TrendingUp size={14} className="text-income" />} value={formatCurrency(totals.income)} cls="text-income"
            delta={<Delta cur={totals.income} prev={prev.income} hasPrev={prev.count > 0} good="up" prevLabel={prevLabel} />} />
          <Kpi label="Saídas" icon={<TrendingDown size={14} className="text-expense" />} value={formatCurrency(totals.expense)} cls="text-expense"
            delta={<Delta cur={totals.expense} prev={prev.expense} hasPrev={prev.count > 0} good="down" prevLabel={prevLabel} />} />
          <Kpi className="col-span-2 lg:col-span-1" label="Economia do mês" icon={<PiggyBank size={14} className="text-primary" />}
            value={formatCurrency(totals.balance)} cls={totals.balance >= 0 ? 'text-income' : 'text-expense'}
            delta={totals.income > 0 ? <span className="font-mono text-[11px] text-muted-foreground">{((totals.balance / totals.income) * 100).toFixed(1)}% das entradas</span> : null} />
        </div>

        <div className="grid lg:grid-cols-5 gap-4">
          {/* Monthly comparison */}
          <section className="lg:col-span-3 rounded-2xl border border-border bg-card p-4">
            <SectionTitle title="Evolução mensal" sub="Entradas e saídas · últimos 6 meses" />
            {hasChart ? (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={monthlyStats} barGap={4}>
                    <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                    <YAxis hide />
                    <Tooltip
                      cursor={{ fill: 'hsl(var(--secondary) / 0.5)' }}
                      contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '10px', fontSize: '12px', color: 'hsl(var(--foreground))' }}
                      labelStyle={{ color: 'hsl(var(--foreground))' }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Bar dataKey="income" radius={[4, 4, 0, 0]} name="Entradas" fill="hsl(var(--income))" />
                    <Bar dataKey="expense" radius={[4, 4, 0, 0]} name="Saídas" fill="hsl(var(--expense))" />
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-income" />Entradas</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-expense" />Saídas</span>
                </div>
              </>
            ) : <Empty />}
          </section>

          {/* Category breakdown */}
          <section className="lg:col-span-2 rounded-2xl border border-border bg-card p-4">
            <SectionTitle title="Por categoria" sub="Distribuição no mês selecionado" />
            <div className="flex gap-1 p-1 bg-secondary rounded-xl mb-4">
              {(['expense', 'income'] as const).map(t => (
                <button key={t} onClick={() => setActiveTab(t)}
                  className={cn('flex-1 py-2 rounded-lg font-medium transition-all text-sm',
                    activeTab === t ? 'bg-card text-foreground shadow-sm border border-border' : 'text-muted-foreground')}>
                  {t === 'expense' ? 'Saídas' : 'Entradas'}
                </button>
              ))}
            </div>

            {categoryStats.length > 0 ? (
              <>
                <div className="flex justify-center mb-4">
                  <ResponsiveContainer width={170} height={170}>
                    <PieChart>
                      <Pie data={categoryStats} cx="50%" cy="50%" innerRadius={52} outerRadius={78} paddingAngle={2} dataKey="total" stroke="hsl(var(--card))">
                        {categoryStats.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index]} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="space-y-2.5">
                  {categoryStats.map(stat => {
                    const IconComponent = getIconByName(stat.icon);
                    return (
                      <li key={stat.categoryId}>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${stat.color}20` }}>
                            <IconComponent size={16} style={{ color: stat.color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{stat.categoryName}</p>
                            <p className="font-mono text-[11px] text-muted-foreground">
                              {stat.count} transaç{stat.count === 1 ? 'ão' : 'ões'} · {stat.percentage.toFixed(1)}%
                            </p>
                          </div>
                          <span className="font-mono text-sm font-semibold tabular-nums shrink-0">{formatCurrency(stat.total)}</span>
                        </div>
                        <div className="h-1 rounded-full bg-secondary mt-2 ml-11 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${Math.min(100, stat.percentage)}%`, backgroundColor: stat.color }} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </>
            ) : <Empty text={isFamily ? 'Nenhuma transação compartilhada neste mês.' : 'Nenhuma transação neste mês.'} />}
          </section>
        </div>
      </main>
    </div>
  );
}

function Kpi({ label, icon, value, cls, delta, className }: { label: string; icon: React.ReactNode; value: string; cls: string; delta?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-2xl border border-border bg-card p-4 min-w-0', className)}>
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground flex items-center gap-1.5">{icon}{label}</p>
      <p className={cn('font-mono font-semibold text-lg lg:text-xl tabular-nums truncate mt-1.5', cls)}>{value}</p>
      {delta && <div className="mt-1">{delta}</div>}
    </div>
  );
}

function Delta({ cur, prev, hasPrev, good, prevLabel }: { cur: number; prev: number; hasPrev: boolean; good: 'up' | 'down'; prevLabel: string }) {
  if (!hasPrev || prev === 0) return <span className="font-mono text-[11px] text-muted-foreground">Sem base para comparar</span>;
  const pct = ((cur - prev) / prev) * 100;
  const stable = Math.abs(pct) < 1;
  const up = pct > 0;
  const positive = good === 'up' ? up : !up;
  const Icon = stable ? Minus : up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn('font-mono text-[11px] flex items-center gap-0.5 tabular-nums',
      stable ? 'text-muted-foreground' : positive ? 'text-income' : 'text-expense')}>
      <Icon size={12} />{stable ? 'Estável' : `${Math.abs(pct).toFixed(1)}%`} <span className="text-muted-foreground ml-1 truncate">vs. {prevLabel}</span>
    </span>
  );
}

function SectionTitle({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mb-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

function Empty({ text = 'Ainda não há dados suficientes para gerar este relatório.' }: { text?: string }) {
  return (
    <div className="py-10 flex flex-col items-center text-center gap-2">
      <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground"><BarChart3 size={18} /></div>
      <p className="text-sm text-muted-foreground max-w-xs">{text}</p>
    </div>
  );
}
