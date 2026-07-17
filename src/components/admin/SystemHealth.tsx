import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Activity, Database, Server, ShieldCheck, Cpu, RefreshCw,
  CheckCircle2, AlertTriangle, XCircle, Loader2, Clock,
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type Status = 'ok' | 'warn' | 'error' | 'loading';

interface Check {
  id: string;
  label: string;
  description: string;
  status: Status;
  detail?: string;
  latencyMs?: number;
  icon: any;
}

const STATUS_META: Record<Status, { text: string; bg: string; Icon: any; label: string }> = {
  ok:      { text: 'text-emerald-500',   bg: 'bg-emerald-500/10',   Icon: CheckCircle2,   label: 'Operacional' },
  warn:    { text: 'text-amber-500',     bg: 'bg-amber-500/10',     Icon: AlertTriangle,  label: 'Atenção' },
  error:   { text: 'text-destructive',   bg: 'bg-destructive/10',   Icon: XCircle,        label: 'Crítico' },
  loading: { text: 'text-muted-foreground', bg: 'bg-secondary',     Icon: Loader2,        label: 'Verificando' },
};

async function timed<T>(fn: () => Promise<T>): Promise<{ result: T | null; ms: number; error: any }> {
  const start = performance.now();
  try {
    const result = await fn();
    return { result, ms: Math.round(performance.now() - start), error: null };
  } catch (e) {
    return { result: null, ms: Math.round(performance.now() - start), error: e };
  }
}

