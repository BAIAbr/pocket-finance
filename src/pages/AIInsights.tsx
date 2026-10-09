import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useFinanceContext } from '@/contexts/FinanceContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, Sparkles, RefreshCw, AlertTriangle, Lightbulb, ArrowUpRight,
  Wallet, TrendingUp, Target, Calendar, MessageCircle, Send, X, CheckCircle2,
  ShieldAlert, Star, Loader2, ArrowRight, Repeat, Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FinangoReport {
  saudacao: string;
  resumo_intro: string;
  diagnostico: {
    positivos: { titulo: string; descricao: string; valor?: string }[];
    atencao: { titulo: string; descricao: string; valor?: string }[];
  };
  alertas: { tipo: string; titulo: string; descricao: string; severidade: 'info' | 'warning' | 'critical' }[];
  recomendacoes: { acao: string; motivo: string; impacto: string }[];
  comparativos: {
    '3_meses': { receita: number; despesa: number; economia: number };
    '6_meses': { receita: number; despesa: number; economia: number };
    '12_meses': { receita: number; despesa: number; economia: number };
  };
  finango_score: {
    pontuacao: number;
    classificacao: string;
    fatores: string[];
  };
  metas_analise: { nome: string; progresso_percentual: number; tempo_estimado: string; sugestao: string }[];
  previsao_mes: {
    saldo_previsto: number;
    economia_prevista: number;
    proximos_vencimentos: { descricao: string; valor: number; quando: string }[];
    maior_gasto_esperado: { categoria: string; valor_estimado: number };
  };
  assinaturas_detectadas: { descricao: string; valor: number; frequencia: string }[];
}

const CACHE_KEY = 'finango_ia_report_v1';

/** Maps a piece of AI text to an EXISTING page of the app (presentation only). */
function actionFor(text: string): { label: string; to: string } {
  const t = (text || '').toLowerCase();
  if (/recorr|assinatura|mensalidade/.test(t)) return { label: 'Ver recorrências', to: '/recurring' };
  if (/cart[aã]o|fatura|cr[eé]dito/.test(t)) return { label: 'Ver cartões', to: '/cards' };
  if (/invest|aporte|a[cç][aã]o|fii|renda fixa/.test(t)) return { label: 'Ver investimentos', to: '/investments' };
  if (/reserva|emerg|planej|patrim/.test(t)) return { label: 'Ver planejamento', to: '/planning' };
  if (/meta|cofrinho|objetivo|guardar|poupa/.test(t)) return { label: 'Ver metas', to: '/savings' };
  if (/receita|entrada|sal[aá]rio|renda/.test(t)) return { label: 'Ver entradas', to: '/history' };
  return { label: 'Ver despesas', to: '/history' };
}

function categoryFor(text: string): string {
  const to = actionFor(text).to;
  return to === '/investments' ? 'Investimentos'
    : to === '/savings' || to === '/planning' ? 'Metas'
    : to === '/recurring' || to === '/cards' ? 'Gastos'
    : 'Economia';
}

