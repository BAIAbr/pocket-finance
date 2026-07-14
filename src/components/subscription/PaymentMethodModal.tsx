import { useEffect, useState } from 'react';
import { X, QrCode, Repeat, Sparkles, Loader2, Copy, Check } from 'lucide-react';
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
  /** Called when user chose the recurring path — parent still runs the existing MP preapproval flow. */
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
};

const BRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export function PaymentMethodModal({ open, plan, onClose, onChooseRecurring }: Props) {
  const [method, setMethod] = useState<'pix' | 'recurring' | null>(null);
  const [loading, setLoading] = useState(false);
  const [pix, setPix] = useState<PixData | null>(null);
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<string>('pending');

  useEffect(() => {
    if (!open) {
      setMethod(null);
      setPix(null);
      setCopied(false);
      setStatus('pending');
    }
  }, [open]);

  // Poll payment status every 4s while PIX pending
  useEffect(() => {
    if (!pix || status === 'approved') return;
    const t = setInterval(async () => {
      const { data } = await supabase
        .from('payments')
        .select('status')
        .eq('provider_payment_id', pix.payment_id)
        .maybeSingle();
      if (data?.status) {
        setStatus(data.status);
        if (data.status === 'approved') {
          toast.success('Pagamento confirmado! Premium ativado.');
          setTimeout(() => window.location.reload(), 1500);
        }
      }
    }, 4000);
    return () => clearInterval(t);
  }, [pix, status]);

  if (!open || !plan) return null;

  const isFunder = plan.code === 'funder';
  const isYearly = plan.code === 'premium_yearly';
  const durationLabel = isFunder ? 'acesso vitalício' : isYearly ? '365 dias de Premium' : '30 dias de Premium';

  const startPix = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-pix-payment', {
        body: { plan_code: plan.code },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any)?.detail?.message ?? (data as any).error);
      setPix(data as PixData);
      setStatus((data as any).status ?? 'pending');
    } catch (e: any) {
      toast.error(e?.message ?? 'Falha ao gerar o PIX');
    } finally {
      setLoading(false);
    }
  };

  const copyCode = async () => {
    if (!pix?.qr_code) return;
    await navigator.clipboard.writeText(pix.qr_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-card rounded-t-3xl lg:rounded-3xl border border-border shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <div className="text-xs text-muted-foreground">{plan.name}</div>
            <div className="text-lg font-bold">
              {isFunder ? BRL(plan.price_monthly) : `${BRL(plan.price_monthly)}${isYearly ? '/ano' : '/mês'}`}
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-secondary">
            <X size={18} />
          </button>
        </div>

        {!pix ? (
          <div className="p-5 space-y-3">
            <p className="text-sm text-muted-foreground">
              Escolha como quer pagar. Toda transação passa pelo Mercado Pago com criptografia.
            </p>

            <button
              onClick={() => setMethod('pix')}
              className={cn(
                'w-full text-left p-4 rounded-2xl border-2 transition-all',
                method === 'pix' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40',
              )}
            >
              <div className="flex items-center gap-3">
                <QrCode className="text-primary" size={22} />
                <div className="flex-1">
                  <div className="font-semibold flex items-center gap-2">
                    PIX
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-bold">Sem renovação</span>
                  </div>
                  <div className="text-xs text-muted-foreground">Pagamento único • {durationLabel}</div>
                </div>
              </div>
            </button>

            {!isFunder && (
              <button
                onClick={() => setMethod('recurring')}
                className={cn(
                  'w-full text-left p-4 rounded-2xl border-2 transition-all',
                  method === 'recurring' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40',
                )}
              >
                <div className="flex items-center gap-3">
                  <Repeat className="text-primary" size={22} />
                  <div className="flex-1">
                    <div className="font-semibold">Assinatura {isYearly ? 'anual' : 'mensal'} recorrente</div>
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

            <button
              disabled={!method || loading}
              onClick={() => {
                if (method === 'pix') startPix();
                else if (method === 'recurring') onChooseRecurring();
              }}
              className="w-full py-3 rounded-xl font-semibold bg-primary text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-all"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Continuar'}
            </button>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            <div className="text-center">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
                {status === 'approved' ? (
                  <><Check size={12} /> Pagamento confirmado</>
                ) : (
                  <><Loader2 size={12} className="animate-spin" /> Aguardando pagamento</>
                )}
              </div>
              <div className="mt-3 text-2xl font-bold">{BRL(pix.amount)}</div>
              <div className="text-xs text-muted-foreground">{durationLabel}</div>
            </div>

            {pix.qr_code_base64 && (
              <div className="flex justify-center">
                <img
                  src={`data:image/png;base64,${pix.qr_code_base64}`}
                  alt="QR Code PIX"
                  className="w-56 h-56 rounded-xl border border-border bg-white p-2"
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
                    className="flex-1 px-3 py-2 rounded-lg bg-muted text-xs font-mono truncate border border-border"
                  />
                  <button
                    onClick={copyCode}
                    className="px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1.5 hover:bg-primary/90"
                  >
                    {copied ? <><Check size={14} /> Ok</> : <><Copy size={14} /> Copiar</>}
                  </button>
                </div>
              </div>
            )}

            <p className="text-center text-[11px] text-muted-foreground">
              Assim que o PIX for confirmado (normalmente em segundos), seu Premium é ativado automaticamente.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
