import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Play, CheckCircle2, AlertTriangle, XCircle, Clock, Download,
  Shield, Database, CreditCard, Sparkles, Zap, Users, Layout,
  TrendingUp, Wallet, RefreshCw, HeartPulse,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type Severity = 'ok' | 'warn' | 'fail' | 'skip';
type Priority = 'high' | 'medium' | 'low';

interface CheckResult {
  id: string;
  module: string;
  name: string;
  severity: Severity;
  priority: Priority;
  message: string;
  fix?: string;
  duration_ms: number;
  target?: string;
}

interface ModuleDef {
  id: string;
  label: string;
  icon: any;
  checks: Array<{
    id: string;
    name: string;
    priority: Priority;
    target?: string;
    fix?: string;
    run: () => Promise<Omit<CheckResult, 'id' | 'module' | 'name' | 'duration_ms' | 'priority' | 'target' | 'fix'>>;
  }>;
}

interface AuditRun {
  ts: number;
  duration_ms: number;
  score: number;
  total: number;
  ok: number;
  warn: number;
  fail: number;
  results: CheckResult[];
}

const HISTORY_KEY = 'finango.audit.history.v1';

// Helpers
async function pingTable(table: string) {
  const t0 = performance.now();
  const { error } = await supabase.from(table as any).select('*', { count: 'exact', head: true }).limit(1);
  const dt = performance.now() - t0;
  if (error) return { severity: 'fail' as Severity, message: `Erro: ${error.message}`, dt };
  if (dt > 1500) return { severity: 'warn' as Severity, message: `Lento (${dt.toFixed(0)}ms)`, dt };
  return { severity: 'ok' as Severity, message: `OK (${dt.toFixed(0)}ms)`, dt };
}

async function pingFn(name: string, body: any = {}) {
  const t0 = performance.now();
  try {
    const { error } = await supabase.functions.invoke(name, { body });
    const dt = performance.now() - t0;
    if (error && !/non-2xx/i.test(error.message)) {
      return { severity: 'fail' as Severity, message: error.message, dt };
    }
    if (dt > 3000) return { severity: 'warn' as Severity, message: `Lento (${dt.toFixed(0)}ms)`, dt };
    return { severity: 'ok' as Severity, message: `Respondeu (${dt.toFixed(0)}ms)`, dt };
  } catch (e: any) {
    return { severity: 'fail' as Severity, message: e?.message ?? 'Erro desconhecido', dt: performance.now() - t0 };
  }
}

