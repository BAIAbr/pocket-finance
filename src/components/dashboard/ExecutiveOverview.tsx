import { useState } from 'react';
import { Eye, EyeOff, TrendingUp, TrendingDown, Wallet, PiggyBank } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEffectiveFinance } from '@/hooks/useEffectiveFinance';
import { cn } from '@/lib/utils';

/** Stitch-style "Patrimônio + KPIs" block. Uses only existing real data. */
export function ExecutiveOverview() {
  const { totalBalance, currentMonthStats, formatCurrency, piggyBanks, isLoading, isFamily } = useEffectiveFinance();
  const navigate = useNavigate();
  const [hidden, setHidden] = useState(false);

  const saved = isFamily ? 0 : (piggyBanks as any[]).reduce((s, p) => s + Number(p.balance || 0), 0);
  const net = totalBalance + saved;
  const income = currentMonthStats.income || 0;
  const expense = currentMonthStats.expense || 0;
  const savingsRate = income > 0 ? ((income - expense) / income) * 100 : null;
  const mask = (v: string) => (hidden ? '••••••' : v);

  if (isLoading) {
    return <div className="rounded-2xl border border-border bg-card h-64 shimmer" />;
  }

  const kpis = [
    { label: isFamily ? 'Saldo familiar' : 'Saldo disponível', value: formatCurrency(totalBalance), hint: 'Entradas − saídas registradas', icon: Wallet, tone: totalBalance >= 0 ? '' : 'text-expense' },
    { label: 'Entradas do mês', value: `+${formatCurrency(income)}`, hint: currentMonthStats.month, icon: TrendingUp, tone: 'text-income' },
    { label: 'Saídas do mês', value: `-${formatCurrency(expense)}`, hint: currentMonthStats.month, icon: TrendingDown, tone: 'text-expense' },
    {
      label: 'Taxa de poupança',
      value: savingsRate === null ? '—' : `${savingsRate.toFixed(1).replace('.', ',')}%`,
      hint: savingsRate === null ? 'Sem entradas no mês' : 'Do que entrou, sobrou',
      icon: PiggyBank,
      tone: savingsRate !== null && savingsRate < 0 ? 'text-expense' : 'text-primary',
    },
  ];

  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
          {isFamily ? 'Patrimônio familiar' : 'Patrimônio líquido'}
        </span>
        <button onClick={() => setHidden(h => !h)} className="text-muted-foreground hover:text-foreground" aria-label="Ocultar valores">
          {hidden ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <p className={cn('font-mono text-4xl xl:text-5xl font-semibold tracking-tight tabular-nums', net < 0 && 'text-expense')}>
          {mask(formatCurrency(net))}
        </p>
        {!isFamily && saved > 0 && (
          <button onClick={() => navigate('/savings')} className="font-mono text-[11px] text-muted-foreground hover:text-foreground">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary mr-1.5" />
            Guardado em metas: {mask(formatCurrency(saved))}
          </button>
        )}
      </div>

      <div className="mt-6 grid grid-cols-2 xl:grid-cols-4 gap-3">
        {kpis.map(k => (
          <div key={k.label} className="rounded-xl border border-border bg-background/40 p-4 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground truncate">{k.label}</span>
              <k.icon size={14} className="text-muted-foreground shrink-0" />
            </div>
            <p className={cn('mt-2 font-mono text-xl font-medium tabular-nums truncate', k.tone)}>{mask(k.value)}</p>
            <p className="mt-1 text-xs text-muted-foreground truncate capitalize">{k.hint}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
