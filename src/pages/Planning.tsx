import { useState, useMemo } from 'react';
import { Plus, TrendingUp, PiggyBank, Wallet, Target, Star, Trash2, Pencil, AlertTriangle, Sparkles } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { GoalFormModal } from '@/components/planning/GoalFormModal';
import { useFinancialGoals, FinancialGoal } from '@/hooks/useFinancialGoals';
import { usePlanningStats } from '@/hooks/usePlanningStats';
import { useEffectiveFinance } from '@/hooks/useEffectiveFinance';
import { projectPatrimony } from '@/lib/planning/calculations';
import { cdiPercentageToAnnualRate } from '@/hooks/useCdiYield';
import { cn } from '@/lib/utils';

const HORIZONS = [
  { years: 1, label: '1 ano' },
  { years: 3, label: '3 anos' },
  { years: 5, label: '5 anos' },
  { years: 10, label: '10 anos' },
];

export default function Planning() {
  const { goals, primaryGoal, deleteGoal, setPrimary, isLoading } = useFinancialGoals();
  const stats = usePlanningStats(6);
  const { formatCurrency } = useEffectiveFinance() as any;
  const fmt = (n: number) => (formatCurrency ? formatCurrency(n) : `R$ ${n.toFixed(2)}`);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FinancialGoal | null>(null);
  const [horizon, setHorizon] = useState(5);

  const annualRate = primaryGoal
    ? primaryGoal.custom_annual_rate ?? cdiPercentageToAnnualRate(Number(primaryGoal.cdi_percentage))
    : cdiPercentageToAnnualRate(100);

  const projection = useMemo(() => {
    const monthly = primaryGoal ? Number(primaryGoal.monthly_contribution) : stats.investmentCapacity;
    const points = projectPatrimony(stats.patrimony, monthly, annualRate, horizon);
    // reduce to ~30 points for chart
    const step = Math.max(1, Math.floor(points.length / 30));
    return points.filter((_, i) => i % step === 0).map(p => ({
      m: p.month,
      Investido: Math.round(p.invested),
      Rendimento: Math.round(p.yield),
      Total: Math.round(p.balance),
    }));
  }, [stats.patrimony, stats.investmentCapacity, primaryGoal, annualRate, horizon]);

  const alerts = useMemo(() => {
    const list: { type: 'warn' | 'info' | 'ok'; text: string }[] = [];
    if (stats.emergencyCoverageMonths < 3 && stats.avgExpense > 0) {
      list.push({ type: 'warn', text: `Reserva baixa: cobre apenas ${stats.emergencyCoverageMonths.toFixed(1)} meses de despesas. Recomendado: 6 meses (${fmt(stats.emergencyRecommended)}).` });
    }
    if (stats.currentMonthExpense > stats.avgExpense * 1.2 && stats.avgExpense > 0) {
      list.push({ type: 'warn', text: `Gastos deste mês estão ${(((stats.currentMonthExpense / stats.avgExpense) - 1) * 100).toFixed(0)}% acima da média.` });
    }
    if (stats.savingsVariationPct > 20) {
      list.push({ type: 'ok', text: `Economia deste mês está ${stats.savingsVariationPct.toFixed(0)}% acima da média. Excelente!` });
    }
    if (stats.savingsVariationPct > 15 && stats.investmentCapacity > 0) {
      list.push({ type: 'info', text: `Sua capacidade de investimento aumentou. Considere elevar seu aporte mensal.` });
    }
    if (primaryGoal && primaryGoal.target_date) {
      const monthsLeft = Math.round((new Date(primaryGoal.target_date).getTime() - Date.now()) / (30.4 * 86400000));
      const gap = Number(primaryGoal.target_amount) - Number(primaryGoal.initial_amount);
      const neededPerMonth = monthsLeft > 0 ? gap / monthsLeft : Infinity;
      if (Number(primaryGoal.monthly_contribution) > 0 && neededPerMonth > Number(primaryGoal.monthly_contribution) * 1.15) {
        list.push({ type: 'warn', text: `Meta "${primaryGoal.title}" pode atrasar. Aporte atual insuficiente para o prazo.` });
      }
    }
    return list;
  }, [stats, primaryGoal]);

  const openNew = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (g: FinancialGoal) => { setEditing(g); setModalOpen(true); };

  return (
    <div className="min-h-screen bg-background pb-28 lg:pb-8 safe-top">
      <header className="px-4 lg:px-8 pt-6 pb-4 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
        <div className="relative flex items-start justify-between">
          <div>
            <p className="text-muted-foreground text-sm font-medium flex items-center gap-1.5">
              <Sparkles size={12} className="text-primary" /> 100% calculado localmente — sem IA
            </p>
            <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              Planejamento Financeiro
            </h1>
          </div>
          <button onClick={openNew}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 shadow-lg shadow-primary/20">
            <Plus size={16} /> <span className="hidden sm:inline">Novo objetivo</span>
          </button>
        </div>
      </header>

      <main className="px-4 lg:px-8 space-y-5">
        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-fade-in">
          <StatCard icon={<Wallet size={16} />} label="Patrimônio Atual" value={fmt(stats.patrimony)} />
          <StatCard icon={<TrendingUp size={16} />} label="Economia média/mês" value={fmt(stats.avgSavings)} tone={stats.avgSavings >= 0 ? 'ok' : 'warn'} />
          <StatCard icon={<PiggyBank size={16} />} label="Reserva de emergência" value={fmt(stats.emergencyRecommended)} subtext={`Cobre ${stats.emergencyCoverageMonths.toFixed(1)}m`} />
          <StatCard icon={<Target size={16} />} label="Capacidade investir" value={fmt(stats.investmentCapacity)} />
        </div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="space-y-2 animate-fade-in">
            {alerts.map((a, i) => (
              <div key={i} className={cn(
                'flex items-start gap-2 p-3 rounded-xl border text-sm',
                a.type === 'warn' && 'border-orange-500/40 bg-orange-500/10 text-orange-200',
                a.type === 'info' && 'border-primary/30 bg-primary/10',
                a.type === 'ok' && 'border-green-500/40 bg-green-500/10 text-green-200',
              )}>
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <span>{a.text}</span>
              </div>
            ))}
          </div>
        )}

        {/* Goals list + evolution: two cols on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
          <section className="animate-fade-in">
            <h2 className="font-semibold text-lg mb-3">Meus Objetivos</h2>
            {isLoading ? (
              <div className="text-sm text-muted-foreground">Carregando...</div>
            ) : goals.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-6 text-center">
                <Target size={28} className="mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-3">Nenhum objetivo criado ainda.</p>
                <button onClick={openNew} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">
                  Criar meu primeiro objetivo
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {goals.map(g => {
                  const progress = Math.min(100, (Number(g.initial_amount) / Number(g.target_amount)) * 100);
                  return (
                    <div key={g.id} className="rounded-2xl border border-border bg-card p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                            <Target size={16} className="text-primary" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <h3 className="font-semibold text-sm truncate">{g.title}</h3>
                              {g.is_primary && <Star size={12} className="text-primary fill-primary" />}
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                              {fmt(Number(g.initial_amount))} de {fmt(Number(g.target_amount))} • {Number(g.cdi_percentage)}% CDI
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {!g.is_primary && (
                            <button onClick={() => setPrimary(g.id)} title="Marcar como principal"
                              className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground">
                              <Star size={14} />
                            </button>
                          )}
                          <button onClick={() => openEdit(g)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => { if (confirm('Remover este objetivo?')) deleteGoal(g.id); }}
                            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="animate-fade-in">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-lg">Evolução Patrimonial</h2>
              <div className="flex gap-1">
                {HORIZONS.map(h => (
                  <button key={h.years} onClick={() => setHorizon(h.years)}
                    className={cn('px-2.5 py-1 rounded-lg text-xs font-medium',
                      horizon === h.years ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground')}>
                    {h.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-card p-3 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={projection} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="pnTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="m" tickFormatter={v => `${Math.round(v / 12)}a`} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis tickFormatter={v => `${(v / 1000).toFixed(0)}k`} stroke="hsl(var(--muted-foreground))" fontSize={11} width={40} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12 }}
                    formatter={(v: any) => fmt(Number(v))}
                    labelFormatter={(v: any) => `Mês ${v}`}
                  />
                  <Area type="monotone" dataKey="Investido" stroke="hsl(var(--muted-foreground))" fill="hsl(var(--muted-foreground))" fillOpacity={0.1} strokeWidth={1.5} />
                  <Area type="monotone" dataKey="Total" stroke="hsl(var(--primary))" fill="url(#pnTotal)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              Projeção com aporte de {fmt(primaryGoal ? Number(primaryGoal.monthly_contribution) : stats.investmentCapacity)}/mês a {annualRate.toFixed(2)}% a.a.
            </p>
          </section>
        </div>
      </main>

      <GoalFormModal isOpen={modalOpen} onClose={() => setModalOpen(false)} editing={editing} />
    </div>
  );
}

function StatCard({ icon, label, value, subtext, tone }: { icon: React.ReactNode; label: string; value: string; subtext?: string; tone?: 'ok' | 'warn' }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
        {icon}<span className="text-[11px] uppercase tracking-wide">{label}</span>
      </div>
      <p className={cn('text-lg font-bold truncate', tone === 'warn' && 'text-orange-400', tone === 'ok' && 'text-green-400')}>{value}</p>
      {subtext && <p className="text-[11px] text-muted-foreground">{subtext}</p>}
    </div>
  );
}
