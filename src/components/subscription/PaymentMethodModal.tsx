import { useEffect, useMemo, useRef, useState } from 'react';
import {
  X, QrCode, CreditCard, Sparkles, Loader2, Copy, Check,
  ShieldCheck, Zap, PartyPopper,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Plan {
  code: string;
  name: string;
  price_monthly: number;
  description: string | null;
}

interface Props {
  open: boolean;
  plan: Plan | null;
  onClose: () => void;
  /** Called when user chose the recurring/card path — parent runs the MP preapproval flow. */
  onChooseRecurring: () => void;
}

type PixData = {
  payment_id: string;
  qr_code: string | null;
  qr_code_base64: string | null;
  ticket_url: string | null;
  amount: number;
  days: number;
  plan_code: string;
  expires_at?: string | null;
};

type Method = 'pix' | 'card';
type Stage = 'chooser' | 'preparing' | 'pix' | 'success' | 'redirecting';

const BRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const FRIENDLY_ERROR =
  'Não foi possível gerar seu pagamento agora. Aguarde alguns segundos e tente novamente.';

function useCountdown(target: string | null | undefined) {
  const [remaining, setRemaining] = useState<number>(0);
  useEffect(() => {
    if (!target) { setRemaining(0); return; }
    const tick = () => {
      const diff = new Date(target).getTime() - Date.now();
      setRemaining(Math.max(0, Math.floor(diff / 1000)));
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [target]);
  const mm = Math.floor(remaining / 60).toString().padStart(2, '0');
  const ss = (remaining % 60).toString().padStart(2, '0');
  return { seconds: remaining, label: `${mm}:${ss}` };
}

export function PaymentMethodModal({ open, plan, onClose, onChooseRecurring }: Props) {
  const [method, setMethod] = useState<Method | null>(null);
  const [stage, setStage] = useState<Stage>('chooser');
  const [prepareMsg, setPrepareMsg] = useState('Preparando pagamento…');
  const [pix, setPix] = useState<PixData | null>(null);
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<string>('pending');
  const [checkingNow, setCheckingNow] = useState(false);
  const channelRef = useRef<any>(null);
  const successTimer = useRef<number | null>(null);

  const isFunder = plan?.code === 'funder';
  const isYearly = plan?.code === 'premium_yearly';
  const durationLabel = isFunder
    ? 'acesso vitalício'
    : isYearly
    ? '365 dias de Premium'
    : '30 dias de Premium';

  const savings = useMemo(() => {
    if (!plan || !isYearly) return null;
    const monthlyEquivalent = plan.price_monthly / 12;
    // Compare against typical monthly plan (~R$9,90). We show the % off.
    const referenceMonthly = 9.9;
    const yearlyIfMonthly = referenceMonthly * 12;
    if (plan.price_monthly < yearlyIfMonthly) {
      const pct = Math.round((1 - plan.price_monthly / yearlyIfMonthly) * 100);
      return { pct, monthlyEquivalent };
    }
    return { pct: 0, monthlyEquivalent };
  }, [plan, isYearly]);

  const countdown = useCountdown(pix?.expires_at ?? null);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setMethod(null);
      setStage('chooser');
      setPix(null);
      setCopied(false);
      setStatus('pending');
      setCheckingNow(false);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (successTimer.current) {
        clearTimeout(successTimer.current);
        successTimer.current = null;
      }
    }
  }, [open]);

  // Realtime + polling fallback while awaiting PIX
  useEffect(() => {
    if (!pix || status === 'approved') return;

    // Realtime channel on payments row
    const ch = supabase
      .channel(`pay-${pix.payment_id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'payments', filter: `provider_payment_id=eq.${pix.payment_id}` },
        (payload: any) => {
          const s = payload?.new?.status;
          if (s) handleStatusChange(s);
        },
      )
      .subscribe();
    channelRef.current = ch;

    // Polling backup every 3s for up to 2 minutes (aligned with product spec)
    const startedAt = Date.now();
    const MAX_MS = 2 * 60 * 1000;
    const t = setInterval(async () => {
      if (Date.now() - startedAt > MAX_MS) {
        clearInterval(t);
        return;
      }
      const { data } = await supabase
        .from('payments')
        .select('status')
        .eq('provider_payment_id', pix.payment_id)
        .maybeSingle();
      if (data?.status) handleStatusChange(data.status);
    }, 3000);

    return () => {
      clearInterval(t);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pix?.payment_id, status]);

  const handleStatusChange = (s: string) => {
    setStatus(s);
    if (s === 'approved') {
      setStage('success');
      toast.success('Pagamento confirmado! Premium ativado.');
      successTimer.current = window.setTimeout(() => {
        window.location.reload();
      }, 2600);
    }
  };

  if (!open || !plan) return null;

  const startPix = async () => {
    setStage('preparing');
    setPrepareMsg('Criando pagamento PIX…');
    try {
      // Small UX beat so the preparing state is perceivable
      const [{ data, error }] = await Promise.all([
        supabase.functions.invoke('create-pix-payment', { body: { plan_code: plan.code } }),
        new Promise((r) => setTimeout(r, 350)),
      ]);
      if (error) throw error;
      const d = data as any;
      if (d?.error) throw new Error(d?.detail?.message ?? d.error);
      setPrepareMsg('Gerando QR Code…');
      setPix(d as PixData);
      setStatus(d.status ?? 'pending');
      setStage('pix');
    } catch (e: any) {
      console.error('[pix] error', e);
      toast.error(FRIENDLY_ERROR);
      setStage('chooser');
    }
  };

  const startCard = async () => {
    setStage('preparing');
    setPrepareMsg('Conectando ao Mercado Pago…');
    // Give the modal a beat, then delegate to parent (which invokes create-subscription and redirects)
    setTimeout(() => {
      setStage('redirecting');
      setPrepareMsg('Abrindo checkout seguro…');
      onChooseRecurring();
    }, 400);
  };

  const continueClick = () => {
    if (method === 'pix') startPix();
    else if (method === 'card') startCard();
  };

  const copyCode = async () => {
    if (!pix?.qr_code) return;
    try {
      await navigator.clipboard.writeText(pix.qr_code);
      setCopied(true);
      toast.success('Código PIX copiado');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Não foi possível copiar. Selecione manualmente.');
    }
  };

  const forceCheck = async () => {
    if (!pix) return;
    setCheckingNow(true);
    try {
      const { data } = await supabase
        .from('payments')
        .select('status')
        .eq('provider_payment_id', pix.payment_id)
        .maybeSingle();
      if (data?.status === 'approved') {
        handleStatusChange('approved');
      } else {
        toast('Ainda não recebemos a confirmação. Assim que o banco processar, seu Premium é ativado.');
      }
    } finally {
      setCheckingNow(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-card rounded-t-3xl lg:rounded-3xl border border-border shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <div className="text-xs text-muted-foreground">{plan.name}</div>
            <div className="text-lg font-bold">
              {isFunder ? BRL(plan.price_monthly) : `${BRL(plan.price_monthly)}${isYearly ? '/ano' : '/mês'}`}
            </div>
            {savings?.pct ? (
              <div className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                <Sparkles size={10} /> Economize {savings.pct}% no anual
              </div>
            ) : null}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-secondary"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        {/* CHOOSER */}
        {stage === 'chooser' && (
          <div className="p-5 space-y-3">
            <p className="text-sm text-muted-foreground">
              Escolha como quer pagar. Rápido, seguro e criptografado pelo Mercado Pago.
            </p>

            <button
              onClick={() => setMethod('pix')}
              className={cn(
                'w-full text-left p-4 rounded-2xl border-2 transition-all',
                method === 'pix' ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:border-primary/40',
              )}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <QrCode className="text-emerald-600" size={20} />
                </div>
                <div className="flex-1">
                  <div className="font-semibold flex items-center gap-2">
                    PIX
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 font-bold">
                      Instantâneo
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Pague com Nubank, Inter, Itaú, BB e qualquer banco • {durationLabel}
                  </div>
                </div>
              </div>
            </button>

            {!isFunder && (
              <button
                onClick={() => setMethod('card')}
                className={cn(
                  'w-full text-left p-4 rounded-2xl border-2 transition-all',
                  method === 'card' ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:border-primary/40',
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <CreditCard className="text-primary" size={20} />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold">
                      Cartão de crédito {isYearly ? '(anual recorrente)' : '(mensal recorrente)'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Renovação automática • cancele quando quiser
                    </div>
                  </div>
                </div>
              </button>
            )}

            {isFunder && (
              <div className="flex items-start gap-2 rounded-xl bg-primary/5 border border-primary/20 p-3 text-xs">
                <Sparkles size={14} className="mt-0.5 text-primary shrink-0" />
                <span>Plano Fundador é pagamento único via PIX. Você mantém Premium para sempre.</span>
              </div>
            )}

            <div className="flex items-center gap-1.5 pt-1 text-[11px] text-muted-foreground">
              <ShieldCheck size={12} /> Processado pelo Mercado Pago com criptografia.
            </div>

            <button
              disabled={!method}
              onClick={continueClick}
              className="w-full py-3 rounded-xl font-semibold bg-primary text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-all"
            >
              Continuar
            </button>
          </div>
        )}

        {/* PREPARING / REDIRECTING */}
        {(stage === 'preparing' || stage === 'redirecting') && (
          <div className="p-8 flex flex-col items-center text-center gap-3 min-h-[240px] justify-center">
            <div className="relative">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <Loader2 className="w-7 h-7 animate-spin text-primary" />
              </div>
              <Zap size={14} className="absolute -top-1 -right-1 text-primary" />
            </div>
            <div className="font-semibold">{prepareMsg}</div>
            <div className="text-xs text-muted-foreground">Aguarde alguns segundos…</div>
          </div>
        )}

        {/* PIX */}
        {stage === 'pix' && pix && (
          <div className="p-5 space-y-4">
            <div className="text-center">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 text-xs font-bold">
                <Loader2 size={12} className="animate-spin" /> Aguardando pagamento
              </div>
              <div className="mt-3 text-2xl font-bold">{BRL(pix.amount)}</div>
              <div className="text-xs text-muted-foreground">{durationLabel}</div>
              {countdown.seconds > 0 && (
                <div className="mt-1 text-[11px] text-muted-foreground">
                  Expira em <span className="font-mono font-semibold text-foreground">{countdown.label}</span>
                </div>
              )}
            </div>

            {pix.qr_code_base64 && (
              <div className="flex justify-center">
                <img
                  src={`data:image/png;base64,${pix.qr_code_base64}`}
                  alt="QR Code PIX"
                  className="w-60 h-60 rounded-xl border border-border bg-white p-2"
                />
              </div>
            )}

            {pix.qr_code && (
              <div>
                <label className="text-xs text-muted-foreground">Ou copie o código PIX:</label>
                <div className="mt-1 flex gap-2">
                  <input
                    readOnly
                    value={pix.qr_code}
                    onFocus={(e) => e.currentTarget.select()}
                    className="flex-1 px-3 py-2 rounded-lg bg-muted text-xs font-mono truncate border border-border"
                  />
                  <button
                    onClick={copyCode}
                    className={cn(
                      'px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all',
                      copied
                        ? 'bg-emerald-500 text-white'
                        : 'bg-primary text-primary-foreground hover:bg-primary/90',
                    )}
                  >
                    {copied ? <><Check size={14} /> Copiado</> : <><Copy size={14} /> Copiar</>}
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={forceCheck}
              disabled={checkingNow}
              className="w-full py-2.5 rounded-xl font-semibold border border-primary/30 text-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {checkingNow ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Já realizei o pagamento
            </button>

            <div className="rounded-xl bg-muted/60 p-3 text-[11px] text-muted-foreground leading-relaxed">
              Abra o app do seu banco (Nubank, Inter, Itaú, BB, Bradesco, Caixa, Santander, C6, PicPay…),
              escolha <strong>Pagar com PIX</strong>, escaneie o QR ou cole o código. A confirmação chega automaticamente aqui.
            </div>
          </div>
        )}

        {/* SUCCESS */}
        {stage === 'success' && (
          <div className="p-8 flex flex-col items-center text-center gap-3 min-h-[260px] justify-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center animate-in zoom-in">
              <PartyPopper className="w-8 h-8 text-emerald-600" />
            </div>
            <div className="text-xl font-bold">🎉 Pagamento aprovado!</div>
            <div className="text-sm text-muted-foreground">
              Seu Finango Premium já está ativo. Atualizando seu perfil…
            </div>
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground mt-1" />
          </div>
        )}
      </div>
    </div>
  );
}