function buildModules(): ModuleDef[] {
  return [
    {
      id: 'auth', label: 'Autenticação', icon: Shield,
      checks: [
        {
          id: 'session', name: 'Sessão ativa', priority: 'high',
          fix: 'Reautenticar o usuário',
          run: async () => {
            const { data } = await supabase.auth.getSession();
            return data.session ? { severity: 'ok', message: 'Sessão válida' } : { severity: 'fail', message: 'Sem sessão' };
          },
        },
        {
          id: 'user', name: 'JWT + user_id', priority: 'high',
          run: async () => {
            const { data } = await supabase.auth.getUser();
            return data.user?.id ? { severity: 'ok', message: `uid ${data.user.id.slice(0, 8)}…` } : { severity: 'fail', message: 'JWT inválido' };
          },
        },
        {
          id: 'profile', name: 'Perfil carregável', priority: 'medium', target: 'profiles',
          run: async () => pingTable('profiles').then(r => ({ severity: r.severity, message: r.message })),
        },
      ],
    },
    {
      id: 'dashboard', label: 'Dashboard', icon: Layout,
      checks: [
        { id: 'tx', name: 'Transações acessíveis', priority: 'high', target: 'transactions', run: async () => pingTable('transactions').then(r => ({ severity: r.severity, message: r.message })) },
        { id: 'cat', name: 'Categorias acessíveis', priority: 'medium', target: 'categories', run: async () => pingTable('categories').then(r => ({ severity: r.severity, message: r.message })) },
        { id: 'prefs', name: 'Preferências', priority: 'low', target: 'user_preferences', run: async () => pingTable('user_preferences').then(r => ({ severity: r.severity, message: r.message })) },
      ],
    },
    {
      id: 'receitas', label: 'Receitas / Despesas', icon: TrendingUp,
      checks: [
        { id: 'read', name: 'Leitura de lançamentos', priority: 'high', target: 'transactions', run: async () => pingTable('transactions').then(r => ({ severity: r.severity, message: r.message })) },
        { id: 'recur', name: 'Recorrências', priority: 'medium', target: 'recurring_transactions', run: async () => pingTable('recurring_transactions').then(r => ({ severity: r.severity, message: r.message })) },
        { id: 'inst', name: 'Parcelamentos', priority: 'medium', target: 'installment_purchases', run: async () => pingTable('installment_purchases').then(r => ({ severity: r.severity, message: r.message })) },
      ],
    },
    {
      id: 'planning', label: 'Planejamento & Metas', icon: TrendingUp,
      checks: [
        { id: 'goals', name: 'Metas financeiras', priority: 'medium', target: 'financial_goals', run: async () => pingTable('financial_goals').then(r => ({ severity: r.severity, message: r.message })) },
        { id: 'savings', name: 'Cofrinho', priority: 'medium', target: 'piggy_bank', run: async () => pingTable('piggy_bank').then(r => ({ severity: r.severity, message: r.message })) },
      ],
    },
    {
      id: 'investments', label: 'Investimentos', icon: Wallet,
      checks: [
        { id: 'assets', name: 'Ativos', priority: 'medium', target: 'investment_assets', run: async () => pingTable('investment_assets').then(r => ({ severity: r.severity, message: r.message })) },
        { id: 'divs', name: 'Dividendos', priority: 'low', target: 'investment_dividends', run: async () => pingTable('investment_dividends').then(r => ({ severity: r.severity, message: r.message })) },
        {
          id: 'quote', name: 'Cotação de mercado (edge)', priority: 'medium', target: 'market-quote',
          fix: 'Verificar deploy e chave BRAPI',
          run: async () => pingFn('market-quote', { symbol: 'PETR4' }),
        },
      ],
    },
    {
      id: 'premium', label: 'Premium & Planos', icon: Sparkles,
      checks: [
        { id: 'plans', name: 'subscription_plans', priority: 'high', target: 'subscription_plans', run: async () => pingTable('subscription_plans').then(r => ({ severity: r.severity, message: r.message })) },
        { id: 'subs', name: 'user_subscriptions', priority: 'high', target: 'user_subscriptions', run: async () => pingTable('user_subscriptions').then(r => ({ severity: r.severity, message: r.message })) },
        { id: 'flags', name: 'feature_flags', priority: 'medium', target: 'feature_flags', run: async () => pingTable('feature_flags').then(r => ({ severity: r.severity, message: r.message })) },
        { id: 'limits', name: 'plan_limits', priority: 'medium', target: 'plan_limits', run: async () => pingTable('plan_limits').then(r => ({ severity: r.severity, message: r.message })) },
      ],
    },
    {
      id: 'mp', label: 'Mercado Pago', icon: CreditCard,
      checks: [
        {
          id: 'env', name: 'Credenciais / /users/me', priority: 'high', target: 'mp-environment',
          fix: 'Reconferir MERCADO_PAGO_ACCESS_TOKEN',
          run: async () => {
            const t0 = performance.now();
            try {
              const { data, error } = await supabase.functions.invoke('mp-environment');
              const dt = performance.now() - t0;
              if (error) return { severity: 'fail' as Severity, message: error.message };
              if (!data?.configured) return { severity: 'fail' as Severity, message: 'Sem credencial' };
              if (data.mode === 'unknown') return { severity: 'warn' as Severity, message: 'Modo desconhecido' };
              return { severity: 'ok' as Severity, message: `mode=${data.mode} (${dt.toFixed(0)}ms)` };
            } catch (e: any) {
              return { severity: 'fail' as Severity, message: e?.message ?? 'Erro' };
            }
          },
        },
        { id: 'payments', name: 'Histórico de pagamentos', priority: 'medium', target: 'payments', run: async () => pingTable('payments').then(r => ({ severity: r.severity, message: r.message })) },
      ],
    },
    {
      id: 'db', label: 'Banco de Dados', icon: Database,
      checks: [
        { id: 'notif', name: 'notifications_log', priority: 'low', target: 'notifications_log', run: async () => pingTable('notifications_log').then(r => ({ severity: r.severity, message: r.message })) },
        { id: 'audit', name: 'security_events', priority: 'medium', target: 'security_events', run: async () => pingTable('security_events').then(r => ({ severity: r.severity, message: r.message })) },
        { id: 'analytics', name: 'user_analytics', priority: 'low', target: 'user_analytics', run: async () => pingTable('user_analytics').then(r => ({ severity: r.severity, message: r.message })) },
      ],
    },
    {
      id: 'security', label: 'Segurança', icon: Shield,
      checks: [
        {
          id: 'roles', name: 'RLS user_roles (isolado)', priority: 'high', target: 'user_roles',
          run: async () => {
            const { data, error } = await supabase.from('user_roles').select('*').limit(50);
            if (error) return { severity: 'fail' as Severity, message: error.message };
            const { data: u } = await supabase.auth.getUser();
            const foreign = (data ?? []).some((r: any) => r.user_id !== u.user?.id);
            return foreign
              ? { severity: 'fail' as Severity, message: 'RLS possivelmente aberta' }
              : { severity: 'ok' as Severity, message: 'Isolado por usuário' };
          },
        },
        {
          id: 'https', name: 'Origem HTTPS', priority: 'medium',
          run: async () => location.protocol === 'https:' || location.hostname === 'localhost'
            ? { severity: 'ok' as Severity, message: location.protocol }
            : { severity: 'warn' as Severity, message: 'Sem HTTPS' },
        },
      ],
    },
    {
      id: 'perf', label: 'Performance', icon: Zap,
      checks: [
        {
          id: 'nav', name: 'Tempo de carregamento',
          priority: 'low',
          run: async () => {
            const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
            if (!nav) return { severity: 'skip' as Severity, message: 'Sem métricas' };
            const t = nav.loadEventEnd - nav.startTime;
            if (t > 5000) return { severity: 'warn' as Severity, message: `${t.toFixed(0)}ms` };
            return { severity: 'ok' as Severity, message: `${t.toFixed(0)}ms` };
          },
        },
        {
          id: 'mem', name: 'Uso de memória (heap)',
          priority: 'low',
          run: async () => {
            const p: any = (performance as any).memory;
            if (!p) return { severity: 'skip' as Severity, message: 'Não disponível' };
            const mb = p.usedJSHeapSize / 1e6;
            if (mb > 300) return { severity: 'warn' as Severity, message: `${mb.toFixed(0)}MB` };
            return { severity: 'ok' as Severity, message: `${mb.toFixed(0)}MB` };
          },
        },
        {
          id: 'online', name: 'Conectividade', priority: 'high',
          run: async () => navigator.onLine
            ? { severity: 'ok' as Severity, message: 'Online' }
            : { severity: 'fail' as Severity, message: 'Offline' },
        },
      ],
    },
    {
      id: 'family', label: 'Modo Família', icon: Users,
      checks: [
        { id: 'fam', name: 'families', priority: 'medium', target: 'families', run: async () => pingTable('families').then(r => ({ severity: r.severity, message: r.message })) },
        { id: 'members', name: 'family_members', priority: 'medium', target: 'family_members', run: async () => pingTable('family_members').then(r => ({ severity: r.severity, message: r.message })) },
      ],
    },
  ];
}

