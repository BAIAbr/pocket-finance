import { useMemo } from 'react';
import { useFamilyContext } from '@/contexts/FamilyContext';
import { useFinanceContext } from '@/contexts/FinanceContext';
import { Users, TrendingUp, TrendingDown, Target, PieChart } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format, startOfMonth, endOfMonth, subMonths, isWithinInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export function FamilyDashboard() {
  const { family, members, goals, sharedTransactions } = useFamilyContext();
  const { transactions, categories, settings } = useFinanceContext();

  // Get shared transaction IDs
  const sharedIds = useMemo(
    () => new Set(sharedTransactions.map(st => st.transaction_id)),
    [sharedTransactions]
  );

  // Filter transactions that are shared
  const familyTransactions = useMemo(
    () => (transactions as any[]).filter(t => sharedIds.has(t.id)),
    [transactions, sharedIds]
  );

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const prevMonthStart = startOfMonth(subMonths(now, 1));
  const prevMonthEnd = endOfMonth(subMonths(now, 1));

  const thisMonthTx = familyTransactions.filter(t => {
    const d = parseISO(t.date);
    return isWithinInterval(d, { start: monthStart, end: monthEnd });
  });

  const prevMonthTx = familyTransactions.filter(t => {
    const d = parseISO(t.date);
    return isWithinInterval(d, { start: prevMonthStart, end: prevMonthEnd });
  });

  const totalExpenseThisMonth = thisMonthTx
    .filter(t => t.type === 'expense')
    .reduce((sum: number, t: any) => sum + Number(t.amount), 0);

  const totalIncomeThisMonth = thisMonthTx
    .filter(t => t.type === 'income')
    .reduce((sum: number, t: any) => sum + Number(t.amount), 0);

  const totalExpensePrevMonth = prevMonthTx
    .filter(t => t.type === 'expense')
    .reduce((sum: number, t: any) => sum + Number(t.amount), 0);

  const expenseVariation = totalExpensePrevMonth > 0
    ? ((totalExpenseThisMonth - totalExpensePrevMonth) / totalExpensePrevMonth) * 100
    : 0;

  // Category distribution
  const categoryStats = useMemo(() => {
    const stats: Record<string, { name: string; color: string; total: number }> = {};
    thisMonthTx.filter(t => t.type === 'expense').forEach((t: any) => {
      const cat = (categories as any[]).find(c => c.id === t.category_id);
      const key = t.category_id || 'other';
      if (!stats[key]) {
        stats[key] = { name: cat?.name || 'Outros', color: cat?.color || '#888', total: 0 };
      }
      stats[key].total += Number(t.amount);
    });
    return Object.values(stats).sort((a, b) => b.total - a.total).slice(0, 5);
  }, [thisMonthTx, categories]);

  // Member contribution
  const memberStats = useMemo(() => {
    const stats: Record<string, number> = {};
    sharedTransactions.forEach(st => {
      const tx = (transactions as any[]).find(t => t.id === st.transaction_id);
      if (tx && tx.type === 'expense') {
        const d = parseISO(tx.date);
        if (isWithinInterval(d, { start: monthStart, end: monthEnd })) {
          stats[st.shared_by] = (stats[st.shared_by] || 0) + Number(tx.amount);
        }
      }
    });
    return stats;
  }, [sharedTransactions, transactions, monthStart, monthEnd]);

  const currSymbol = settings.currencySymbol || 'R$';

  const activeGoals = goals.filter(g => g.status === 'ativa');

  if (!family) return null;

  return (
    <div className="space-y-5">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card-finance p-4">
          <p className="text-xs text-muted-foreground mb-1">Gastos do mês</p>
          <p className="text-lg font-bold text-expense font-mono-amount">
            {currSymbol} {totalExpenseThisMonth.toFixed(2)}
          </p>
          {totalExpensePrevMonth > 0 && (
            <div className={cn(
              'flex items-center gap-1 mt-1',
              expenseVariation > 0 ? 'text-destructive' : 'text-income'
            )}>
              {expenseVariation > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              <span className="text-[10px] font-medium">{Math.abs(expenseVariation).toFixed(1)}% vs mês anterior</span>
            </div>
          )}
        </div>

        <div className="card-finance p-4">
          <p className="text-xs text-muted-foreground mb-1">Receitas do mês</p>
          <p className="text-lg font-bold text-income font-mono-amount">
            {currSymbol} {totalIncomeThisMonth.toFixed(2)}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">
            {thisMonthTx.length} transações compartilhadas
          </p>
        </div>
      </div>

      {/* Category Distribution */}
      {categoryStats.length > 0 && (
        <div className="card-finance">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <PieChart size={16} />
            Distribuição por Categoria
          </h3>
          <div className="space-y-2">
            {categoryStats.map((cat, i) => {
              const pct = totalExpenseThisMonth > 0 ? (cat.total / totalExpenseThisMonth) * 100 : 0;
              return (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className="text-xs flex-1 truncate">{cat.name}</span>
                  <span className="text-xs text-muted-foreground">{pct.toFixed(0)}%</span>
                  <span className="text-xs font-medium font-mono-amount w-20 text-right">
                    {currSymbol} {cat.total.toFixed(0)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Member Distribution */}
      {Object.keys(memberStats).length > 0 && (
        <div className="card-finance">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <Users size={16} />
            Gastos por Membro
          </h3>
          <div className="space-y-2">
            {members.map(member => {
              const amount = memberStats[member.user_id] || 0;
              if (amount === 0) return null;
              const pct = totalExpenseThisMonth > 0 ? (amount / totalExpenseThisMonth) * 100 : 0;
              return (
                <div key={member.id} className="flex items-center gap-3">
                  <Avatar className="w-6 h-6">
                    {member.profile?.avatar_url && <AvatarImage src={member.profile.avatar_url} />}
                    <AvatarFallback className="gradient-balance text-primary-foreground text-[10px]">
                      {(member.profile?.name || 'U').charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs flex-1 truncate">{member.profile?.name || 'Usuário'}</span>
                  <span className="text-xs text-muted-foreground">{pct.toFixed(0)}%</span>
                  <span className="text-xs font-medium font-mono-amount w-20 text-right">
                    {currSymbol} {amount.toFixed(0)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Family Goals Progress */}
      {activeGoals.length > 0 && (
        <div className="card-finance">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <Target size={16} />
            Metas Familiares
          </h3>
          <div className="space-y-3">
            {activeGoals.map(goal => {
              const progress = goal.valor_objetivo > 0 ? (goal.valor_atual / goal.valor_objetivo) * 100 : 0;
              return (
                <div key={goal.id} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">{goal.nome}</span>
                    <span className="text-[10px] text-muted-foreground">{progress.toFixed(0)}%</span>
                  </div>
                  <Progress value={Math.min(progress, 100)} className="h-1.5" />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>{currSymbol} {goal.valor_atual.toFixed(0)}</span>
                    <span>{currSymbol} {goal.valor_objetivo.toFixed(0)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {familyTransactions.length === 0 && activeGoals.length === 0 && (
        <div className="card-finance text-center py-8">
          <Users size={32} className="text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Nenhum dado familiar ainda</p>
          <p className="text-xs text-muted-foreground mt-1">
            Compartilhe transações para ver o painel familiar
          </p>
        </div>
      )}
    </div>
  );
}