export default function AIInsights() {
  const { formatCurrency, transactions } = useFinanceContext();
  const navigate = useNavigate();
  const [report, setReport] = useState<FinangoReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSignature, setLastSignature] = useState<string | null>(null);
  const [lastAt, setLastAt] = useState<number | null>(null);
  const [showAllInsights, setShowAllInsights] = useState(false);
  const [showAllRecs, setShowAllRecs] = useState(false);

  // Signature = number of transactions + latest date; recomputes only on real changes
  const currentSignature = `${transactions?.length ?? 0}::${transactions?.[0]?.date ?? ''}`;

  const analyze = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Faça login primeiro');

      const response = await supabase.functions.invoke('analyze-finances', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (response.error) throw response.error;
      if (response.data?.error) throw new Error(response.data.error);
      const at = Date.now();
      setReport(response.data);
      setLastSignature(currentSignature);
      setLastAt(at);
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ report: response.data, signature: currentSignature, at }));
      } catch {}
    } catch (err: any) {
      setError(err.message || 'Erro ao gerar análise');
    } finally {
      setLoading(false);
    }
  }, [currentSignature]);

  // Load cache + auto-refresh when signature changes
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setReport(parsed.report);
        setLastSignature(parsed.signature);
        setLastAt(parsed.at ?? null);
        if (parsed.signature !== currentSignature && Date.now() - parsed.at > 60_000) {
          analyze();
        }
      } else {
        analyze();
      }
    } catch {
      analyze();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isStale = lastSignature !== null && lastSignature !== currentSignature;
  const valid = report && !('error' in (report as any));
  const lastLabel = lastAt
    ? new Date(lastAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    : null;

  // Fox Insights = existing diagnosis + alerts from analyze-finances (no new data)
  const insights: { kind: 'attention' | 'positive' | 'alert'; title: string; desc: string; value?: string; severity?: string }[] = valid
    ? [
        ...(report!.alertas ?? []).map(a => ({ kind: 'alert' as const, title: a.titulo, desc: a.descricao, severity: a.severidade })),
        ...(report!.diagnostico?.atencao ?? []).map(d => ({ kind: 'attention' as const, title: d.titulo, desc: d.descricao, value: d.valor })),
        ...(report!.diagnostico?.positivos ?? []).map(d => ({ kind: 'positive' as const, title: d.titulo, desc: d.descricao, value: d.valor })),
      ]
    : [];

  return (
    <div className="min-h-screen bg-background pb-24 safe-top">
      <main className="px-4 lg:px-8 pt-6 space-y-8 max-w-5xl mx-auto">
        {/* ===== 1. Hero — Panorama financeiro ===== */}
        <section className="card-finance relative overflow-hidden" aria-labelledby="fox-title">
          <div className="grid gap-5 md:grid-cols-[1fr_240px] md:items-center">
            <div className="min-w-0">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-primary flex items-center gap-1.5">
                  <Sparkles size={12} /> Copiloto Fox
                </p>
                <button
                  onClick={analyze}
                  disabled={loading}
                  className="shrink-0 h-10 px-3 rounded-xl border border-border bg-secondary/60 hover:bg-secondary flex items-center gap-2 text-xs font-medium touch-scale disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
                  aria-label="Atualizar análise"
                >
                  <RefreshCw size={15} className={cn(loading && 'animate-spin')} />
                </button>
              </div>
              <h1 id="fox-title" className="text-2xl lg:text-3xl font-bold tracking-tight mt-1">Seu panorama financeiro</h1>
              <p className="text-sm text-muted-foreground mt-1">O Fox analisou os dados financeiros disponíveis e destaca o que importa agora.</p>
              <div className="flex flex-wrap items-center gap-2 mt-4">
                <FoxStatusPill loading={loading} error={!!error} stale={isStale} ready={!!valid} />
                {lastLabel && (
                  <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1">
                    <Clock size={11} /> Última análise · {lastLabel}
                  </span>
                )}
                <button
                  onClick={analyze}
                  disabled={loading}
                  className="hidden md:inline-flex h-9 px-3 rounded-xl border border-border bg-secondary/60 hover:bg-secondary items-center gap-2 text-xs font-medium touch-scale disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Atualizar análise"
                >
                  <RefreshCw size={14} className={cn(loading && 'animate-spin')} /> Atualizar análise
                </button>
              </div>
            </div>
            <FoxScoreCard score={valid ? report!.finango_score : undefined} loading={loading && !valid} />
          </div>
        </section>

        {error && (
          <div role="alert" className="card-finance border-destructive/30 bg-destructive/5 flex items-start gap-3">
            <AlertTriangle size={18} className="text-destructive shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Não foi possível atualizar sua análise agora.</p>
              <p className="text-xs text-muted-foreground mt-0.5 break-words">{error}</p>
              <button onClick={analyze} className="text-sm text-primary font-medium mt-2 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded">Tentar novamente</button>
            </div>
          </div>
        )}

        {isStale && valid && !loading && (
          <button
            onClick={analyze}
            className="w-full card-finance border-primary/30 flex items-center justify-center gap-2 py-3 text-sm text-primary font-medium touch-scale"
          >
            <Sparkles size={16} /> Novos lançamentos detectados — atualizar análise
          </button>
        )}

        {!valid && (
          <FoxSection label="Resumo do Fox" title="O que está acontecendo">
            <div className="border-l-2 border-primary/60 pl-4 py-1">
              {loading ? (
                <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> O Fox está analisando suas finanças…</p>
              ) : (
                <p className="text-sm text-muted-foreground">Seu Fox ainda está analisando seus dados.</p>
              )}
            </div>
          </FoxSection>
        )}

        <AnimatePresence mode="wait">
          {valid && (
            <motion.div key="report" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              {/* ===== 2. O que está acontecendo ===== */}
              <FoxSection label="Resumo do Fox" title="O que está acontecendo">
                <div className="border-l-2 border-primary/60 pl-4 py-1">
                  {report!.saudacao && <p className="text-base lg:text-lg font-semibold leading-snug">{report!.saudacao}</p>}
                  {report!.resumo_intro && <p className="text-sm lg:text-base text-foreground/80 mt-1.5 leading-relaxed">{report!.resumo_intro}</p>}
                  {report!.comparativos && (
                    <p className="text-xs text-muted-foreground mt-3 flex flex-wrap gap-x-3 gap-y-1">
                      <span className="font-mono uppercase tracking-wider text-[10px]">Economia</span>
                      {(['3_meses', '6_meses', '12_meses'] as const).map(k => {
                        const c = report!.comparativos[k];
                        if (!c) return null;
                        return (
                          <span key={k}>
                            {k.replace('_meses', 'm')} ·{' '}
                            <span className={cn('font-mono font-semibold', (c.economia || 0) >= 0 ? 'text-income' : 'text-expense')}>
                              {formatCurrency(c.economia || 0)}
                            </span>
                          </span>
                        );
                      })}
                    </p>
                  )}
                </div>
              </FoxSection>

              {/* ===== 3. O que merece sua atenção ===== */}
              <FoxSection label="Fox Insights" title="O que merece sua atenção">
                {insights.length === 0 ? (
                  <EmptyFox />
                ) : (
                  <>
                    <div className="grid md:grid-cols-3 gap-3">
                      {(showAllInsights ? insights : insights.slice(0, 3)).map((it, i) => (
                        <FoxInsightCard key={i} {...it} onAction={(to) => navigate(to)} />
                      ))}
                    </div>
                    {insights.length > 3 && (
                      <ToggleLink open={showAllInsights} onClick={() => setShowAllInsights(v => !v)} more="Ver todos os insights" />
                    )}
                  </>
                )}
              </FoxSection>

              {/* ===== 4. O que fazer agora ===== */}
              {report!.recomendacoes?.length > 0 && (
                <FoxSection label="Recomendações do Fox" title="O que fazer agora">
                  <div className="grid md:grid-cols-2 gap-3">
                    {(showAllRecs ? report!.recomendacoes : report!.recomendacoes.slice(0, 2)).map((r, i) => {
                      const act = actionFor(`${r.acao} ${r.motivo}`);
                      return (
                        <article key={i} className="rounded-xl border border-border bg-card p-4 flex flex-col">
                          <div className="flex items-start gap-3">
                            <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                              <Lightbulb size={15} aria-hidden />
                            </span>
                            <div className="min-w-0">
                              <p className="font-semibold text-sm">{r.acao}</p>
                              <p className="text-xs text-muted-foreground mt-1">{r.motivo}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => navigate(act.to)}
                            className="mt-3 self-start min-h-[40px] inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                          >
                            {act.label} <ArrowRight size={13} />
                          </button>
                        </article>
                      );
                    })}
                  </div>
                  {report!.recomendacoes.length > 2 && (
                    <ToggleLink open={showAllRecs} onClick={() => setShowAllRecs(v => !v)} more="Ver todas as recomendações" />
                  )}
                </FoxSection>
              )}

              <div className="grid lg:grid-cols-2 gap-8 lg:gap-6">
                {/* ===== 5. Objetivos ===== */}
                <FoxSection label="Metas" title="Seus objetivos">
                  {report!.metas_analise?.length > 0 ? (
                    <div className="space-y-2">
                      {report!.metas_analise.slice(0, 2).map((m, i) => (
                        <div key={i} className="rounded-xl border border-border bg-card p-3">
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <p className="font-semibold text-sm truncate">{m.nome}</p>
                            <span className="text-[11px] font-mono text-muted-foreground shrink-0">{Math.round(m.progresso_percentual || 0)}%</span>
                          </div>
                          <div className="h-1.5 bg-secondary rounded-full overflow-hidden" role="progressbar" aria-valuenow={Math.round(m.progresso_percentual || 0)} aria-valuemin={0} aria-valuemax={100}>
                            <div className="h-full bg-primary" style={{ width: `${Math.min(100, Math.max(0, m.progresso_percentual || 0))}%` }} />
                          </div>
                          {m.tempo_estimado && <p className="text-[11px] text-muted-foreground mt-1.5">{m.tempo_estimado}</p>}
                        </div>
                      ))}
                      <button onClick={() => navigate('/savings')} className="min-h-[40px] inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline underline-offset-4">
                        Ver metas <ArrowRight size={13} />
                      </button>
                    </div>
                  ) : (
                    <EmptyFox />
                  )}
                </FoxSection>

                {/* ===== 6. Próximos movimentos ===== */}
                {report!.previsao_mes?.proximos_vencimentos?.length > 0 && (
                  <FoxSection label="Previsão do mês" title="Próximos movimentos">
                    <div className="space-y-2">
                      {report!.previsao_mes.proximos_vencimentos.slice(0, 2).map((v, i) => (
                        <div key={i} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{v.descricao}</p>
                            <p className="text-[11px] text-muted-foreground">{v.quando}</p>
                          </div>
                          <span className="font-mono text-sm font-semibold shrink-0">{formatCurrency(v.valor)}</span>
                        </div>
                      ))}
                      <button onClick={() => navigate('/calendar')} className="min-h-[40px] inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline underline-offset-4">
                        Ver calendário <ArrowRight size={13} />
                      </button>
                    </div>
                  </FoxSection>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Chat com a IA temporariamente desativado */}
    </div>
  );
}

function FoxStatusPill({ loading, error, stale, ready }: { loading: boolean; error: boolean; stale: boolean; ready: boolean }) {
  const s = loading ? { t: 'Analisando', c: 'text-primary border-primary/30', i: <Loader2 size={11} className="animate-spin" /> }
    : error ? { t: 'Erro na atualização', c: 'text-destructive border-destructive/30', i: <AlertTriangle size={11} /> }
    : stale ? { t: 'Desatualizada', c: 'text-warning border-warning/30', i: <RefreshCw size={11} /> }
    : ready ? { t: 'Análise disponível', c: 'text-income border-income/30', i: <CheckCircle2 size={11} /> }
    : { t: 'Sem dados suficientes', c: 'text-muted-foreground border-border', i: <Brain size={11} /> };
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-mono uppercase tracking-wider', s.c)}>
      {s.i}{s.t}
    </span>
  );
}

function FoxScoreCard({ score, loading }: { score?: FinangoReport['finango_score']; loading: boolean }) {
  const has = score && typeof score.pontuacao === 'number';
  const pct = has ? Math.min(100, Math.max(0, score!.pontuacao)) : 0;
  const toneClass = pct >= 80 ? 'text-income' : pct >= 60 ? 'text-primary' : pct >= 40 ? 'text-warning' : 'text-expense';
  return (
    <div className="rounded-xl border border-border bg-background/40 p-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Star size={12} className="text-primary" /> Fox Score
        </p>
        {has && <span className={cn('text-[11px] font-semibold', toneClass)}>{score!.classificacao}</span>}
      </div>
      {has ? (
        <>
          <div className="flex items-end gap-1 mt-2">
            <span className={cn('text-4xl font-bold font-mono', toneClass)}>{pct}</span>
            <span className="text-sm text-muted-foreground mb-1 font-mono">/100</span>
          </div>
          <div className="h-1.5 bg-secondary rounded-full overflow-hidden mt-2" role="progressbar" aria-label="Fox Score" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full bg-primary transition-all duration-700" style={{ width: `${pct}%` }} />
          </div>
          {score!.fatores?.length > 0 && (
            <ul className="mt-3 space-y-1">
              {score!.fatores.slice(0, 3).map((f, i) => (
                <li key={i} className="text-[11px] text-muted-foreground flex gap-1.5"><span className="text-primary">•</span>{f}</li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <p className="text-sm text-muted-foreground mt-3">{loading ? 'Calculando…' : 'Em análise'}</p>
      )}
    </div>
  );
}

function FoxInsightCard({ kind, title, desc, value, severity, onAction }: {
  kind: 'attention' | 'positive' | 'alert'; title: string; desc: string; value?: string; severity?: string;
  onAction: (to: string) => void;
}) {
  const act = actionFor(`${title} ${desc}`);
  const critical = kind === 'alert' && severity === 'critical';
  const meta = kind === 'positive'
    ? { cat: 'Oportunidade', icon: <CheckCircle2 size={15} />, c: 'text-income' }
    : kind === 'alert'
      ? { cat: 'Atenção', icon: <AlertTriangle size={15} />, c: critical ? 'text-destructive' : 'text-warning' }
      : { cat: categoryFor(`${title} ${desc}`), icon: <ShieldAlert size={15} />, c: 'text-warning' };
  return (
    <article className="rounded-xl border border-border bg-card p-4 flex flex-col">
      <div className="flex items-center justify-between gap-2">
        <span className={cn('flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider', meta.c)}>
          {meta.icon}{meta.cat}
        </span>
        {value && <span className="text-[11px] font-mono font-semibold text-foreground">{value}</span>}
      </div>
      <p className="font-semibold text-sm mt-2">{title}</p>
      <p className="text-xs text-muted-foreground mt-1">{desc}</p>
      <button
        onClick={() => onAction(act.to)}
        className="mt-3 self-start min-h-[40px] inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
      >
        {act.label} <ArrowRight size={13} />
      </button>
    </article>
  );
}

function FoxSection({ label, title, children }: { label: string; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div>
        <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-primary">{label}</p>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: 'income' | 'expense' }) {
  return (
    <div className="card-finance p-3">
      <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn('font-mono font-semibold text-base mt-1 truncate', tone === 'income' && 'text-income', tone === 'expense' && 'text-expense')}>{value}</p>
    </div>
  );
}

function ToggleLink({ open, onClick, more }: { open: boolean; onClick: () => void; more: string }) {
  return (
    <button onClick={onClick} aria-expanded={open} className="min-h-[40px] inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded">
      {open ? 'Mostrar menos' : <>{more} <ArrowRight size={13} /></>}
    </button>
  );
}

function EmptyFox() {
  return (
    <div className="card-finance text-center py-8">
      <Brain size={24} className="text-primary mx-auto" />
      <p className="text-sm text-muted-foreground mt-2">Seu Fox ainda está analisando seus dados.</p>
    </div>
  );
}

function MiniStat({ label, value, icon, tone }: { label: string; value: string; icon: React.ReactNode; tone?: 'income' }) {
  return (
    <div className="p-3 rounded-xl border border-border bg-background/40">
      <div className={cn('flex items-center gap-1.5 text-xs text-muted-foreground mb-1', tone === 'income' && 'text-income')}>
        {icon}<span>{label}</span>
      </div>
      <p className="font-mono font-bold text-sm">{value}</p>
    </div>
  );
}

// -------- Chat drawer --------
function ChatDrawer({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string; error?: boolean }[]>([
    { role: 'assistant', content: 'Oi! Sou o FOX. Pergunte sobre seus gastos, metas, categorias ou economia. 💬' },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<'online' | 'offline' | 'degraded'>(
    typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'online'
  );
  const [lastUserMsg, setLastUserMsg] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    const on = () => setStatus('online');
    const off = () => setStatus('offline');
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  const runRequest = async (history: { role: 'user' | 'assistant'; content: string }[], useStream = true) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Faça login primeiro');

    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/finango-ai-chat${useStream ? '' : '?stream=false'}`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ messages: history }),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: 'Erro' }));
      throw new Error(err.error || `Erro ${resp.status}`);
    }

    if (!useStream) {
      const json = await resp.json();
      setMessages((m) => [...m, { role: 'assistant', content: json.content || '(sem resposta)' }]);
      return;
    }

    const reader = resp.body?.getReader();
    if (!reader) throw new Error('Sem resposta');
    const decoder = new TextDecoder();
    let assistantMsg = '';
    let receivedAny = false;
    setMessages((m) => [...m, { role: 'assistant', content: '' }]);
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') continue;
        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content || '';
          if (delta) {
            receivedAny = true;
            assistantMsg += delta;
            setMessages((m) => {
              const copy = [...m];
              copy[copy.length - 1] = { role: 'assistant', content: assistantMsg };
              return copy;
            });
          }
        } catch {}
      }
    }

    if (!receivedAny) {
      // Streaming ended without any tokens — remove empty bubble and throw
      setMessages((m) => m.slice(0, -1));
      throw new Error('stream-empty');
    }
  };

  const send = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || sending) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setStatus('offline');
      setMessages((m) => [...m, { role: 'user', content: text }, {
        role: 'assistant',
        content: '📡 Você está offline. Verifique sua conexão e tente novamente.',
        error: true,
      }]);
      setInput('');
      return;
    }

    const next = [...messages.filter(m => !m.error).map(({ role, content }) => ({ role, content })), { role: 'user' as const, content: text }];
    setMessages((m) => [...m, { role: 'user', content: text }]);
    setLastUserMsg(text);
    setInput('');
    setSending(true);

    try {
      await runRequest(next, true);
      setStatus('online');
    } catch (err: any) {
      // Fallback: try non-streaming once
      try {
        setStatus('degraded');
        await runRequest(next, false);
      } catch (err2: any) {
        setStatus('offline');
        setMessages((m) => [...m, {
          role: 'assistant',
          error: true,
          content: `⚠️ Não consegui responder agora (${err2?.message || err?.message || 'erro de conexão'}). Toque em **Tentar novamente** abaixo.`,
        }]);
      }
    } finally {
      setSending(false);
    }
  };

  const retry = () => { if (lastUserMsg) send(lastUserMsg); };


  const quickPrompts = [
    'Quanto economizei este mês?',
    'Onde estou gastando mais?',
    'Quais categorias cresceram?',
    'Quanto sobrou da minha renda?',
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background/60 backdrop-blur-sm md:bg-transparent md:backdrop-blur-0 md:pointer-events-none"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className={cn(
          // Mobile: full-width bottom sheet
          'absolute bottom-0 left-0 right-0 h-[88vh] bg-card rounded-t-3xl border-t border-border shadow-2xl flex flex-col overflow-hidden',
          // Desktop: floating chat window, bottom-right
          'md:pointer-events-auto md:inset-auto md:bottom-6 md:right-6 md:left-auto md:h-[560px] md:w-[380px] md:rounded-2xl md:border md:border-border/60'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Grab handle (mobile only) */}
        <div className="md:hidden pt-2 pb-1 flex justify-center">
          <div className="w-10 h-1.5 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-gradient-to-r from-primary/10 via-transparent to-transparent">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-md shadow-primary/30">
                <Brain size={18} className="text-primary-foreground" />
              </div>
              <span className={cn(
                'absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card',
                status === 'online' && 'bg-income',
                status === 'degraded' && 'bg-warning',
                status === 'offline' && 'bg-expense'
              )} />
            </div>
            <div>
              <p className="font-bold text-sm leading-tight">FOX</p>
              <div className="flex items-center gap-1 text-[10px]">
                <span className={cn(
                  'inline-block w-1.5 h-1.5 rounded-full',
                  status === 'online' && 'bg-income animate-pulse',
                  status === 'degraded' && 'bg-warning',
                  status === 'offline' && 'bg-expense'
                )} />
                <span className={cn(
                  'font-medium',
                  status === 'online' && 'text-income',
                  status === 'degraded' && 'text-warning',
                  status === 'offline' && 'text-expense'
                )}>
                  {status === 'online' ? 'Online' : status === 'degraded' ? 'Conexão instável' : 'Offline'}
                </span>
                <span className="text-muted-foreground">· usa seus dados reais</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-secondary hover:bg-secondary/70 flex items-center justify-center touch-scale transition-colors"
            aria-label="Fechar chat"
          >
            <X size={16} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-2.5 bg-gradient-to-b from-background/40 to-background/0">
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
              className={cn('flex items-end gap-1.5', m.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              {m.role === 'assistant' && (
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shrink-0 mb-0.5">
                  <Brain size={12} className="text-primary-foreground" />
                </div>
              )}
              <div className={cn(
                'max-w-[80%] px-3 py-2 text-[13px] leading-relaxed whitespace-pre-wrap shadow-sm',
                m.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-2xl rounded-br-sm'
                  : 'bg-secondary text-foreground rounded-2xl rounded-bl-sm'
              )}>
                {m.content || <Loader2 size={14} className="animate-spin" />}
              </div>
            </motion.div>
          ))}
          {messages[messages.length - 1]?.error && lastUserMsg && !sending && (
            <div className="flex justify-center pt-1">
              <button
                onClick={retry}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                <RefreshCw size={12} /> Tentar novamente
              </button>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Quick prompts */}
        {messages.length <= 1 && (
          <div className="px-3 pb-2 flex flex-wrap gap-1.5">
            {quickPrompts.map((q) => (
              <button
                key={q}
                onClick={() => setInput(q)}
                className="text-[11px] px-2.5 py-1 rounded-full bg-secondary hover:bg-primary/15 hover:text-primary transition-colors border border-border/40"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Composer */}
        <div className="p-2.5 border-t border-border/50 flex items-end gap-2 bg-card safe-bottom">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Pergunte algo ao FOX..."
            rows={1}
            className="flex-1 resize-none rounded-2xl bg-secondary px-3.5 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/60 max-h-24 placeholder:text-muted-foreground/70"
            disabled={sending}
          />
          <button
            onClick={() => send()}
            disabled={sending || !input.trim()}
            className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 touch-scale shrink-0 shadow-md shadow-primary/30 hover:shadow-lg transition-shadow"
            aria-label="Enviar mensagem"
          >
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
