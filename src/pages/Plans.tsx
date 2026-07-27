import { useAuth } from '@/contexts/AuthContext';
import { useSubscription, type SubscriptionPlan, type BillingInterval } from '@/hooks/useSubscription';
import { AlertTriangle, Check, Crown, Sparkles, Loader2, ArrowLeft, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PaymentMethodModal } from '@/components/subscription/PaymentMethodModal';

const BRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

const INTERVAL_ORDER: BillingInterval[] = ['month', 'quarter', 'semester', 'year'];
const INTERVAL_LABEL: Record<BillingInterval, string> = {
  month: 'Mensal',
  quarter: 'Trimestral',
  semester: 'Semestral',
  year: 'Anual',
};
const INTERVAL_SUFFIX: Record<BillingInterval, string> = {
  month: '/mês',
  quarter: '/trimestre',
  semester: '/semestre',
  year: '/ano',
};

function planInterval(p: SubscriptionPlan): BillingInterval {
  return (p.billing_interval as BillingInterval | null) ?? 'month';
}
function planMonths(p: SubscriptionPlan): number {
  if (p.interval_count && p.interval_count > 0) return p.interval_count;
  switch (planInterval(p)) {
    case 'quarter': return 3;
    case 'semester': return 6;
    case 'year': return 12;
    default: return 1;
  }
}
function equivalentPerMonth(p: SubscriptionPlan): number {
  return (p.price_monthly || 0) / planMonths(p);
}

