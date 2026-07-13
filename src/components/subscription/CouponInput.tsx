import { useState } from 'react';
import { Ticket, Loader2, Check, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Props {
  planCode?: string;
  onApplied?: () => void;
}

export function CouponInput({ planCode, onApplied }: Props) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const apply = async () => {
    const trimmed = code.trim();
    if (!trimmed) return;
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('apply-coupon', {
        body: { code: trimmed, plan_code: planCode },
      });
      if (error) throw error;
      if ((data as any)?.ok === false || (data as any)?.error) {
        const msg = (data as any)?.message ?? (data as any)?.error ?? 'Cupom inválido';
        setResult({ ok: false, message: msg });
        toast.error(msg);
        return;
      }
      const msg = (data as any)?.message ?? 'Cupom aplicado com sucesso!';
      setResult({ ok: true, message: msg });
      toast.success(msg);
      setCode('');
      onApplied?.();
    } catch (e: any) {
      const msg = e?.message ?? 'Erro ao aplicar cupom';
      setResult({ ok: false, message: msg });
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="card-finance">
      <div className="flex items-center gap-2 mb-3">
        <Ticket size={16} className="text-primary" />
        <h2 className="font-semibold">Cupom de desconto</h2>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Tem um cupom? Aplique-o para ganhar dias grátis ou desconto no próximo pagamento.
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && apply()}
          placeholder="DIGITE O CÓDIGO"
          className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm font-mono uppercase tracking-wider outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          disabled={loading}
        />
        <button
          onClick={apply}
          disabled={loading || !code.trim()}
          className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-sm touch-scale disabled:opacity-50 flex items-center gap-1.5"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : 'Aplicar'}
        </button>
      </div>
      {result && (
        <div
          className={cn(
            'mt-3 flex items-start gap-2 rounded-xl p-3 text-sm border',
            result.ok
              ? 'bg-success/10 border-success/30 text-success'
              : 'bg-destructive/10 border-destructive/30 text-destructive',
          )}
        >
          {result.ok ? <Check size={16} className="mt-0.5 shrink-0" /> : <AlertCircle size={16} className="mt-0.5 shrink-0" />}
          <span>{result.message}</span>
        </div>
      )}
    </section>
  );
}
