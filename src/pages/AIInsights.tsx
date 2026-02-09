import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useFinanceContext } from '@/contexts/FinanceContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Sparkles, TrendingDown, RefreshCw, AlertTriangle, Lightbulb, ArrowDownRight, ArrowUpRight, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FinancialReport {
  gastos_fixos: {
    items: { nome: string; valor_medio: number; frequencia: string }[];
    total_mensal: number;
    percentual_renda: number;
  };
  gastos_variaveis: {
    items: { categoria: string; total: number; variacao_percentual: number }[];
    total_periodo: number;
  };
  recorrentes: {
    items: { servico: string; valor_medio: number; frequencia: string }[];
    alertas: string[];
  };
  resumo: {
    total_fixos: number;
    total_variaveis: number;
    total_geral: number;
    renda_total: number;
  };
  insights: string[];
}

export default function AIInsights() {
  const { formatCurrency } = useFinanceContext();
  const [report, setReport] = useState<FinancialReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = async () => {
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
    } catch (err: any) {
      setError(err.message || 'Erro ao gerar análise');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24 safe-top">
      <header className="px-4 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
            <Brain size={22} className="text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Análise IA</h1>
            <p className="text-sm text-muted-foreground">Insights inteligentes sobre suas finanças</p>
          </div>
        </div>
      </header>

      <main className="px-4 space-y-4">
        {!report && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-finance text-center py-10 space-y-4"
          >
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <Sparkles size={32} className="text-primary" />
            </div>
            <h2 className="text-lg font-semibold">Relatório Financeiro Inteligente</h2>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              A IA vai analisar todas as suas transações e gerar insights sobre seus gastos fixos, variáveis e recorrentes.
            </p>
            <button
              onClick={analyze}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium touch-scale inline-flex items-center gap-2"
            >
              <Sparkles size={18} />
              Gerar Análise
            </button>
          </motion.div>
        )}

        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="card-finance text-center py-10 space-y-4"
          >
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto animate-pulse">
              <Brain size={32} className="text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">Analisando suas transações com IA...</p>
            <div className="w-48 h-1.5 bg-secondary rounded-full mx-auto overflow-hidden">
              <div className="h-full bg-primary rounded-full animate-[shimmer_1.5s_ease-in-out_infinite]" style={{ width: '60%' }} />
            </div>
          </motion.div>
        )}

        {error && (
          <div className="card-finance border-destructive/30 bg-destructive/5 p-4">
            <p className="text-sm text-destructive">{error}</p>
            <button onClick={analyze} className="text-sm text-primary mt-2 underline">Tentar novamente</button>
          </div>
        )}

        <AnimatePresence>
          {report && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* Refresh button */}
              <div className="flex justify-end">
                <button
                  onClick={analyze}
                  disabled={loading}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <RefreshCw size={14} className={cn(loading && 'animate-spin')} />
                  Atualizar
                </button>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-3">
                <SummaryCard
                  icon={<ArrowUpRight size={16} />}
                  label="Renda"
                  value={formatCurrency(report.resumo.renda_total)}
                  color="text-income"
                />
                <SummaryCard
                  icon={<ArrowDownRight size={16} />}
                  label="Total Gasto"
                  value={formatCurrency(report.resumo.total_geral)}
                  color="text-expense"
                />
                <SummaryCard
                  icon={<Wallet size={16} />}
                  label="Gastos Fixos"
                  value={formatCurrency(report.resumo.total_fixos)}
                  color="text-warning"
                />
                <SummaryCard
                  icon={<TrendingDown size={16} />}
                  label="Gastos Variáveis"
                  value={formatCurrency(report.resumo.total_variaveis)}
                  color="text-muted-foreground"
                />
              </div>

              {/* Fixed Expenses */}
              {report.gastos_fixos.items.length > 0 && (
                <Section title="💰 Gastos Fixos" subtitle={`${report.gastos_fixos.percentual_renda.toFixed(0)}% da renda`}>
                  {report.gastos_fixos.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                      <div>
                        <p className="font-medium text-sm">{item.nome}</p>
                        <p className="text-xs text-muted-foreground">{item.frequencia}</p>
                      </div>
                      <span className="font-mono text-sm font-semibold">{formatCurrency(item.valor_medio)}</span>
                    </div>
                  ))}
                </Section>
              )}

              {/* Variable Expenses */}
              {report.gastos_variaveis.items.length > 0 && (
                <Section title="📊 Gastos Variáveis" subtitle={`Total: ${formatCurrency(report.gastos_variaveis.total_periodo)}`}>
                  {report.gastos_variaveis.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                      <p className="font-medium text-sm">{item.categoria}</p>
                      <div className="text-right">
                        <span className="font-mono text-sm font-semibold">{formatCurrency(item.total)}</span>
                        {item.variacao_percentual !== 0 && (
                          <p className={cn(
                            'text-xs',
                            item.variacao_percentual > 0 ? 'text-expense' : 'text-income'
                          )}>
                            {item.variacao_percentual > 0 ? '+' : ''}{item.variacao_percentual.toFixed(0)}%
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </Section>
              )}

              {/* Recurring alerts */}
              {report.recorrentes.alertas.length > 0 && (
                <Section title="⚠️ Alertas" icon={<AlertTriangle size={16} className="text-warning" />}>
                  {report.recorrentes.alertas.map((alerta, i) => (
                    <div key={i} className="flex items-start gap-2 py-2">
                      <AlertTriangle size={14} className="text-warning mt-0.5 shrink-0" />
                      <p className="text-sm">{alerta}</p>
                    </div>
                  ))}
                </Section>
              )}

              {/* Insights */}
              {report.insights.length > 0 && (
                <Section title="💡 Insights" icon={<Lightbulb size={16} className="text-primary" />}>
                  {report.insights.map((insight, i) => (
                    <div key={i} className="flex items-start gap-2 py-2">
                      <Sparkles size={14} className="text-primary mt-0.5 shrink-0" />
                      <p className="text-sm">{insight}</p>
                    </div>
                  ))}
                </Section>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function SummaryCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="card-finance">
      <div className={cn('flex items-center gap-2 mb-2', color)}>
        {icon}
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className={cn('font-mono text-lg font-bold', color)}>{value}</p>
    </div>
  );
}

function Section({ title, subtitle, icon, children }: { title: string; subtitle?: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-finance"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-semibold text-sm">{title}</h3>
        </div>
        {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
      </div>
      {children}
    </motion.div>
  );
}
