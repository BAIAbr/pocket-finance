import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { AlertTriangle, Check, Crown, Sparkles, Loader2, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PaymentMethodModal } from '@/components/subscription/PaymentMethodModal';

export default function PlansPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { plans, currentPlanCode, loading } = useSubscription(user?.id);
  const [busy, setBusy] = useState<string | null>(null);
  const [checkoutNotice, setCheckoutNotice] = useState<string | null>(null);
  const [checkoutDebugJson, setCheckoutDebugJson] = useState<string | null>(null);
  const [methodModalPlan, setMethodModalPlan] = useState<{ code: string; name: string; price_monthly: number; description: string | null } | null>(null);


  const currentPlan = plans.find(p => p.code === currentPlanCode);
  const currentPrice = currentPlan?.price_monthly ?? 0;
  const isPaidUser = currentPlanCode !== 'free';

  const handleSelect = async (code: string) => {
    if (code === currentPlanCode) return;
    setBusy(code);
    setCheckoutNotice(null);
    setCheckoutDebugJson(null);
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
        const { data, error } = await supabase.functions.invoke('upgrade-plan', {
          body: {
            plan_code: code,
            back_url: window.location.origin,
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
      const { data, error } = await supabase.functions.invoke('create-subscription', {
        body: {
          plan_code: code,
          back_url: window.location.origin,
        },
      });
      if (error) throw error;
      if ((data as any)?.ok === false && (data as any)?.mercado_pago) {
        const mpDebug = (data as any).mercado_pago;
        setCheckoutNotice((data as any)?.message ?? 'Mercado Pago retornou erro no checkout.');
        setCheckoutDebugJson(JSON.stringify(mpDebug, null, 2));
        toast.error('Mercado Pago retornou erro no checkout');
        return;
      }
      if ((data as any)?.ok === false && (data as any)?.error === 'payer_collector_mode_mismatch') {
        const message = (data as any)?.message ?? 'Mercado Pago recusou o pagador autenticado.';
        setCheckoutNotice(message);
        toast.error('Mercado Pago recusou o pagador autenticado');
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
          })}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8">
          Você pode trocar ou cancelar seu plano a qualquer momento.
        </p>
      </div>
    </div>
  );
}