export default function SystemHealth() {
  const [checks, setChecks] = useState<Check[]>([]);
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState<Date | null>(null);

  const runChecks = useCallback(async () => {
    setRunning(true);

    const base: Check[] = [
      { id: 'db',         label: 'Banco de dados',        description: 'Conexão e leitura em profiles', status: 'loading', icon: Database },
      { id: 'auth',       label: 'Autenticação',           description: 'Sessão ativa do admin',         status: 'loading', icon: ShieldCheck },
      { id: 'edge',       label: 'Edge Functions',         description: 'Ping em mp-environment',        status: 'loading', icon: Server },
      { id: 'realtime',   label: 'Realtime',               description: 'Canal de teste',                status: 'loading', icon: Activity },
      { id: 'storage',    label: 'Storage',                description: 'Listagem do bucket avatars',    status: 'loading', icon: Cpu },
      { id: 'errors',     label: 'Erros recentes',         description: 'Eventos críticos (24h)',        status: 'loading', icon: AlertTriangle },
      { id: 'sessions',   label: 'Sessões (24h)',          description: 'Volume nas últimas 24h',        status: 'loading', icon: Clock },
    ];
    setChecks(base);
    const update = (id: string, patch: Partial<Check>) =>
      setChecks(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));

    // DB
    {
      const r = await timed(() => supabase.from('profiles').select('user_id', { count: 'exact', head: true }));
      update('db', {
        status: r.error ? 'error' : r.ms > 1500 ? 'warn' : 'ok',
        latencyMs: r.ms,
        detail: r.error ? String(r.error?.message ?? r.error) : `Latência ${r.ms}ms`,
      });
    }
    // Auth
    {
      const r = await timed(() => supabase.auth.getSession());
      const hasSession = !!(r.result as any)?.data?.session;
      update('auth', {
        status: r.error ? 'error' : hasSession ? 'ok' : 'warn',
        latencyMs: r.ms,
        detail: hasSession ? 'Sessão válida' : 'Sem sessão ativa',
      });
    }
    // Edge
    {
      const r = await timed(() => supabase.functions.invoke('mp-environment', { body: {} }));
      update('edge', {
        status: r.error ? 'error' : r.ms > 4000 ? 'warn' : 'ok',
        latencyMs: r.ms,
        detail: r.error ? 'Falha ao invocar' : `Resposta em ${r.ms}ms`,
      });
    }
    // Realtime
    {
      const r = await timed(() => new Promise<boolean>((resolve) => {
        const ch = supabase.channel(`health-${Date.now()}`);
        const timer = setTimeout(() => { supabase.removeChannel(ch); resolve(false); }, 4000);
        ch.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            clearTimeout(timer);
            supabase.removeChannel(ch);
            resolve(true);
          }
        });
      }));
      update('realtime', {
        status: r.result ? 'ok' : 'warn',
        latencyMs: r.ms,
        detail: r.result ? `Conectado em ${r.ms}ms` : 'Sem confirmação',
      });
    }
    // Storage
    {
      const r = await timed(() => supabase.storage.from('avatars').list('', { limit: 1 }));
      update('storage', {
        status: r.error || (r.result as any)?.error ? 'error' : 'ok',
        latencyMs: r.ms,
        detail: r.error ? 'Falha ao listar' : `Latência ${r.ms}ms`,
      });
    }
    // Recent errors (security_events)
    {
      const since = subDays(new Date(), 1).toISOString();
      const r = await timed(() =>
        supabase.from('security_events')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', since)
          .in('event_type', ['login_failed', 'password_reset_failed', 'error']),
      );
      const count = (r.result as any)?.count ?? 0;
      update('errors', {
        status: r.error ? 'warn' : count > 20 ? 'warn' : 'ok',
        detail: r.error ? 'Consulta indisponível' : `${count} eventos em 24h`,
      });
    }
    // Sessions volume
    {
      const since = subDays(new Date(), 1).toISOString();
      const r = await timed(() =>
        supabase.from('user_sessions')
          .select('id', { count: 'exact', head: true })
          .gte('login_at', since),
      );
      const count = (r.result as any)?.count ?? 0;
      update('sessions', {
        status: r.error ? 'warn' : 'ok',
        detail: r.error ? 'Consulta indisponível' : `${count} logins em 24h`,
      });
    }

    setLastRun(new Date());
    setRunning(false);
  }, []);

  useEffect(() => { runChecks(); }, [runChecks]);

  const summary = useMemo(() => {
    const ok = checks.filter(c => c.status === 'ok').length;
    const warn = checks.filter(c => c.status === 'warn').length;
    const err = checks.filter(c => c.status === 'error').length;
    const total = checks.length || 1;
    const score = Math.round((ok / total) * 100);
    const badge: Status = err > 0 ? 'error' : warn > 0 ? 'warn' : 'ok';
    return { ok, warn, err, score, badge };
  }, [checks]);

  const badgeMeta = STATUS_META[summary.badge];

  return (
    <div className="space-y-4">
      {/* Header summary */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${badgeMeta.bg} ${badgeMeta.text}`}>
              <badgeMeta.Icon size={22} className={summary.badge === 'loading' ? 'animate-spin' : ''} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-lg font-bold">Saúde do sistema</p>
                <Badge variant="outline" className={badgeMeta.text}>{badgeMeta.label}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {summary.ok} operacionais · {summary.warn} atenção · {summary.err} críticos
                {lastRun && ` · Atualizado ${format(lastRun, "dd/MM 'às' HH:mm", { locale: ptBR })}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[11px] text-muted-foreground">Score</p>
              <p className="text-2xl font-bold text-primary">{summary.score}%</p>
            </div>
            <Button onClick={runChecks} disabled={running} size="sm" variant="outline" className="gap-2">
              <RefreshCw size={14} className={running ? 'animate-spin' : ''} />
              {running ? 'Verificando' : 'Rodar novamente'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Checks grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {checks.map((c) => {
          const meta = STATUS_META[c.status];
          const Icon = c.icon;
          const StatusIcon = meta.Icon;
          return (
            <Card key={c.id}>
              <CardHeader className="pb-2 flex-row items-center justify-between gap-2 space-y-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                    <Icon size={16} />
                  </div>
                  <CardTitle className="text-sm">{c.label}</CardTitle>
                </div>
                <div className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${meta.bg} ${meta.text}`}>
                  <StatusIcon size={12} className={c.status === 'loading' ? 'animate-spin' : ''} />
                  {meta.label}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-muted-foreground">{c.description}</p>
                {c.detail && <p className="text-xs mt-1 font-medium">{c.detail}</p>}
                {typeof c.latencyMs === 'number' && (
                  <p className="text-[10px] text-muted-foreground mt-1">Latência: {c.latencyMs}ms</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
