import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, PiggyBank, ChevronRight, BarChart3 } from 'lucide-react';
import { useEffectiveFinance } from '@/hooks/useEffectiveFinance';
import { getIconComponent } from '@/lib/icons';
import { cn } from '@/lib/utils';

export function MonthlySummaryCard() {
  const {
    currentMonthStats,
    getTransactionsForMonth,
    getCategoryStats,
    formatCurrency,
  } = useEffectiveFinance() as any;
  const navigate = useNavigate();

  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const prevStats = useMemo(() => {
    const tx = getTransactionsForMonth(prev);
    const income = tx.filter((t: any) => t.type === 'income').reduce((s: number, t: any) => s + Number(t.amount), 0);
    const expense = tx.filter((t: any) => t.type === 'expense').reduce((s: number, t: any) => s + Number(t.amount), 0);
    return { income, expense };
  }, [getTransactionsForMonth]);

  const income = currentMonthStats.income as number;
  const expense = currentMonthStats.expense as number;
  const balance = currentMonthStats.balance as number;
  const savingsRate = income > 0 ? Math.max(0, Math.round(((income - expense) / income) * 100)) : 0;

  const expenseDelta = prevStats.expense > 0 ? ((expense - prevStats.expense) / prevStats.expense) * 100 : 0;
  const incomeDelta = prevStats.income > 0 ? ((income - prevStats.income) / prevStats.income) * 100 : 0;

  const topCategories = useMemo(() => (getCategoryStats(now, 'expense') as any[]).slice(0, 3), [getCategoryStats]);

  return (
    <div className="card-finance">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
            <BarChart3 size={16} className="text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm capitalize">Resumo do mês</h3>
            <p className="text-[11px] text-muted-foreground capitalize">{currentMonthStats.month}</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/reports')}
          className="text-xs text-primary font-medium flex items-center gap-0.5"
        >
          Relatório <ChevronRight size={14} />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="rounded-xl bg-income/10 p-3">
          <div className="flex items-center gap-1 text-income mb-1">
            <TrendingUp size={12} />
            <span className="text-[10px] font-medium uppercase tracking-wide">Entradas</span>
          </div>
          <p className="font-semibold text-sm truncate">{formatCurrency(income)}</p>
          {prevStats.income > 0 && (
            <p className={cn('text-[10px] mt-0.5', incomeDelta >= 0 ? 'text-income' : 'text-muted-foreground')}>
              {incomeDelta >= 0 ? '+' : ''}{incomeDelta.toFixed(0)}% vs mês ant.
            </p>
          )}
        </div>
        <div className="rounded-xl bg-expense/10 p-3">
          <div className="flex items-center gap-1 text-expense mb-1">
            <TrendingDown size={12} />
            <span className="text-[10px] font-medium uppercase tracking-wide">Gastos</span>
          </div>
          <p className="font-semibold text-sm truncate">{formatCurrency(expense)}</p>
          {prevStats.expense > 0 && (
            <p className={cn('text-[10px] mt-0.5', expenseDelta <= 0 ? 'text-income' : 'text-expense')}>
              {expenseDelta >= 0 ? '+' : ''}{expenseDelta.toFixed(0)}% vs mês ant.
            </p>
          )}
        </div>
        <div className="rounded-xl bg-primary/10 p-3">
          <div className="flex items-center gap-1 text-primary mb-1">
            <PiggyBank size={12} />
            <span className="text-[10px] font-medium uppercase tracking-wide">Guardado</span>
          </div>
          <p className={cn('font-semibold text-sm truncate', balance >= 0 ? 'text-foreground' : 'text-expense')}>
            {formatCurrency(balance)}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{savingsRate}% de taxa</p>
        </div>
      </div>

      {topCategories.length > 0 && (
        <div>
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Onde gastou mais
          </p>
          <div className="space-y-2">
            {topCategories.map((c: any) => {
              const Icon = getIconComponent(c.icon);
              return (
                <div key={c.categoryId} className="flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${c.color}20`, color: c.color }}
                  >
                    <Icon size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-medium truncate">{c.categoryName}</span>
                      <span className="text-xs text-muted-foreground shrink-0">{formatCurrency(c.total)}</span>
                    </div>
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${Math.min(100, c.percentage)}%`, backgroundColor: c.color }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
