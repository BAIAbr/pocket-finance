import { useState, useMemo, useEffect } from 'react';
import {
  X, Home, Car, Plane, GraduationCap, Laptop, Heart, PiggyBank, Building2,
  Target, Star, Sparkles, TrendingUp, Calendar, Wallet, LineChart, Zap, CheckCircle2,
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { cn } from '@/lib/utils';
import { useFinancialGoals, FinancialGoal } from '@/hooks/useFinancialGoals';
import { useEffectiveFinance } from '@/hooks/useEffectiveFinance';
import { cdiPercentageToAnnualRate } from '@/hooks/useCdiYield';
import { simulateGoal, monthsToReach } from '@/lib/planning/calculations';
import { formatBRL, formatDuration, futureDate, formatMonthYear } from '@/lib/currency';
import { CurrencyInput } from './CurrencyInput';
import { toast } from 'sonner';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  editing?: FinancialGoal | null;
}

const GOAL_TYPES = [
  { key: 'casa', label: 'Casa', icon: 'Home' },
  { key: 'carro', label: 'Carro', icon: 'Car' },
  { key: 'viagem', label: 'Viagem', icon: 'Plane' },
  { key: 'faculdade', label: 'Faculdade', icon: 'GraduationCap' },
  { key: 'notebook', label: 'Notebook', icon: 'Laptop' },
  { key: 'casamento', label: 'Casamento', icon: 'Heart' },
  { key: 'reserva', label: 'Reserva', icon: 'PiggyBank' },
  { key: 'empresa', label: 'Empresa', icon: 'Building2' },
  { key: 'custom', label: 'Personalizado', icon: 'Target' },
];

const CDI_PRESETS = [
  { label: 'Sem rendimento', pct: 0 },
  { label: '100% CDI', pct: 100 },
  { label: '105% CDI', pct: 105 },
  { label: '110% CDI', pct: 110 },
  { label: '120% CDI', pct: 120 },
  { label: '130% CDI', pct: 130 },
];

const iconMap: Record<string, any> = { Home, Car, Plane, GraduationCap, Laptop, Heart, PiggyBank, Building2, Target };

type RateMode = 'preset' | 'custom';