const sevMeta: Record<Severity, { color: string; icon: any; label: string }> = {
  ok: { color: 'text-emerald-500', icon: CheckCircle2, label: 'OK' },
  warn: { color: 'text-amber-500', icon: AlertTriangle, label: 'Aviso' },
  fail: { color: 'text-rose-500', icon: XCircle, label: 'Erro' },
  skip: { color: 'text-muted-foreground', icon: Clock, label: 'Skip' },
};

function classify(score: number) {
  if (score >= 95) return { label: 'Excelente', color: 'text-emerald-500', bg: 'bg-emerald-500/10' };
  if (score >= 85) return { label: 'Boa', color: 'text-lime-500', bg: 'bg-lime-500/10' };
  if (score >= 70) return { label: 'Atenção', color: 'text-amber-500', bg: 'bg-amber-500/10' };
  return { label: 'Crítica', color: 'text-rose-500', bg: 'bg-rose-500/10' };
}

export default function AuditCenter() {
  const modules = useMemo(() => buildModules(), []);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [results, setResults] = useState<CheckResult[]>([]);
  const [lastRun, setLastRun] = useState<AuditRun | null>(null);
  const [history, setHistory] = useState<AuditRun[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) {
        const h: AuditRun[] = JSON.parse(raw);
        setHistory(h);
        if (h[0]) { setLastRun(h[0]); setResults(h[0].results); }
      }
    } catch {}
  }, []);

  const totals = useMemo(() => {
    const total = results.length;
    const ok = results.filter(r => r.severity === 'ok').length;
    const warn = results.filter(r => r.severity === 'warn').length;
    const fail = results.filter(r => r.severity === 'fail').length;
    const score = total === 0 ? 0 : Math.round(((ok + warn * 0.5) / total) * 100);
    return { total, ok, warn, fail, score };
  }, [results]);

  const runAudit = async () => {
    setRunning(true);
    setResults([]);
    setProgress({});
    const t0 = performance.now();
    const all: CheckResult[] = [];

    await Promise.all(
      modules.map(async (mod) => {
        let done = 0;
        for (const c of mod.checks) {
          const c0 = performance.now();
          let res: Awaited<ReturnType<typeof c.run>>;
          try { res = await c.run(); }
          catch (e: any) { res = { severity: 'fail', message: e?.message ?? 'Falha' }; }
          const dt = performance.now() - c0;
          all.push({
            id: `${mod.id}.${c.id}`,
            module: mod.label,
            name: c.name,
            priority: c.priority,
            target: c.target,
            fix: c.fix,
            duration_ms: dt,
            ...res,
          });
          done++;
          setProgress(p => ({ ...p, [mod.id]: Math.round((done / mod.checks.length) * 100) }));
          setResults([...all]);
        }
      })
    );

    const duration_ms = performance.now() - t0;
    const total = all.length;
    const ok = all.filter(r => r.severity === 'ok').length;
    const warn = all.filter(r => r.severity === 'warn').length;
    const fail = all.filter(r => r.severity === 'fail').length;
    const score = total === 0 ? 0 : Math.round(((ok + warn * 0.5) / total) * 100);

    const run: AuditRun = { ts: Date.now(), duration_ms, score, total, ok, warn, fail, results: all };
    const newHistory = [run, ...history].slice(0, 20);
    setHistory(newHistory);
    setLastRun(run);
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory)); } catch {}
    setRunning(false);

    toast({
      title: `Auditoria concluída — ${classify(score).label}`,
      description: `${ok} OK · ${warn} avisos · ${fail} erros · ${(duration_ms / 1000).toFixed(1)}s`,
    });
  };

  const exportJSON = () => {
    if (!lastRun) return;
    const blob = new Blob([JSON.stringify(lastRun, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `finango-auditoria-${new Date(lastRun.ts).toISOString()}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    if (!lastRun) return;
    const header = ['modulo', 'teste', 'severidade', 'prioridade', 'mensagem', 'alvo', 'duracao_ms'];
    const rows = lastRun.results.map(r => [r.module, r.name, r.severity, r.priority, r.message, r.target ?? '', r.duration_ms.toFixed(0)]);
    const csv = [header, ...rows].map(l => l.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `finango-auditoria-${new Date(lastRun.ts).toISOString()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const cls = classify(totals.score);

  return (
    <div className="space-y-6">
      {/* Header / Health */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-3">
            <div className={cn('p-3 rounded-2xl', cls.bg)}>
              <HeartPulse className={cn('w-6 h-6', cls.color)} />
            </div>
            <div>
              <CardTitle className="text-xl">Centro de Auditoria</CardTitle>
              <p className="text-xs text-muted-foreground">
                {lastRun
                  ? `Última: ${new Date(lastRun.ts).toLocaleString('pt-BR')} · ${(lastRun.duration_ms / 1000).toFixed(1)}s · ${lastRun.total} testes`
                  : 'Nenhuma auditoria executada ainda.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={runAudit} disabled={running} className="gap-2">
              {running ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {running ? 'Executando…' : 'Executar Auditoria'}
            </Button>
            <Button variant="outline" size="icon" onClick={exportJSON} disabled={!lastRun} title="Exportar JSON">
              <Download className="w-4 h-4" />
            </Button>
            <Button variant="outline" onClick={exportCSV} disabled={!lastRun}>CSV</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className={cn('rounded-xl p-4 border', cls.bg)}>
              <div className="text-xs text-muted-foreground">Saúde Geral</div>
              <div className={cn('text-3xl font-bold', cls.color)}>{totals.score}%</div>
              <div className={cn('text-xs font-medium', cls.color)}>{cls.label}</div>
            </div>
            <StatBox label="Testes" value={totals.total} />
            <StatBox label="OK" value={totals.ok} tint="text-emerald-500" />
            <StatBox label="Avisos" value={totals.warn} tint="text-amber-500" />
            <StatBox label="Erros" value={totals.fail} tint="text-rose-500" />
          </div>
          <Progress value={totals.score} className="h-2" />
        </CardContent>
      </Card>

      {/* Module progress */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {modules.map((m) => {
          const modResults = results.filter(r => r.module === m.label);
          const pct = progress[m.id] ?? (modResults.length ? Math.round((modResults.length / m.checks.length) * 100) : 0);
          const modFail = modResults.filter(r => r.severity === 'fail').length;
          const modWarn = modResults.filter(r => r.severity === 'warn').length;
          const Icon = m.icon;
          return (
            <Card key={m.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-primary" />
                    <span className="font-medium text-sm">{m.label}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {modFail > 0 && <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">{modFail}</Badge>}
                    {modWarn > 0 && <Badge className="h-5 px-1.5 text-[10px] bg-amber-500/20 text-amber-600 hover:bg-amber-500/20">{modWarn}</Badge>}
                  </div>
                </div>
                <Progress value={pct} className="h-1.5" />
                <div className="text-[11px] text-muted-foreground">
                  {modResults.length}/{m.checks.length} · {pct}%
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Results table */}
      {results.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Resultados</CardTitle></CardHeader>
          <CardContent className="space-y-1.5">
            {['fail', 'warn', 'ok', 'skip'].flatMap(sev =>
              results
                .filter(r => r.severity === (sev as Severity))
                .sort((a, b) => (a.priority === b.priority ? 0 : a.priority === 'high' ? -1 : b.priority === 'high' ? 1 : a.priority === 'medium' ? -1 : 1))
                .map((r) => {
                  const meta = sevMeta[r.severity];
                  const Icon = meta.icon;
                  return (
                    <div key={r.id} className="flex items-start gap-3 py-2 px-3 rounded-lg border border-border/40 hover:bg-muted/40">
                      <Icon className={cn('w-4 h-4 mt-0.5 shrink-0', meta.color)} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">{r.name}</span>
                          <Badge variant="outline" className="h-5 text-[10px]">{r.module}</Badge>
                          <Badge variant="secondary" className="h-5 text-[10px]">
                            {r.priority === 'high' ? 'Alta' : r.priority === 'medium' ? 'Média' : 'Baixa'}
                          </Badge>
                          {r.target && <Badge variant="outline" className="h-5 text-[10px] font-mono">{r.target}</Badge>}
                          <span className="ml-auto text-[10px] text-muted-foreground">{r.duration_ms.toFixed(0)}ms</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">{r.message}</div>
                        {r.severity !== 'ok' && r.fix && (
                          <div className="text-[11px] text-primary mt-0.5">💡 {r.fix}</div>
                        )}
                      </div>
                    </div>
                  );
                })
            )}
          </CardContent>
        </Card>
      )}

      {/* History */}
      {history.length > 1 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Histórico</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {history.map((h, i) => {
              const c = classify(h.score);
              return (
                <button
                  key={h.ts}
                  onClick={() => { setLastRun(h); setResults(h.results); }}
                  className="w-full flex items-center justify-between text-sm py-2 px-3 rounded-lg hover:bg-muted/40"
                >
                  <span className="text-muted-foreground">
                    {i === 0 ? 'Mais recente · ' : ''}
                    {new Date(h.ts).toLocaleString('pt-BR')}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{h.ok}✓ / {h.warn}⚠ / {h.fail}✗</span>
                    <span className={cn('font-semibold', c.color)}>{h.score}%</span>
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatBox({ label, value, tint }: { label: string; value: number; tint?: string }) {
  return (
    <div className="rounded-xl p-4 border bg-card">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn('text-3xl font-bold', tint)}>{value}</div>
    </div>
  );
}
