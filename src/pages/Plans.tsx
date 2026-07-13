import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { AlertTriangle, Check, Crown, Sparkles, Loader2, ArrowLeft, Mail, FlaskConical, ShieldCheck, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

type MpEnv = {
  mode: 'test' | 'live' | 'unknown';
  configured: boolean;
  collector_email: string | null;
  collector_nickname?: string | null;
  site_id?: string | null;
  error?: string;
};

export default function PlansPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { plans, currentPlanCode, loading, selectPlan } = useSubscription(user?.id);
  const [busy, setBusy] = useState<string | null>(null);
  const [payerEmail, setPayerEmail] = useState('');
  const [checkoutNotice, setCheckoutNotice] = useState<string | null>(null);
  const [mpEnv, setMpEnv] = useState<MpEnv | null>(null);

  useEffect(() => {
    let alive = true;
    supabase.functions.invoke('mp-environment', { body: {} }).then(({ data }) => {
      if (alive && data) setMpEnv(data as MpEnv);
    }).catch(() => { /* silent */ });
    return () => { alive = false; };
  }, []);

  const effectivePayer = (payerEmail.trim() || user?.email || '').toLowerCase();
  const collector = (mpEnv?.collector_email ?? '').toLowerCase();
  const emailMatchesCollector = Boolean(collector && effectivePayer && collector === effectivePayer);
  const isTest = mpEnv?.mode === 'test';
  const isLive = mpEnv?.mode === 'live';


  const currentPlan = plans.find(p => p.code === currentPlanCode);
  const currentPrice = currentPlan?.price_monthly ?? 0;
  const isPaidUser = currentPlanCode !== 'free';

  const handleSelect = async (code: string) => {
    if (code === currentPlanCode) return;
    setBusy(code);
    setCheckoutNotice(null);
    try {
      const targetPlan = plans.find(p => p.code === code);
      const targetPrice = targetPlan?.price_monthly ?? 0;

      // FREE → cancel/downgrade
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

      // Paid → Paid: use upgrade or downgrade edge functions
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
        if (emailMatchesCollector) {
          setCheckoutNotice(
            isTest
              ? 'Use o e-mail de um comprador de teste do Mercado Pago — diferente da conta vendedora.'
              : 'O e-mail informado é da conta que recebe pagamentos. Use outra conta Mercado Pago.',
          );
          toast.error('Informe outro e-mail de pagador');
          return;
        }
        const { data, error } = await supabase.functions.invoke('upgrade-plan', {
          body: {
            plan_code: code,
            back_url: window.location.origin,
            payer_email: payerEmail.trim() || undefined,
          },
        });
        if (error) throw error;
        if ((data as any)?.error) throw new Error((data as any).message ?? (data as any).error);
        const checkoutUrl = (data as any)?.checkout_url;
        if (!checkoutUrl) throw new Error('Não foi possível iniciar o upgrade.');
        toast.success('Redirecionando para o pagamento…');
        window.location.href = checkoutUrl;
        return;
      }

      // Free → Paid: usual create-subscription flow
      if (emailMatchesCollector) {
        setCheckoutNotice(
          isTest
            ? 'Você está no ambiente de teste. Use o e-mail de um comprador de teste do Mercado Pago — diferente da conta vendedora.'
            : 'O e-mail informado é da mesma conta que recebe os pagamentos. Use outra conta Mercado Pago real para pagar.',
        );
        toast.error('Informe outro e-mail de pagador');
        return;
      }
      const { data, error } = await supabase.functions.invoke('create-subscription', {
        body: {
          plan_code: code,
          back_url: window.location.origin,
          payer_email: payerEmail.trim() || undefined,
        },
      });
      if (error) throw error;
      if ((data as any)?.ok === false && (data as any)?.error === 'payer_collector_mode_mismatch') {
        const message = (data as any)?.message ?? 'Informe um e-mail de pagador diferente para continuar.';
        setCheckoutNotice(message);
        toast.error('Mercado Pago recusou o pagador informado');
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
        setCheckoutNotice('Informe um e-mail de pagador compatível com o ambiente do Mercado Pago.');
        toast.error('Informe outro e-mail de pagador');
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

        <div className="mb-6 rounded-2xl border border-border bg-card/70 p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
            <label htmlFor="payer-email" className="text-sm font-semibold flex items-center gap-2">
              <Mail size={16} className="text-primary" /> E-mail do pagador no Mercado Pago
            </label>
            {mpEnv?.configured && (
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide border',
                  isTest && 'bg-amber-500/15 text-amber-600 border-amber-500/30',
                  isLive && 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
                  !isTest && !isLive && 'bg-muted text-muted-foreground border-border',
                )}
                title={mpEnv.collector_email ? `Recebedor: ${mpEnv.collector_email}` : undefined}
              >
                {isTest ? <FlaskConical size={12} /> : isLive ? <ShieldCheck size={12} /> : <Info size={12} />}
                {isTest ? 'Sandbox (teste)' : isLive ? 'Produção' : 'Desconhecido'}
              </span>
            )}
          </div>
          <input
            id="payer-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={payerEmail}
            onChange={(event) => setPayerEmail(event.target.value)}
            placeholder={user?.email ?? 'comprador@exemplo.com'}
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            {isTest
              ? 'Ambiente de teste detectado. Use o e-mail de um comprador de teste criado no painel do Mercado Pago — não use o e-mail da conta vendedora.'
              : isLive
              ? 'Ambiente de produção. Use uma conta Mercado Pago real diferente da conta vendedora para pagar.'
              : 'Se deixar em branco, usaremos o e-mail da sua conta Finango.'}
          </p>
          {emailMatchesCollector && (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span>
                Este e-mail é o mesmo do recebedor no Mercado Pago. O MP não permite pagar para si mesmo — informe outro e-mail
                {isTest ? ' (comprador de teste)' : ' (conta real diferente)'}.
              </span>
            </div>
          )}
          {checkoutNotice && (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span>{checkoutNotice}</span>
            </div>
          )}
        </div>


        <div className="grid gap-4 lg:grid-cols-3">
          {plans.map((plan) => {
            const isCurrent = plan.code === currentPlanCode;
            return (
              <div
                key={plan.id}
                className={cn(
                  'relative p-6 rounded-2xl border transition-all',
                  isCurrent
                    ? 'border-primary ring-2 ring-primary/40 shadow-xl shadow-primary/20 bg-gradient-to-br from-primary/10 via-card to-card scale-[1.02]'
                    : plan.is_highlighted
                    ? 'border-primary shadow-lg shadow-primary/10 bg-card scale-[1.02]'
                    : 'border-border bg-card/50'
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
                  <span className="text-4xl font-bold">
                    R$ {plan.price_monthly.toFixed(2).replace('.', ',')}
                  </span>
                  <span className="text-sm text-muted-foreground">/mês</span>
                </div>

                <ul className="space-y-2 mb-6">
                  {plan.features.map((f, i) => (
                    <li key={i} className={cn('flex items-start gap-2 text-sm', !f.enabled && 'text-muted-foreground/60 line-through')}>
                      <Check size={16} className={cn('shrink-0 mt-0.5', f.enabled ? 'text-primary' : 'text-muted-foreground/40')} />
                      <span>{f.label}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSelect(plan.code)}
                  disabled={isCurrent || busy !== null}
                  className={cn(
                    'w-full py-2.5 rounded-xl font-semibold transition-all touch-scale',
                    isCurrent
                      ? 'bg-primary/15 text-primary ring-1 ring-primary/30 cursor-default'
                      : plan.is_highlighted
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'bg-secondary hover:bg-secondary/80'
                  )}
                >
                  {busy === plan.code ? (
                    <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                  ) : isCurrent ? (
                    <span className="inline-flex items-center gap-1.5"><Check size={16} /> Plano atual</span>
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
    </div>
  );
}
