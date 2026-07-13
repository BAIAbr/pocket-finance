import { useEffect, useState } from 'react';
import { History, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface LogRow {
  id: string;
  event_type: string;
  plan_code: string | null;
  status: string | null;
  metadata: any;
  created_at: string;
}

const EVENT_LABELS: Record<string, string> = {
  subscription_created: 'Assinatura criada',
  subscription_activated: 'Assinatura ativada',
  subscription_cancelled: 'Assinatura cancelada',
  subscription_renewed: 'Renovação',
  subscription_upgraded: 'Upgrade de plano',
  subscription_downgraded: 'Downgrade de plano',
  payment_approved: 'Pagamento aprovado',
  payment_rejected: 'Pagamento recusado',
  payment_pending: 'Pagamento pendente',
  coupon_applied: 'Cupom aplicado',
  vip_redeemed: 'Código VIP resgatado',
  webhook_received: 'Notificação Mercado Pago',
  trial_started: 'Período gratuito iniciado',
  trial_ended: 'Período gratuito finalizado',
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function SubscriptionLogs() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let alive = true;
    supabase.functions.invoke('subscription-logs', { body: {} })
      .then(({ data }) => {
        if (!alive) return;
        const rows = (data as any)?.logs ?? [];
        setLogs(rows);
      })
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  const visible = showAll ? logs : logs.slice(0, 5);

  return (
    <section className="card-finance">
      <div className="flex items-center gap-2 mb-3">
        <History size={16} className="text-primary" />
        <h2 className="font-semibold">Histórico da assinatura</h2>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 size={18} className="animate-spin text-muted-foreground" />
        </div>
      ) : logs.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum evento registrado ainda.</p>
      ) : (
        <>
          <ul className="divide-y divide-border/40">
            {visible.map((log) => {
              const label = EVENT_LABELS[log.event_type] ?? log.event_type;
              const isOpen = expanded === log.id;
              const hasMeta = log.metadata && Object.keys(log.metadata).length > 0;
              return (
                <li key={log.id} className="py-2.5">
                  <button
                    onClick={() => hasMeta && setExpanded(isOpen ? null : log.id)}
                    className={cn(
                      'w-full flex items-center justify-between gap-3 text-left',
                      hasMeta && 'hover:opacity-80',
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{label}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {formatDate(log.created_at)}
                        {log.plan_code ? ` · ${log.plan_code}` : ''}
                        {log.status ? ` · ${log.status}` : ''}
                      </p>
                    </div>
                    {hasMeta && (isOpen ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />)}
                  </button>
                  {isOpen && hasMeta && (
                    <pre className="mt-2 p-2 rounded-lg bg-muted text-[10px] font-mono overflow-x-auto whitespace-pre-wrap break-all">
                      {JSON.stringify(log.metadata, null, 2)}
                    </pre>
                  )}
                </li>
              );
            })}
          </ul>
          {logs.length > 5 && (
            <button
              onClick={() => setShowAll(v => !v)}
              className="w-full mt-3 py-2 rounded-lg text-xs font-medium text-primary hover:bg-primary/5"
            >
              {showAll ? 'Mostrar menos' : `Ver todos (${logs.length})`}
            </button>
          )}
        </>
      )}
    </section>
  );
}