export function GoalFormModal({ isOpen, onClose, editing }: Props) {
  const { createGoal, updateGoal } = useFinancialGoals();
  const finance = useEffectiveFinance() as any;
  const createPiggyBank = finance?._personalFinance?.createPiggyBank ?? finance?.createPiggyBank;

  const [title, setTitle] = useState('');
  const [goalType, setGoalType] = useState('custom');
  const [targetAmount, setTargetAmount] = useState(0);
  const [initialAmount, setInitialAmount] = useState(0);
  const [monthly, setMonthly] = useState(0);
  const [cdiPct, setCdiPct] = useState<number>(100);
  const [rateMode, setRateMode] = useState<RateMode>('preset');
  const [customRate, setCustomRate] = useState<string>('');
  const [customRateType, setCustomRateType] = useState<'annual' | 'monthly'>('annual');
  const [isPrimary, setIsPrimary] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creatingMeta, setCreatingMeta] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (editing) {
      setTitle(editing.title);
      setGoalType(editing.goal_type);
      setTargetAmount(Number(editing.target_amount));
      setInitialAmount(Number(editing.initial_amount));
      setMonthly(Number(editing.monthly_contribution));
      setCdiPct(Number(editing.cdi_percentage));
      if (editing.custom_annual_rate != null) {
        setRateMode('custom');
        setCustomRate(String(editing.custom_annual_rate));
        setCustomRateType('annual');
      } else {
        setRateMode('preset');
        setCustomRate('');
      }
      setIsPrimary(editing.is_primary);
    } else {
      setTitle('');
      setGoalType('custom');
      setTargetAmount(0);
      setInitialAmount(0);
      setMonthly(0);
      setCdiPct(100);
      setRateMode('preset');
      setCustomRate('');
      setCustomRateType('annual');
      setIsPrimary(false);
    }
  }, [isOpen, editing]);

  const annualRate = useMemo(() => {
    if (rateMode === 'custom' && customRate) {
      const n = Number(customRate);
      if (!isFinite(n) || n <= 0) return 0;
      if (customRateType === 'monthly') {
        return (Math.pow(1 + n / 100, 12) - 1) * 100;
      }
      return n;
    }
    return cdiPercentageToAnnualRate(cdiPct);
  }, [rateMode, customRate, customRateType, cdiPct]);

  const monthsNeeded = useMemo(
    () => (targetAmount > 0 ? monthsToReach(targetAmount, initialAmount, monthly, annualRate) : null),
    [targetAmount, initialAmount, monthly, annualRate],
  );

  const horizonMonths = Math.min(monthsNeeded ?? 60, 1200);

  const sim = useMemo(
    () => simulateGoal({ initial: initialAmount, monthly, annualRate, months: horizonMonths }),
    [initialAmount, monthly, annualRate, horizonMonths],
  );
  const last = sim[sim.length - 1];
  const totalYield = last?.yield ?? 0;
  const totalInvested = last?.invested ?? initialAmount;
  const finalBalance = last?.balance ?? initialAmount;

  const previsionDate = monthsNeeded != null ? futureDate(monthsNeeded) : null;

  // Viability
  const viability = useMemo(() => {
    if (monthsNeeded == null) return null;
    const years = monthsNeeded / 12;
    if (years <= 5) {
      return {
        level: 'excellent' as const,
        emoji: '🟢',
        label: 'EXCELENTE',
        message: 'Seu objetivo está no caminho certo. Mantendo esse ritmo, você alcançará sua meta rapidamente.',
      };
    }
    if (years <= 15) {
      return {
        level: 'moderate' as const,
        emoji: '🟡',
        label: 'MODERADO',
        message: 'Seu objetivo é possível, porém levará um período maior. Aumentar o aporte pode acelerar sua conquista.',
      };
    }
    return {
      level: 'long' as const,
      emoji: '🔴',
      label: 'MUITO LONGO',
      message: 'Com o aporte atual, seu objetivo levará bastante tempo. O Finango encontrou formas de acelerar esse resultado.',
    };
  }, [monthsNeeded]);

  // Scenario comparison — 4 different monthly contributions.
  const scenarios = useMemo(() => {
    if (targetAmount <= 0) return [];
    const baseMonthly = monthly > 0 ? monthly : Math.max(50, Math.round(targetAmount / 1200 / 10) * 10);
    const multipliers = [1, 1.5, 2.5, 3.5];
    return multipliers.map((mult, i) => {
      const m = Math.round(baseMonthly * mult);
      const months = monthsToReach(targetAmount, initialAmount, m, annualRate);
      return {
        id: i,
        monthly: m,
        months,
        isCurrent: i === 0 && Math.abs(m - monthly) < 1,
      };
    });
  }, [targetAmount, initialAmount, monthly, annualRate]);

  // Reverse simulation - required monthly to reach in X years.
  const reverseTargets = [3, 5, 10];
  const reverseRows = useMemo(() => {
    if (targetAmount <= 0) return [];
    return reverseTargets.map((years) => {
      const months = years * 12;
      // Binary search for monthly aporte that hits target in exactly `months`.
      let lo = 0;
      let hi = Math.max(targetAmount, 100000);
      for (let i = 0; i < 40; i++) {
        const mid = (lo + hi) / 2;
        const reached = monthsToReach(targetAmount, initialAmount, mid, annualRate);
        if (reached != null && reached <= months) hi = mid;
        else lo = mid;
      }
      const needed = hi;
      return { years, months, needed };
    });
  }, [targetAmount, initialAmount, annualRate]);

  // Timeline: when do we hit 25/50/75/100%
  const milestones = useMemo(() => {
    if (targetAmount <= 0 || monthsNeeded == null) return [];
    return [0.25, 0.5, 0.75, 1].map((pct) => {
      const m = monthsToReach(targetAmount * pct, initialAmount, monthly, annualRate);
      return { pct, months: m };
    });
  }, [targetAmount, initialAmount, monthly, annualRate, monthsNeeded]);

  const progressPct = targetAmount > 0 ? Math.min(100, (initialAmount / targetAmount) * 100) : 0;

  const chartData = useMemo(() => {
    if (sim.length <= 1) return [];
    const step = Math.max(1, Math.floor(sim.length / 40));
    return sim.filter((_, i) => i % step === 0 || i === sim.length - 1).map((p) => ({
      m: p.month,
      Investido: Math.round(p.invested),
      Rendimento: Math.round(p.yield),
      Total: Math.round(p.balance),
    }));
  }, [sim]);

  const canSave = title.trim().length > 0 && targetAmount > 0;

  const buildPayload = () => ({
    title: title.trim(),
    goal_type: goalType,
    icon: GOAL_TYPES.find((g) => g.key === goalType)?.icon ?? 'Target',
    color: '#FF6A00',
    target_amount: targetAmount,
    initial_amount: initialAmount,
    monthly_contribution: monthly,
    target_date: null,
    cdi_percentage: cdiPct,
    custom_annual_rate: rateMode === 'custom' && customRate ? annualRate : null,
    category_id: null,
    piggy_bank_id: null,
    is_primary: isPrimary,
  });

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    const payload = buildPayload();
    const ok = editing ? await updateGoal(editing.id, payload) : await createGoal(payload as any);
    setSaving(false);
    if (ok) onClose();
  };

  const handleCreateMeta = async () => {
    if (!canSave) return;
    if (!createPiggyBank) {
      toast.error('Recurso indisponível');
      return;
    }
    setCreatingMeta(true);
    // 1. Create the piggy bank
    const piggy = await createPiggyBank({
      name: title.trim(),
      target_amount: targetAmount,
      cdi_rate_annual: annualRate > 0 ? annualRate : 0,
    });
    // 2. Save the goal, linking the piggy bank when possible
    const payload = { ...buildPayload(), piggy_bank_id: piggy?.id ?? null };
    const goalOk = editing ? await updateGoal(editing.id, payload) : await createGoal(payload as any);
    setCreatingMeta(false);
    if (piggy && goalOk) {
      toast.success('Meta criada com sucesso!');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm animate-fade-in flex items-end lg:items-center lg:justify-center">
      <div className="w-full lg:max-w-3xl bg-card border border-border rounded-t-3xl lg:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-primary/15 flex items-center justify-center shrink-0">
              <Sparkles size={18} className="text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold truncate">{editing ? 'Editar planejamento' : 'Novo planejamento'}</h2>
              <p className="text-[11px] text-muted-foreground">Simulação inteligente em tempo real</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-secondary transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto overflow-x-hidden">
          <div className="p-5 space-y-6">
            {/* STEP 1 — Type */}
            <section>
              <SectionTitle number="1" title="Tipo de objetivo" />
              <div className="grid grid-cols-3 lg:grid-cols-5 gap-2">
                {GOAL_TYPES.map((t) => {
                  const Ic = iconMap[t.icon];
                  const active = goalType === t.key;
                  return (
                    <button
                      key={t.key}
                      onClick={() => {
                        setGoalType(t.key);
                        if (!title) setTitle(t.label);
                      }}
                      className={cn(
                        'flex flex-col items-center gap-1 p-2.5 rounded-xl border transition-all active:scale-95',
                        active
                          ? 'border-primary bg-primary/10 text-primary shadow-lg shadow-primary/10'
                          : 'border-border hover:bg-secondary',
                      )}
                    >
                      <Ic size={20} />
                      <span className="text-[11px] font-medium">{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* STEP 2 — Name */}
            <section>
              <SectionTitle number="2" title="Nome do objetivo" />
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Comprar meu carro"
                maxLength={80}
                className="w-full px-3 py-2.5 rounded-xl bg-secondary/50 border border-border text-sm focus:outline-none focus:border-primary transition-colors"
              />
            </section>

            {/* STEP 3 — Amounts */}
            <section>
              <SectionTitle number="3" title="Valores" />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Field label="Valor do objetivo">
                  <CurrencyInput value={targetAmount} onChange={setTargetAmount} />
                </Field>
                <Field label="Valor que já possui">
                  <CurrencyInput value={initialAmount} onChange={setInitialAmount} />
                </Field>
                <Field label="Aporte mensal">
                  <CurrencyInput value={monthly} onChange={setMonthly} />
                </Field>
              </div>
              <p className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1">
                <Calendar size={11} /> Sem prazo obrigatório — o Finango calcula automaticamente.
              </p>
            </section>

            {/* STEP 4 — Rate */}
            <section>
              <SectionTitle number="4" title="Rentabilidade" />
              <div className="flex flex-wrap gap-2 mb-2">
                {CDI_PRESETS.map((p) => (
                  <button
                    key={p.pct}
                    onClick={() => {
                      setRateMode('preset');
                      setCdiPct(p.pct);
                    }}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-semibold border transition-all active:scale-95',
                      rateMode === 'preset' && cdiPct === p.pct
                        ? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20'
                        : 'border-border hover:bg-secondary',
                    )}
                  >
                    {p.label}
                  </button>
                ))}
                <button
                  onClick={() => setRateMode('custom')}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-semibold border transition-all active:scale-95',
                    rateMode === 'custom'
                      ? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20'
                      : 'border-border hover:bg-secondary',
                  )}
                >
                  Personalizada
                </button>
              </div>
              {rateMode === 'custom' && (
                <div className="flex gap-2 items-stretch animate-fade-in">
                  <input
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    value={customRate}
                    onChange={(e) => setCustomRate(e.target.value)}
                    placeholder={customRateType === 'annual' ? 'Taxa anual (ex: 12,5)' : 'Taxa mensal (ex: 1)'}
                    className="flex-1 px-3 py-2.5 rounded-xl bg-secondary/50 border border-border text-sm focus:outline-none focus:border-primary"
                  />
                  <select
                    value={customRateType}
                    onChange={(e) => setCustomRateType(e.target.value as any)}
                    className="px-3 py-2.5 rounded-xl bg-secondary/50 border border-border text-sm focus:outline-none focus:border-primary"
                  >
                    <option value="annual">% ao ano</option>
                    <option value="monthly">% ao mês</option>
                  </select>
                </div>
              )}
              <p className="text-[11px] text-muted-foreground mt-1.5">
                Taxa efetiva anual: <span className="font-semibold text-foreground">{annualRate.toFixed(2)}%</span>
              </p>
            </section>

            {/* RESULT PANEL */}
            {targetAmount > 0 && (
              <section className="animate-fade-in space-y-4">
                <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4 sm:p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center">
                      <Target size={16} className="text-primary" />
                    </div>
                    <h3 className="font-bold text-sm">Resultado da simulação</h3>
                  </div>

                  {/* Progress bar */}
                  <div>
                    <div className="flex justify-between text-[11px] text-muted-foreground mb-1.5">
                      <span>{formatBRL(initialAmount)}</span>
                      <span className="font-semibold text-foreground">{formatBRL(targetAmount)}</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-secondary overflow-hidden relative">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-500"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] mt-1">
                      <span className="font-semibold text-primary">{progressPct.toFixed(1)}% atingido</span>
                      <span className="text-muted-foreground">Faltam {formatBRL(Math.max(0, targetAmount - initialAmount))}</span>
                    </div>
                  </div>

                  {/* Main stats */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <ResultStat
                      icon={<Calendar size={14} />}
                      label="Você atingirá em"
                      value={formatDuration(monthsNeeded)}
                      highlight
                    />
                    <ResultStat
                      icon={<CheckCircle2 size={14} />}
                      label="Previsão"
                      value={previsionDate ? formatMonthYear(previsionDate) : '—'}
                    />
                    <ResultStat
                      icon={<Wallet size={14} />}
                      label="Valor investido"
                      value={formatBRL(totalInvested)}
                    />
                    <ResultStat
                      icon={<TrendingUp size={14} />}
                      label="Rendimentos"
                      value={formatBRL(totalYield)}
                      positive
                    />
                    <div className="col-span-2 rounded-xl bg-primary text-primary-foreground p-3">
                      <p className="text-[10px] uppercase tracking-wide opacity-80 flex items-center gap-1">
                        <Sparkles size={11} /> Valor acumulado
                      </p>
                      <p className="text-xl font-bold mt-0.5 tabular-nums">{formatBRL(finalBalance)}</p>
                    </div>
                  </div>
                </div>

                {/* Viability */}
                {viability && (
                  <div
                    className={cn(
                      'rounded-2xl border p-4 animate-fade-in',
                      viability.level === 'excellent' && 'border-green-500/40 bg-green-500/10',
                      viability.level === 'moderate' && 'border-yellow-500/40 bg-yellow-500/10',
                      viability.level === 'long' && 'border-red-500/40 bg-red-500/10',
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-lg">{viability.emoji}</span>
                      <p className="text-xs font-bold uppercase tracking-wide">Análise de Viabilidade — {viability.label}</p>
                    </div>
                    <p className="text-xs text-foreground/80">{viability.message}</p>
                  </div>
                )}

                {/* Chart */}
                {chartData.length > 1 && (
                  <div className="rounded-2xl border border-border bg-card p-3 animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <LineChart size={14} className="text-primary" />
                      <h4 className="text-xs font-bold">Evolução financeira</h4>
                    </div>
                    <div className="h-52">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="gfTotal" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                          <XAxis
                            dataKey="m"
                            tickFormatter={(v) => (v >= 12 ? `${Math.round(v / 12)}a` : `${v}m`)}
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={10}
                          />
                          <YAxis
                            tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={10}
                            width={38}
                          />
                          <Tooltip
                            contentStyle={{
                              background: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: 12,
                              fontSize: 11,
                            }}
                            formatter={(v: any) => formatBRL(Number(v))}
                            labelFormatter={(v: any) => `Mês ${v}`}
                          />
                          <Area
                            type="monotone"
                            dataKey="Investido"
                            stroke="hsl(var(--muted-foreground))"
                            fill="hsl(var(--muted-foreground))"
                            fillOpacity={0.1}
                            strokeWidth={1.5}
                          />
                          <Area
                            type="monotone"
                            dataKey="Total"
                            stroke="hsl(var(--primary))"
                            fill="url(#gfTotal)"
                            strokeWidth={2}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Timeline */}
                {milestones.length > 0 && monthsNeeded != null && (
                  <div className="rounded-2xl border border-border bg-card p-4 animate-fade-in">
                    <h4 className="text-xs font-bold mb-3 flex items-center gap-2">
                      <Calendar size={14} className="text-primary" /> Linha do tempo
                    </h4>
                    <div className="relative pl-1">
                      <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-secondary" />
                      <div className="space-y-3">
                        <MilestoneRow pct={0} label="Hoje" date={new Date()} />
                        {milestones.map((ms) => (
                          <MilestoneRow
                            key={ms.pct}
                            pct={ms.pct * 100}
                            label={`${Math.round(ms.pct * 100)}% da meta`}
                            date={ms.months != null ? futureDate(ms.months) : null}
                            duration={ms.months}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Scenarios */}
                {scenarios.length > 0 && (
                  <div className="rounded-2xl border border-border bg-card p-4 animate-fade-in">
                    <h4 className="text-xs font-bold mb-3 flex items-center gap-2">
                      <Zap size={14} className="text-primary" /> Comparação de cenários
                    </h4>
                    <div className="space-y-2">
                      {scenarios.map((s) => (
                        <div
                          key={s.id}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-secondary/40 border border-border/50"
                        >
                          <div>
                            <p className="text-xs text-muted-foreground">Aporte de</p>
                            <p className="text-sm font-bold tabular-nums">{formatBRL(s.monthly)}/mês</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Prazo</p>
                            <p className="text-sm font-bold text-primary">{formatDuration(s.months)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reverse simulation */}
                {reverseRows.length > 0 && (
                  <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 animate-fade-in">
                    <h4 className="text-xs font-bold mb-1 flex items-center gap-2">
                      <Sparkles size={14} className="text-primary" /> Quanto preciso investir para chegar antes?
                    </h4>
                    <p className="text-[11px] text-muted-foreground mb-3">
                      Aporte necessário mantendo a mesma rentabilidade.
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {reverseRows.map((r) => (
                        <div key={r.years} className="rounded-xl bg-card p-2.5 text-center">
                          <p className="text-[10px] uppercase text-muted-foreground">Em {r.years} anos</p>
                          <p className="text-sm font-bold text-primary mt-0.5 tabular-nums">{formatBRL(r.needed)}</p>
                          <p className="text-[10px] text-muted-foreground">por mês</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isPrimary}
                onChange={(e) => setIsPrimary(e.target.checked)}
                className="rounded"
              />
              <Star size={14} className="text-primary" /> Marcar como objetivo principal
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex flex-col sm:flex-row gap-2 bg-card">
          <button
            onClick={onClose}
            className="sm:flex-1 py-2.5 rounded-xl border border-border font-medium text-sm hover:bg-secondary transition-colors"
          >
            Cancelar
          </button>
          {!editing && (
            <button
              onClick={handleCreateMeta}
              disabled={!canSave || creatingMeta || saving}
              className="sm:flex-1 py-2.5 rounded-xl border-2 border-primary text-primary font-semibold text-sm hover:bg-primary/10 disabled:opacity-50 inline-flex items-center justify-center gap-2 transition-all active:scale-[.98]"
            >
              <Target size={14} /> {creatingMeta ? 'Criando...' : 'Criar Meta'}
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!canSave || saving || creatingMeta}
            className="sm:flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 disabled:opacity-50 shadow-lg shadow-primary/20 transition-all active:scale-[.98]"
          >
            {saving ? 'Salvando...' : editing ? 'Salvar' : 'Salvar planejamento'}
          </button>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ number, title }: { number: string; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-2.5">
      <span className="w-5 h-5 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center">
        {number}
      </span>
      <h3 className="text-sm font-semibold">{title}</h3>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[11px] font-medium text-muted-foreground mb-1 block">{label}</label>
      {children}
    </div>
  );
}

function ResultStat({
  icon,
  label,
  value,
  positive,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  positive?: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-xl p-2.5 border',
        highlight ? 'bg-card border-primary/40' : 'bg-card border-border/50',
      )}
    >
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
        {icon}
        {label}
      </p>
      <p className={cn('text-sm font-bold mt-0.5 tabular-nums', positive && 'text-green-500')}>{value}</p>
    </div>
  );
}

function MilestoneRow({
  pct,
  label,
  date,
  duration,
}: {
  pct: number;
  label: string;
  date: Date | null;
  duration?: number | null;
}) {
  return (
    <div className="flex items-start gap-3 relative">
      <div
        className={cn(
          'w-4 h-4 rounded-full border-2 shrink-0 relative z-10 mt-0.5',
          pct === 100 ? 'bg-primary border-primary' : pct === 0 ? 'bg-green-500 border-green-500' : 'bg-card border-primary',
        )}
      />
      <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold">{label}</p>
        <div className="text-right">
          {date && <p className="text-xs text-muted-foreground">{formatMonthYear(date)}</p>}
          {duration != null && duration > 0 && (
            <p className="text-[10px] text-muted-foreground">{formatDuration(duration)}</p>
          )}
        </div>
      </div>
    </div>
  );
}