export default function PlansPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { plans, currentPlanCode, loading } = useSubscription(user?.id);
  const [busy, setBusy] = useState<string | null>(null);
  const [checkoutNotice, setCheckoutNotice] = useState<string | null>(null);
  const [checkoutDebugJson, setCheckoutDebugJson] = useState<string | null>(null);
  const [methodModalPlan, setMethodModalPlan] = useState<{ code: string; name: string; price_monthly: number; description: string | null } | null>(null);
  // group_code -> selected interval
  const [intervalByGroup, setIntervalByGroup] = useState<Record<string, BillingInterval>>({});

  const currentPlan = plans.find(p => p.code === currentPlanCode);
  const currentPrice = currentPlan?.price_monthly ?? 0;
  const isPaidUser = currentPlanCode !== 'free';

  // Group active plans by plan_group. Plans without a group render individually.
  const { groups, singles } = useMemo(() => {
    const groupsMap = new Map<string, SubscriptionPlan[]>();
    const solo: SubscriptionPlan[] = [];
    for (const p of plans) {
      const g = p.plan_group;
      if (g) {
        const arr = groupsMap.get(g) ?? [];
        arr.push(p);
        groupsMap.set(g, arr);
      } else {
        solo.push(p);
      }
    }
    const groups = Array.from(groupsMap.entries()).map(([code, variants]) => ({
      code,
      variants: variants.sort(
        (a, b) => INTERVAL_ORDER.indexOf(planInterval(a)) - INTERVAL_ORDER.indexOf(planInterval(b)),
      ),
    }));
    return { groups, singles: solo.sort((a, b) => a.sort_order - b.sort_order) };
  }, [plans]);

  const selectedFor = (groupCode: string, variants: SubscriptionPlan[]): SubscriptionPlan => {
    const chosen = intervalByGroup[groupCode];
    if (chosen) {
      const found = variants.find(v => planInterval(v) === chosen);
      if (found) return found;
    }
    // Default: currently-active variant, else highlighted, else first
    return (
      variants.find(v => v.code === currentPlanCode) ??
      variants.find(v => v.is_highlighted) ??
      variants[0]
    );
  };

  const monthlyBaseline = (variants: SubscriptionPlan[]): number => {
    const m = variants.find(v => planInterval(v) === 'month');
    return m ? equivalentPerMonth(m) : 0;
  };

  const savingsPercent = (p: SubscriptionPlan, variants: SubscriptionPlan[]): number => {
    if (p.discount_percent != null) return Math.max(0, Number(p.discount_percent));
    const baseline = monthlyBaseline(variants);
    const eq = equivalentPerMonth(p);
    if (!baseline || !eq || eq >= baseline) return 0;
    return Math.round(((baseline - eq) / baseline) * 100);
  };

  const openMethodModal = (p: SubscriptionPlan) => {
    setMethodModalPlan({ code: p.code, name: p.name, price_monthly: p.price_monthly, description: p.description });
  };

  const handleSelect = async (p: SubscriptionPlan) => {
    const code = p.code;
    if (code === currentPlanCode) return;
    setBusy(code);
    setCheckoutNotice(null);
    setCheckoutDebugJson(null);
    try {
      const targetPrice = p.price_monthly ?? 0;

      if (code === 'free') {
        const { data, error } = await supabase.functions.invoke('downgrade-plan', {
          body: { plan_code: 'free', immediate: true },
        });
        if (error) throw error;
        if ((data as any)?.error) throw new Error((data as any).message ?? (data as any).error);
        toast.success('Plano atualizado para Gratuito');
        window.location.reload();
        return;
      }

      if (!isPaidUser || targetPrice === currentPrice) {
        openMethodModal(p);
        return;
      }

      if (isPaidUser && targetPrice < currentPrice) {
        const { data, error } = await supabase.functions.invoke('downgrade-plan', {
          body: { plan_code: code, immediate: false },
        });
        if (error) throw error;
        if ((data as any)?.error) throw new Error((data as any).message ?? (data as any).error);
        toast.success((data as any)?.message ?? 'Downgrade agendado para o fim do ciclo.');
        return;
      }

      if (isPaidUser && targetPrice > currentPrice) {
        const { data, error } = await supabase.functions.invoke('upgrade-plan', {
          body: { plan_code: code, back_url: window.location.origin },
        });
        if (error) throw error;
        if ((data as any)?.error) throw new Error((data as any).message ?? (data as any).error);
        const checkoutUrl = (data as any)?.checkout_url;
        if (!checkoutUrl) throw new Error('Não foi possível iniciar o upgrade.');
        toast.success('Redirecionando para o pagamento…');
        window.location.href = checkoutUrl;
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-subscription', {
        body: { plan_code: code, back_url: window.location.origin },
      });
      if (error) throw error;
      if ((data as any)?.ok === false && (data as any)?.mercado_pago) {
        const mpDebug = (data as any).mercado_pago;
        setCheckoutNotice((data as any)?.message ?? 'Mercado Pago retornou erro no checkout.');
        setCheckoutDebugJson(JSON.stringify(mpDebug, null, 2));
        toast.error('Mercado Pago retornou erro no checkout');
        return;
      }
      if ((data as any)?.error) throw new Error((data as any)?.message ?? (data as any).error);
      const checkoutUrl = (data as any)?.checkout_url;
      if (!checkoutUrl) throw new Error('Não foi possível iniciar o checkout.');
      toast.success('Redirecionando para o pagamento…');
      window.location.href = checkoutUrl;
    } catch (e: any) {
      const message = e?.message ?? 'Erro ao atualizar plano';
      if (message.includes('Both payer and collector must be real or test users')) {
        setCheckoutNotice('Mercado Pago recusou o e-mail autenticado por incompatibilidade entre conta real e conta de teste.');
        toast.error('Mercado Pago recusou o pagador autenticado');
      } else {
        toast.error(message);
      }
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 lg:pb-8">
      <div className="max-w-5xl mx-auto px-4 lg:px-8 pt-6">
        <button
          onClick={() => navigate('/settings')}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft size={16} /> Voltar
        </button>

        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-3">
            <Sparkles size={14} /> Planos Finango
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold mb-2">Escolha o plano ideal</h1>
          <p className="text-muted-foreground">Comece grátis. Evolua quando quiser.</p>
        </div>

        {(checkoutNotice || checkoutDebugJson) && (
          <div className="mb-6 rounded-2xl border border-border bg-card/70 p-4 shadow-sm">
            {checkoutNotice && (
              <div className="mt-3 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <span>{checkoutNotice}</span>
              </div>
            )}
            {checkoutDebugJson && (
              <pre className="mt-3 max-h-72 overflow-auto rounded-xl border border-border bg-muted/70 p-3 text-xs text-foreground whitespace-pre-wrap break-words">
                {checkoutDebugJson}
              </pre>
            )}
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-3">
          {singles.map((plan) => (
            <SingleCard
              key={plan.id}
              plan={plan}
              isCurrent={plan.code === currentPlanCode}
              busy={busy}
              onSelect={handleSelect}
              isPaidUser={isPaidUser}
              currentPrice={currentPrice}
            />
          ))}

          {groups.map((g) => {
            const selected = selectedFor(g.code, g.variants);
            const savings = savingsPercent(selected, g.variants);
            const isCurrent = selected.code === currentPlanCode;
            const badge = selected.badge_label ?? (selected.is_highlighted ? 'Mais Popular' : null);

            return (
              <div
                key={g.code}
                className={cn(
                  'relative p-6 rounded-2xl border transition-all',
                  isCurrent
                    ? 'border-primary ring-2 ring-primary/40 shadow-xl shadow-primary/20 bg-gradient-to-br from-primary/10 via-card to-card scale-[1.02]'
                    : selected.is_highlighted
                    ? 'border-primary shadow-lg shadow-primary/10 bg-card scale-[1.02]'
                    : 'border-border bg-card/50',
                )}
              >
                {isCurrent ? (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-primary to-orange-400 text-primary-foreground text-xs font-bold flex items-center gap-1 shadow-md">
                    <Check size={12} /> Seu plano atual
                  </div>
                ) : badge ? (
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-primary-foreground text-xs font-semibold flex items-center gap-1 shadow"
                    style={selected.badge_color ? { backgroundColor: selected.badge_color } : undefined}
                  >
                    <Star size={12} /> {badge}
                  </div>
                ) : null}

                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold">{selected.name}</h3>
                  {isCurrent && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-bold uppercase tracking-wide">
                      Ativo
                    </span>
                  )}
                </div>
                {selected.description && (
                  <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{selected.description}</p>
                )}

                {/* Interval selector */}
                {g.variants.length > 1 && (
                  <div className="mt-4 flex gap-1 p-1 rounded-xl bg-secondary/60 overflow-x-auto no-scrollbar">
                    {g.variants.map((v) => {
                      const iv = planInterval(v);
                      const active = v.code === selected.code;
                      return (
                        <button
                          key={v.code}
                          type="button"
                          onClick={() => setIntervalByGroup((s) => ({ ...s, [g.code]: iv }))}
                          className={cn(
                            'flex-1 min-w-[72px] px-2 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap',
                            active
                              ? 'bg-background text-foreground shadow-sm'
                              : 'text-muted-foreground hover:text-foreground',
                          )}
                        >
                          {INTERVAL_LABEL[iv]}
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="mt-4 mb-2">
                  <span className="text-4xl font-bold transition-all">
                    {BRL(selected.price_monthly)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {INTERVAL_SUFFIX[planInterval(selected)]}
                  </span>
                </div>

                {planInterval(selected) !== 'month' && (
                  <p className="text-xs text-muted-foreground mb-2">
                    Equivale a {BRL(equivalentPerMonth(selected))}/mês
                  </p>
                )}

                {savings > 0 && (
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 mb-4 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 text-xs font-semibold">
                    Economize {savings}%
                  </div>
                )}

                <ul className="space-y-2 mb-6 mt-2">
                  {selected.features.map((f, i) => (
                    <li
                      key={i}
                      className={cn(
                        'flex items-start gap-2 text-sm',
                        !f.enabled && 'text-muted-foreground/60 line-through',
                      )}
                    >
                      <Check
                        size={16}
                        className={cn('shrink-0 mt-0.5', f.enabled ? 'text-primary' : 'text-muted-foreground/40')}
                      />
                      <span>{f.label}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSelect(selected)}
                  disabled={isCurrent || busy !== null}
                  className={cn(
                    'w-full py-2.5 rounded-xl font-semibold transition-all touch-scale',
                    isCurrent
                      ? 'bg-primary/15 text-primary ring-1 ring-primary/30 cursor-default'
                      : selected.is_highlighted
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'bg-secondary hover:bg-secondary/80',
                  )}
                >
                  {busy === selected.code ? (
                    <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                  ) : isCurrent ? (
                    <span className="inline-flex items-center gap-1.5"><Check size={16} /> Plano atual</span>
                  ) : isPaidUser && selected.price_monthly > currentPrice ? (
                    'Fazer upgrade'
                  ) : isPaidUser && selected.price_monthly < currentPrice ? (
                    'Fazer downgrade'
                  ) : (
                    'Selecionar'
                  )}
                </button>
              </div>
            );
          })}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8">
          Você pode trocar ou cancelar seu plano a qualquer momento.
        </p>
      </div>

      <PaymentMethodModal
        open={!!methodModalPlan}
        plan={methodModalPlan}
        onClose={() => setMethodModalPlan(null)}
        onChooseRecurring={async () => {
          if (!methodModalPlan) return;
          const code = methodModalPlan.code;
          setMethodModalPlan(null);
          try {
            const { data, error } = await supabase.functions.invoke('create-subscription', {
              body: { plan_code: code, back_url: window.location.origin },
            });
            if (error) throw error;
            if ((data as any)?.error) throw new Error((data as any)?.message ?? (data as any).error);
            const checkoutUrl = (data as any)?.checkout_url;
            if (!checkoutUrl) throw new Error('Não foi possível iniciar o checkout.');
            window.location.href = checkoutUrl;
          } catch (e: any) {
            toast.error(e?.message ?? 'Erro ao iniciar assinatura');
          }
        }}
      />
    </div>
  );
}

function SingleCard({
  plan, isCurrent, busy, onSelect, isPaidUser, currentPrice,
}: {
  plan: SubscriptionPlan;
  isCurrent: boolean;
  busy: string | null;
  onSelect: (p: SubscriptionPlan) => void;
  isPaidUser: boolean;
  currentPrice: number;
}) {
  return (
    <div
      className={cn(
        'relative p-6 rounded-2xl border transition-all',
        isCurrent
          ? 'border-primary ring-2 ring-primary/40 shadow-xl shadow-primary/20 bg-gradient-to-br from-primary/10 via-card to-card scale-[1.02]'
          : plan.is_highlighted
          ? 'border-primary shadow-lg shadow-primary/10 bg-card scale-[1.02]'
          : 'border-border bg-card/50',
      )}
    >
      {isCurrent ? (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-primary to-orange-400 text-primary-foreground text-xs font-bold flex items-center gap-1 shadow-md">
          <Check size={12} /> Seu plano atual
        </div>
      ) : plan.is_highlighted ? (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1">
          <Crown size={12} /> Mais popular
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        <h3 className="text-xl font-bold">{plan.name}</h3>
        {isCurrent && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-bold uppercase tracking-wide">
            Ativo
          </span>
        )}
      </div>
      {plan.description && (
        <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{plan.description}</p>
      )}

      <div className="mt-4 mb-6">
        <span className="text-4xl font-bold">{BRL(plan.price_monthly)}</span>
        <span className="text-sm text-muted-foreground">/mês</span>
      </div>

      <ul className="space-y-2 mb-6">
        {plan.features.map((f, i) => (
          <li
            key={i}
            className={cn(
              'flex items-start gap-2 text-sm',
              !f.enabled && 'text-muted-foreground/60 line-through',
            )}
          >
            <Check
              size={16}
              className={cn('shrink-0 mt-0.5', f.enabled ? 'text-primary' : 'text-muted-foreground/40')}
            />
            <span>{f.label}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={() => onSelect(plan)}
        disabled={isCurrent || busy !== null}
        className={cn(
          'w-full py-2.5 rounded-xl font-semibold transition-all touch-scale',
          isCurrent
            ? 'bg-primary/15 text-primary ring-1 ring-primary/30 cursor-default'
            : plan.is_highlighted
            ? 'bg-primary text-primary-foreground hover:bg-primary/90'
            : 'bg-secondary hover:bg-secondary/80',
        )}
      >
        {busy === plan.code ? (
          <Loader2 className="w-4 h-4 animate-spin mx-auto" />
        ) : isCurrent ? (
          <span className="inline-flex items-center gap-1.5"><Check size={16} /> Plano atual</span>
        ) : plan.code === 'free' ? (
          'Voltar ao Gratuito'
        ) : isPaidUser && plan.price_monthly > currentPrice ? (
          'Fazer upgrade'
        ) : isPaidUser && plan.price_monthly < currentPrice ? (
          'Fazer downgrade'
        ) : (
          'Selecionar'
        )}
      </button>
    </div>
  );
}
