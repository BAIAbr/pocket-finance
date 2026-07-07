import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useFinanceContext } from '@/contexts/FinanceContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, Sparkles, RefreshCw, AlertTriangle, Lightbulb, ArrowDownRight, ArrowUpRight,
  Wallet, TrendingUp, Target, Calendar, MessageCircle, Send, X, CheckCircle2,
  ShieldAlert, Star, Loader2,
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

export default function AIInsights() {
  const { formatCurrency, transactions } = useFinanceContext();
  const [report, setReport] = useState<FinangoReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [lastSignature, setLastSignature] = useState<string | null>(null);

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
      setReport(response.data);
      setLastSignature(currentSignature);
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ report: response.data, signature: currentSignature, at: Date.now() }));
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
        // Auto-refresh if data changed (>1min old and signature differs)
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

  return (
    <div className="min-h-screen bg-background pb-24 safe-top">
      {/* Header */}
      <header className="px-4 pt-6 pb-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/30">
              <Brain size={22} className="text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{"\u00a0"}Finango IA</h1>
              <p className="text-xs text-muted-foreground">Seu copiloto financeiro inteligente</p>
            </div>
          </div>
          <button
            onClick={analyze}
            disabled={loading}
            className="w-10 h-10 rounded-xl bg-secondary hover:bg-secondary/70 flex items-center justify-center touch-scale disabled:opacity-50"
            aria-label="Atualizar análise"
          >
            <RefreshCw size={18} className={cn(loading && 'animate-spin')} />
          </button>
        </div>
      </header>

      <main className="px-4 space-y-4">
        {loading && !report && <LoadingState />}
        {error && (
          <div className="card-finance border-destructive/30 bg-destructive/5 p-4">
            <p className="text-sm text-destructive">{error}</p>
            <button onClick={analyze} className="text-sm text-primary mt-2 underline">Tentar novamente</button>
          </div>
        )}

        {isStale && report && !loading && (
          <button
            onClick={analyze}
            className="w-full card-finance bg-primary/5 border-primary/30 flex items-center justify-center gap-2 py-3 text-sm text-primary font-medium touch-scale"
          >
            <Sparkles size={16} /> Novos lançamentos detectados — atualizar análise
          </button>
        )}

        <AnimatePresence mode="wait">
          {report && !('error' in (report as any)) && (
            <motion.div
              key="report"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* Greeting */}
              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="card-finance bg-gradient-to-br from-primary/10 via-background to-background border-primary/20"
              >
                <p className="text-lg font-semibold">{report.saudacao}</p>
                <p className="text-sm text-muted-foreground mt-1">{report.resumo_intro}</p>
              </motion.div>

              {/* Finango Score */}
              {report.finango_score && (
                <ScoreCard score={report.finango_score} />
              )}

              {/* Diagnóstico */}
              <div className="grid gap-3">
                {report.diagnostico?.positivos?.length > 0 && (
                  <DiagnosisSection
                    title="Pontos positivos"
                    icon={<CheckCircle2 size={16} />}
                    tone="income"
                    items={report.diagnostico.positivos}
                  />
                )}
                {report.diagnostico?.atencao?.length > 0 && (
                  <DiagnosisSection
                    title="Pontos de atenção"
                    icon={<ShieldAlert size={16} />}
                    tone="warning"
                    items={report.diagnostico.atencao}
                  />
                )}
              </div>

              {/* Alertas */}
              {report.alertas?.length > 0 && (
                <Section title="Alertas inteligentes" icon={<AlertTriangle size={16} className="text-warning" />}>
                  <div className="space-y-2">
                    {report.alertas.map((a, i) => (
                      <AlertCard key={i} alert={a} />
                    ))}
                  </div>
                </Section>
              )}

              {/* Recomendações */}
              {report.recomendacoes?.length > 0 && (
                <Section title="Recomendações" icon={<Lightbulb size={16} className="text-primary" />}>
                  <div className="space-y-2">
                    {report.recomendacoes.map((r, i) => (
                      <div key={i} className="p-3 rounded-xl bg-secondary/40 border border-border/40">
                        <p className="font-semibold text-sm">{r.acao}</p>
                        <p className="text-xs text-muted-foreground mt-1">{r.motivo}</p>
                        {r.impacto && (
                          <p className="text-xs text-primary mt-1.5 font-medium">💡 {r.impacto}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* Comparativos */}
              {report.comparativos && (
                <Section title="Comparativos" icon={<TrendingUp size={16} className="text-primary" />}>
                  <div className="space-y-2">
                    {(['3_meses', '6_meses', '12_meses'] as const).map((k) => {
                      const c = report.comparativos[k];
                      if (!c) return null;
                      const label = k.replace('_', ' ');
                      return (
                        <div key={k} className="p-3 rounded-xl bg-secondary/40">
                          <p className="text-xs uppercase text-muted-foreground mb-2">Últimos {label}</p>
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div>
                              <p className="text-muted-foreground">Receita</p>
                              <p className="font-mono font-semibold text-income">{formatCurrency(c.receita || 0)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Despesa</p>
                              <p className="font-mono font-semibold text-expense">{formatCurrency(c.despesa || 0)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Economia</p>
                              <p className={cn('font-mono font-semibold', (c.economia || 0) >= 0 ? 'text-income' : 'text-expense')}>
                                {formatCurrency(c.economia || 0)}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Section>
              )}

              {/* Metas */}
              {report.metas_analise?.length > 0 && (
                <Section title="Metas e cofrinhos" icon={<Target size={16} className="text-primary" />}>
                  <div className="space-y-3">
                    {report.metas_analise.map((m, i) => (
                      <div key={i} className="p-3 rounded-xl bg-secondary/40">
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="font-semibold text-sm">{m.nome}</p>
                          <span className="text-xs text-muted-foreground">{m.tempo_estimado}</span>
                        </div>
                        <div className="h-2 bg-background rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-primary to-primary/60 transition-all"
                            style={{ width: `${Math.min(100, Math.max(0, m.progresso_percentual || 0))}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">{m.sugestao}</p>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* Previsão do mês */}
              {report.previsao_mes && (
                <Section title="Previsão do mês" icon={<Calendar size={16} className="text-primary" />}>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <MiniStat label="Saldo previsto" value={formatCurrency(report.previsao_mes.saldo_previsto || 0)} icon={<Wallet size={14} />} />
                    <MiniStat label="Economia prevista" value={formatCurrency(report.previsao_mes.economia_prevista || 0)} icon={<ArrowUpRight size={14} />} tone="income" />
                  </div>
                  {report.previsao_mes.proximos_vencimentos?.length > 0 && (
                    <div className="space-y-1.5 mb-2">
                      <p className="text-xs text-muted-foreground font-medium">Próximos vencimentos</p>
                      {report.previsao_mes.proximos_vencimentos.map((v, i) => (
                        <div key={i} className="flex items-center justify-between text-sm py-1">
                          <span>{v.descricao} <span className="text-xs text-muted-foreground">· {v.quando}</span></span>
                          <span className="font-mono font-semibold">{formatCurrency(v.valor)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {report.previsao_mes.maior_gasto_esperado?.categoria && (
                    <div className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border/30">
                      Maior gasto esperado: <span className="text-foreground font-medium">{report.previsao_mes.maior_gasto_esperado.categoria}</span> — {formatCurrency(report.previsao_mes.maior_gasto_esperado.valor_estimado || 0)}
                    </div>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-3 italic">Projeções baseadas no seu histórico financeiro.</p>
                </Section>
              )}

              {/* Assinaturas detectadas */}
              {report.assinaturas_detectadas?.length > 0 && (
                <Section title="Possíveis assinaturas" icon={<RefreshCw size={16} className="text-primary" />}>
                  <div className="space-y-2">
                    {report.assinaturas_detectadas.map((a, i) => (
                      <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/40">
                        <div>
                          <p className="text-sm font-medium">{a.descricao}</p>
                          <p className="text-xs text-muted-foreground">{a.frequencia}</p>
                        </div>
                        <span className="font-mono text-sm font-semibold">{formatCurrency(a.valor)}</span>
                      </div>
                    ))}
                  </div>
                </Section>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Chat FAB */}
      <button
        onClick={() => setChatOpen(true)}
        className="fixed bottom-24 right-4 z-30 px-4 h-12 rounded-full bg-gradient-to-r from-primary to-primary/70 text-primary-foreground shadow-xl shadow-primary/40 flex items-center gap-2 font-semibold touch-scale"
      >
        <MessageCircle size={18} />
        <span className="text-sm">Conversar com a IA</span>
      </button>

      <AnimatePresence>
        {chatOpen && <ChatDrawer onClose={() => setChatOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}

function LoadingState() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card-finance text-center py-10 space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto animate-pulse">
        <Brain size={32} className="text-primary" />
      </div>
      <p className="text-sm text-muted-foreground">A Finango IA está analisando suas finanças...</p>
      <div className="w-48 h-1.5 bg-secondary rounded-full mx-auto overflow-hidden">
        <div className="h-full bg-primary rounded-full animate-[shimmer_1.5s_ease-in-out_infinite]" style={{ width: '60%' }} />
      </div>
    </motion.div>
  );
}

function ScoreCard({ score }: { score: FinangoReport['finango_score'] }) {
  const pct = Math.min(100, Math.max(0, score.pontuacao || 0));
  const toneClass =
    pct >= 80 ? 'text-income' :
    pct >= 60 ? 'text-primary' :
    pct >= 40 ? 'text-warning' : 'text-expense';
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      className="card-finance bg-gradient-to-br from-primary/10 to-background border-primary/20"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Star size={18} className="text-primary fill-primary" />
          <h3 className="font-bold">Finango Score</h3>
        </div>
        <span className={cn('text-xs font-semibold px-2 py-1 rounded-full bg-secondary', toneClass)}>
          {score.classificacao}
        </span>
      </div>
      <div className="flex items-end gap-2 mb-3">
        <span className={cn('text-5xl font-bold font-mono', toneClass)}>{pct}</span>
        <span className="text-lg text-muted-foreground mb-1">/ 100</span>
      </div>
      <div className="h-2 bg-secondary rounded-full overflow-hidden mb-3">
        <motion.div
          initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: 'easeOut' }}
          className="h-full bg-gradient-to-r from-primary to-primary/60"
        />
      </div>
      {score.fatores?.length > 0 && (
        <ul className="space-y-1">
          {score.fatores.map((f, i) => (
            <li key={i} className="text-xs text-muted-foreground flex gap-1.5"><span className="text-primary">•</span>{f}</li>
          ))}
        </ul>
      )}
    </motion.div>
  );
}

function DiagnosisSection({ title, icon, tone, items }: {
  title: string; icon: React.ReactNode; tone: 'income' | 'warning';
  items: { titulo: string; descricao: string; valor?: string }[];
}) {
  const toneClass = tone === 'income' ? 'text-income border-income/20 bg-income/5' : 'text-warning border-warning/20 bg-warning/5';
  return (
    <div className={cn('card-finance border', toneClass)}>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h3 className="font-semibold text-sm">{title}</h3>
      </div>
      <div className="space-y-2">
        {items.map((it, i) => (
          <div key={i} className="p-2.5 rounded-lg bg-background/60">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-foreground">{it.titulo}</p>
              {it.valor && <span className="text-xs font-mono font-semibold shrink-0">{it.valor}</span>}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{it.descricao}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function AlertCard({ alert }: { alert: FinangoReport['alertas'][number] }) {
  const tone =
    alert.severidade === 'critical' ? 'border-destructive/30 bg-destructive/5' :
    alert.severidade === 'warning' ? 'border-warning/30 bg-warning/5' :
    'border-border bg-secondary/40';
  const iconTone =
    alert.severidade === 'critical' ? 'text-destructive' :
    alert.severidade === 'warning' ? 'text-warning' : 'text-muted-foreground';
  return (
    <div className={cn('p-3 rounded-xl border flex gap-2.5', tone)}>
      <AlertTriangle size={16} className={cn('shrink-0 mt-0.5', iconTone)} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">{alert.titulo}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{alert.descricao}</p>
      </div>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card-finance">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h3 className="font-semibold text-sm">{title}</h3>
      </div>
      {children}
    </motion.div>
  );
}

function MiniStat({ label, value, icon, tone }: { label: string; value: string; icon: React.ReactNode; tone?: 'income' }) {
  return (
    <div className="p-3 rounded-xl bg-secondary/40">
      <div className={cn('flex items-center gap-1.5 text-xs text-muted-foreground mb-1', tone === 'income' && 'text-income')}>
        {icon}<span>{label}</span>
      </div>
      <p className="font-mono font-bold text-sm">{value}</p>
    </div>
  );
}

// -------- Chat drawer --------
function ChatDrawer({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([
    { role: 'assistant', content: 'Oi! Sou a Finango IA. Pergunte sobre seus gastos, metas, categorias ou economia. 💬' },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    const next = [...messages, { role: 'user' as const, content: text }];
    setMessages(next);
    setInput('');
    setSending(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Faça login primeiro');

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/finango-ai-chat`;
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ messages: next }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Erro' }));
        throw new Error(err.error || 'Erro na resposta');
      }

      const reader = resp.body?.getReader();
      if (!reader) throw new Error('Sem resposta');
      const decoder = new TextDecoder();
      let assistantMsg = '';
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
    } catch (err: any) {
      setMessages((m) => [...m, { role: 'assistant', content: `❌ ${err.message || 'Erro ao consultar a IA'}` }]);
    } finally {
      setSending(false);
    }
  };

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
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-income border-2 border-card" />
            </div>
            <div>
              <p className="font-bold text-sm leading-tight">Finango IA</p>
              <p className="text-[10px] text-muted-foreground">Online · usa seus dados reais</p>
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
            placeholder="Pergunte algo à Finango IA..."
            rows={1}
            className="flex-1 resize-none rounded-2xl bg-secondary px-3.5 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/60 max-h-24 placeholder:text-muted-foreground/70"
            disabled={sending}
          />
          <button
            onClick={send}
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
