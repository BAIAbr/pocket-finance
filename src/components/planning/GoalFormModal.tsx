import { useState, useMemo, useEffect } from 'react';
import { X, Home, Car, Plane, GraduationCap, Laptop, Heart, PiggyBank, Building2, Target, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFinancialGoals, FinancialGoal } from '@/hooks/useFinancialGoals';
import { useEffectiveFinance } from '@/hooks/useEffectiveFinance';
import { cdiPercentageToAnnualRate } from '@/hooks/useCdiYield';
import { simulateGoal, monthsToReach, requiredMonthlyContribution, addMonths } from '@/lib/planning/calculations';

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

const CDI_PRESETS = [100, 105, 110, 120, 130];

const iconMap: Record<string, any> = { Home, Car, Plane, GraduationCap, Laptop, Heart, PiggyBank, Building2, Target };

export function GoalFormModal({ isOpen, onClose, editing }: Props) {
  const { createGoal, updateGoal } = useFinancialGoals();
  const { piggyBanks, categories, formatCurrency } = useEffectiveFinance() as any;

  const [title, setTitle] = useState('');
  const [goalType, setGoalType] = useState('custom');
  const [targetAmount, setTargetAmount] = useState<string>('');
  const [initialAmount, setInitialAmount] = useState<string>('');
  const [monthly, setMonthly] = useState<string>('');
  const [targetDate, setTargetDate] = useState<string>('');
  const [cdiPct, setCdiPct] = useState<number>(100);
  const [customRate, setCustomRate] = useState<string>('');
  const [useCustomRate, setUseCustomRate] = useState(false);
  const [piggyId, setPiggyId] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [isPrimary, setIsPrimary] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (editing) {
      setTitle(editing.title);
      setGoalType(editing.goal_type);
      setTargetAmount(String(editing.target_amount));
      setInitialAmount(String(editing.initial_amount));
      setMonthly(String(editing.monthly_contribution));
      setTargetDate(editing.target_date ?? '');
      setCdiPct(Number(editing.cdi_percentage));
      setCustomRate(editing.custom_annual_rate != null ? String(editing.custom_annual_rate) : '');
      setUseCustomRate(editing.custom_annual_rate != null);
      setPiggyId(editing.piggy_bank_id ?? '');
      setCategoryId(editing.category_id ?? '');
      setIsPrimary(editing.is_primary);
    } else {
      setTitle(''); setGoalType('custom'); setTargetAmount(''); setInitialAmount('0');
      setMonthly(''); setTargetDate(''); setCdiPct(100); setCustomRate(''); setUseCustomRate(false);
      setPiggyId(''); setCategoryId(''); setIsPrimary(false);
    }
  }, [isOpen, editing]);

  const annualRate = useMemo(() => {
    if (useCustomRate && customRate) return Number(customRate);
    return cdiPercentageToAnnualRate(cdiPct);
  }, [useCustomRate, customRate, cdiPct]);

  const target = Number(targetAmount) || 0;
  const initial = Number(initialAmount) || 0;
  const monthlyN = Number(monthly) || 0;

  const monthsNeeded = useMemo(() => (target > 0 ? monthsToReach(target, initial, monthlyN, annualRate) : null), [target, initial, monthlyN, annualRate]);

  const monthsUntilTargetDate = useMemo(() => {
    if (!targetDate) return null;
    const now = new Date();
    const d = new Date(targetDate);
    return Math.max(0, Math.round((d.getFullYear() - now.getFullYear()) * 12 + (d.getMonth() - now.getMonth())));
  }, [targetDate]);

  const horizonMonths = monthsUntilTargetDate ?? monthsNeeded ?? 60;
  const sim = useMemo(() => simulateGoal({ initial, monthly: monthlyN, annualRate, months: horizonMonths }), [initial, monthlyN, annualRate, horizonMonths]);
  const last = sim[sim.length - 1];
  const totalYield = last?.yield ?? 0;
  const totalInvested = last?.invested ?? initial;
  const finalBalance = last?.balance ?? initial;
  const effectiveRatePct = totalInvested > 0 ? (totalYield / totalInvested) * 100 : 0;

  const requiredMonthly = useMemo(() => {
    if (!monthsUntilTargetDate || target <= 0) return null;
    return requiredMonthlyContribution(target, initial, annualRate, monthsUntilTargetDate);
  }, [monthsUntilTargetDate, target, initial, annualRate]);

  const suggestion = useMemo(() => {
    if (target <= 0 || !monthsNeeded) return null;
    const faster = monthsToReach(target, initial, monthlyN * 1.4, annualRate);
    if (faster && faster < monthsNeeded) {
      const diff = monthsNeeded - faster;
      return `Aumentando o aporte em 40% (R$ ${(monthlyN * 1.4).toFixed(0)}) você conclui ${diff} ${diff === 1 ? 'mês' : 'meses'} antes.`;
    }
    return null;
  }, [target, initial, monthlyN, annualRate, monthsNeeded]);

  const previsionDate = monthsNeeded != null ? addMonths(new Date(), monthsNeeded) : null;

  const handleSave = async () => {
    if (!title.trim() || target <= 0) return;
    setSaving(true);
    const payload = {
      title: title.trim(),
      goal_type: goalType,
      icon: GOAL_TYPES.find(g => g.key === goalType)?.icon ?? 'Target',
      color: '#FF6A00',
      target_amount: target,
      initial_amount: initial,
      monthly_contribution: monthlyN,
      target_date: targetDate || null,
      cdi_percentage: cdiPct,
      custom_annual_rate: useCustomRate && customRate ? Number(customRate) : null,
      category_id: categoryId || null,
      piggy_bank_id: piggyId || null,
      is_primary: isPrimary,
    };
    const ok = editing ? await updateGoal(editing.id, payload) : await createGoal(payload as any);
    setSaving(false);
    if (ok) onClose();
  };

  if (!isOpen) return null;

  const scopedPiggy = (piggyBanks as any[]) ?? [];
  const cats = (categories as any[]) ?? [];

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm animate-fade-in flex items-end lg:items-center lg:justify-center">
      <div className="w-full lg:max-w-2xl bg-card border border-border rounded-t-3xl lg:rounded-3xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-lg font-bold">{editing ? 'Editar objetivo' : 'Novo objetivo'}</h2>
            <p className="text-xs text-muted-foreground">Simulação em tempo real — sem IA, tudo calculado localmente.</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-secondary"><X size={18} /></button>
        </div>

        <div className="overflow-y-auto p-5 space-y-5">
          {/* Type grid */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">Tipo de objetivo</label>
            <div className="grid grid-cols-3 lg:grid-cols-5 gap-2">
              {GOAL_TYPES.map(t => {
                const Ic = iconMap[t.icon];
                const active = goalType === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => { setGoalType(t.key); if (!title) setTitle(t.label); }}
                    className={cn(
                      'flex flex-col items-center gap-1 p-2.5 rounded-xl border transition-all touch-scale',
                      active ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-secondary'
                    )}
                  >
                    <Ic size={20} />
                    <span className="text-[11px] font-medium">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Nome do objetivo</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Comprar meu carro"
              className="w-full px-3 py-2.5 rounded-xl bg-secondary/50 border border-border text-sm focus:outline-none focus:border-primary" />
          </div>

          {/* Amounts */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Valor desejado</label>
              <input type="number" value={targetAmount} onChange={e => setTargetAmount(e.target.value)} placeholder="0,00"
                className="w-full px-3 py-2.5 rounded-xl bg-secondary/50 border border-border text-sm focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Valor inicial</label>
              <input type="number" value={initialAmount} onChange={e => setInitialAmount(e.target.value)} placeholder="0,00"
                className="w-full px-3 py-2.5 rounded-xl bg-secondary/50 border border-border text-sm focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Aporte mensal</label>
              <input type="number" value={monthly} onChange={e => setMonthly(e.target.value)} placeholder="0,00"
                className="w-full px-3 py-2.5 rounded-xl bg-secondary/50 border border-border text-sm focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Data alvo (opcional)</label>
              <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-secondary/50 border border-border text-sm focus:outline-none focus:border-primary" />
            </div>
          </div>

          {/* Rate */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">Rentabilidade</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {CDI_PRESETS.map(p => (
                <button key={p} onClick={() => { setUseCustomRate(false); setCdiPct(p); }}
                  className={cn('px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
                    !useCustomRate && cdiPct === p ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-secondary')}>
                  {p}% CDI
                </button>
              ))}
              <button onClick={() => setUseCustomRate(true)}
                className={cn('px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
                  useCustomRate ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-secondary')}>
                Personalizada
              </button>
            </div>
            {useCustomRate && (
              <input type="number" step="0.01" value={customRate} onChange={e => setCustomRate(e.target.value)}
                placeholder="Taxa anual em % (ex: 12.5)"
                className="w-full px-3 py-2.5 rounded-xl bg-secondary/50 border border-border text-sm focus:outline-none focus:border-primary" />
            )}
            <p className="text-[11px] text-muted-foreground mt-1">Taxa anual efetiva: <span className="font-semibold text-foreground">{annualRate.toFixed(2)}%</span></p>
          </div>

          {/* Optional links */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Cofrinho (opcional)</label>
              <select value={piggyId} onChange={e => setPiggyId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-secondary/50 border border-border text-sm focus:outline-none focus:border-primary">
                <option value="">Nenhum</option>
                {scopedPiggy.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Categoria (opcional)</label>
              <select value={categoryId} onChange={e => setCategoryId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-secondary/50 border border-border text-sm focus:outline-none focus:border-primary">
                <option value="">Nenhuma</option>
                {cats.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={isPrimary} onChange={e => setIsPrimary(e.target.checked)} className="rounded" />
            <Star size={14} className="text-primary" /> Marcar como objetivo principal
          </label>

          {/* Simulation panel */}
          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 space-y-3">
            <h3 className="text-sm font-bold flex items-center gap-2"><Target size={14} className="text-primary" /> Simulação</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Stat label="Tempo até a meta" value={monthsNeeded == null ? '—' : `${monthsNeeded} ${monthsNeeded === 1 ? 'mês' : 'meses'}`} />
              <Stat label="Data prevista" value={previsionDate ? previsionDate.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }) : '—'} />
              <Stat label={monthsUntilTargetDate ? `Saldo em ${monthsUntilTargetDate}m` : 'Saldo no horizonte'} value={formatCurrency ? formatCurrency(finalBalance) : `R$ ${finalBalance.toFixed(2)}`} />
              <Stat label="Total investido" value={formatCurrency ? formatCurrency(totalInvested) : `R$ ${totalInvested.toFixed(2)}`} />
              <Stat label="Total rendido" value={formatCurrency ? formatCurrency(totalYield) : `R$ ${totalYield.toFixed(2)}`} positive />
              <Stat label="Rentabilidade" value={`${effectiveRatePct.toFixed(2)}%`} positive />
            </div>
            {monthsUntilTargetDate != null && requiredMonthly != null && (
              <div className="rounded-xl bg-card p-3 text-xs">
                Para atingir <b>{formatCurrency ? formatCurrency(target) : target}</b> até essa data, o aporte necessário é{' '}
                <b className="text-primary">{formatCurrency ? formatCurrency(requiredMonthly) : requiredMonthly.toFixed(2)}</b>/mês.
              </div>
            )}
            {suggestion && (
              <div className="rounded-xl bg-card p-3 text-xs">💡 {suggestion}</div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-border flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-border font-medium text-sm hover:bg-secondary">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving || !title.trim() || target <= 0}
            className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 disabled:opacity-50">
            {saving ? 'Salvando...' : editing ? 'Salvar' : 'Criar objetivo'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="rounded-xl bg-card p-2.5">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn('text-sm font-bold mt-0.5', positive && 'text-green-500')}>{value}</p>
    </div>
  );
}
