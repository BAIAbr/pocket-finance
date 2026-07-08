import { useNavigate } from 'react-router-dom';
import { TrendingUp, ArrowRight, Target } from 'lucide-react';
import { useFinancialGoals } from '@/hooks/useFinancialGoals';
import { useEffectiveFinance } from '@/hooks/useEffectiveFinance';
import { monthsToReach } from '@/lib/planning/calculations';
import { cdiPercentageToAnnualRate } from '@/hooks/useCdiYield';

export function PlanningSummaryCard() {
  const { primaryGoal, goals } = useFinancialGoals();
  const { formatCurrency } = useEffectiveFinance() as any;
  const navigate = useNavigate();

  const fmt = (n: number) => (formatCurrency ? formatCurrency(n) : `R$ ${n.toFixed(2)}`);

  if (!primaryGoal) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
              <TrendingUp size={18} className="text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Planejamento Financeiro</h3>
              <p className="text-xs text-muted-foreground">Simule metas e projete seu patrimônio</p>
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          {goals.length === 0 ? 'Nenhum objetivo cadastrado ainda.' : 'Defina um objetivo principal para acompanhar aqui.'}
        </p>
        <button onClick={() => navigate('/planning')}
          className="w-full py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 inline-flex items-center justify-center gap-2">
          Abrir Planejamento <ArrowRight size={14} />
        </button>
      </div>
    );
  }

  const annualRate = primaryGoal.custom_annual_rate ?? cdiPercentageToAnnualRate(Number(primaryGoal.cdi_percentage));
  const progress = Math.min(100, (Number(primaryGoal.initial_amount) / Number(primaryGoal.target_amount)) * 100);
  const monthsLeft = monthsToReach(
    Number(primaryGoal.target_amount),
    Number(primaryGoal.initial_amount),
    Number(primaryGoal.monthly_contribution),
    annualRate,
  );

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
            <Target size={18} className="text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Objetivo principal</p>
            <h3 className="text-sm font-bold truncate">{primaryGoal.title}</h3>
          </div>
        </div>
        <button onClick={() => navigate('/planning')} className="text-primary hover:text-primary/80 p-1">
          <ArrowRight size={16} />
        </button>
      </div>

      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-muted-foreground">{fmt(Number(primaryGoal.initial_amount))}</span>
          <span className="font-semibold">{fmt(Number(primaryGoal.target_amount))}</span>
        </div>
        <div className="h-2 rounded-full bg-secondary overflow-hidden">
          <div className="h-full bg-gradient-to-r from-primary to-primary/70" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-[11px] text-muted-foreground mt-1">{progress.toFixed(1)}% concluído</p>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl bg-secondary/50 p-2">
          <p className="text-[10px] text-muted-foreground uppercase">Próximo aporte</p>
          <p className="text-sm font-bold mt-0.5">{fmt(Number(primaryGoal.monthly_contribution))}</p>
        </div>
        <div className="rounded-xl bg-secondary/50 p-2">
          <p className="text-[10px] text-muted-foreground uppercase">Tempo restante</p>
          <p className="text-sm font-bold mt-0.5">{monthsLeft == null ? '—' : `${monthsLeft} m`}</p>
        </div>
      </div>
    </div>
  );
}
