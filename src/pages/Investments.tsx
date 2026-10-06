import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, TrendingUp, TrendingDown, Wallet as WalletIcon, DollarSign, RefreshCcw, Trophy, PieChart, History as HistoryIcon, Calculator } from 'lucide-react';
import { toast } from 'sonner';
import { useInvestments, AssetType } from '@/hooks/useInvestments';
import { formatBRL } from '@/lib/currency';
import { WalletList } from '@/components/investments/WalletList';
import { AddAssetModal } from '@/components/investments/AddAssetModal';
import { NewContributionModal } from '@/components/investments/NewContributionModal';
import { RegisterDividendModal } from '@/components/investments/RegisterDividendModal';
import { SimulatorPanel } from '@/components/investments/SimulatorPanel';
import { InvestmentCharts } from '@/components/investments/InvestmentCharts';
import { DividendsPanel } from '@/components/investments/DividendsPanel';

type Tab = 'overview' | 'wallet' | 'fii' | 'stock' | 'etf' | 'fixed_income' | 'dividends' | 'simulator' | 'history';

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: 'overview', label: 'Visão geral', icon: PieChart },
  { id: 'wallet', label: 'Carteira', icon: WalletIcon },
  { id: 'fii', label: 'FIIs', icon: TrendingUp },
  { id: 'stock', label: 'Ações', icon: TrendingUp },
  { id: 'etf', label: 'ETFs', icon: TrendingUp },
  { id: 'fixed_income', label: 'Renda Fixa', icon: TrendingUp },
  { id: 'dividends', label: 'Dividendos', icon: DollarSign },
  { id: 'simulator', label: 'Simulador', icon: Calculator },
  { id: 'history', label: 'Histórico', icon: HistoryIcon },
];

export default function Investments() {
  const inv = useInvestments();
  const [tab, setTab] = useState<Tab>('overview');
  const [addOpen, setAddOpen] = useState(false);
  const [addType, setAddType] = useState<AssetType>('fii');
  const [contribOpen, setContribOpen] = useState(false);
  const [divOpen, setDivOpen] = useState(false);
  const [preselected, setPreselected] = useState<string | undefined>();

  const filteredData = useMemo(() => {
    if (['fii', 'stock', 'etf', 'fixed_income'].includes(tab)) {
      return inv.assetsWithMetrics.filter((x) => x.asset.type === tab);
    }
    return inv.assetsWithMetrics;
  }, [inv.assetsWithMetrics, tab]);

  const currentPrice = (ticker: string) => inv.quotes[ticker]?.price ?? null;

  const handleCreate = async (
    input: { ticker: string; type: AssetType; name?: string; segment?: string },
    initial?: { quantity: number; unit_price: number },
  ) => {
    const created = await inv.addAsset(input);
    if (created && initial) {
      await inv.addContribution({ asset_id: created.id, quantity: initial.quantity, unit_price: initial.unit_price });
    }
  };

  const p = inv.portfolio;

  return (
    <div className="min-h-screen bg-background pb-28 lg:pb-8 safe-top">
      <header className="px-4 lg:px-8 pt-6 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl lg:text-3xl font-semibold tracking-tight text-foreground">Finango Invest</h1>
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-primary border border-primary/30 bg-primary/10 rounded px-1.5 py-0.5">Carteira consolidada</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Ativos, proventos e simulações da sua carteira.</p>
          </div>
          <button
            onClick={() => inv.refreshQuotes()}
            className="p-2 rounded-lg border border-border bg-card hover:bg-secondary text-muted-foreground hover:text-foreground"
            aria-label="Atualizar cotações"
            title="Atualizar cotações"
          >
            <RefreshCcw size={16} />
          </button>
        </div>
      </header>

      <main className="px-4 lg:px-8 space-y-5">
        {/* Overview cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={<WalletIcon size={16} />} label="Patrimônio" value={formatBRL(p.totalPatrimony)} tone="primary" />
          <StatCard
            icon={p.totalProfit >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            label="Valorização"
            value={`${p.totalProfitPct.toFixed(2)}%`}
            sub={formatBRL(p.totalProfit)}
            tone={p.totalProfit >= 0 ? 'green' : 'red'}
          />
          <StatCard icon={<DollarSign size={16} />} label="Proventos mensais" value={formatBRL(p.monthlyDividends)} tone="green" />
          <StatCard icon={<DollarSign size={16} />} label="Proventos anuais" value={formatBRL(p.yearlyDividends)} sub={`DY ${p.portfolioDy.toFixed(2)}%`} tone="green" />
        </div>

        {p.best && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-card border border-border">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground flex items-center gap-1"><Trophy size={12} className="text-income" /> Melhor ativo</p>
              <p className="font-semibold text-lg mt-1">{p.best.asset.ticker}</p>
              <p className="font-mono text-sm text-income font-semibold tabular-nums">{p.best.metrics.profitPct.toFixed(2)}% · {formatBRL(p.best.metrics.profit)}</p>
            </div>
            {p.worst && p.worst.asset.id !== p.best.asset.id && (
              <div className="p-4 rounded-xl bg-card border border-border">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground flex items-center gap-1"><TrendingDown size={12} className="text-expense" /> Pior ativo</p>
                <p className="font-semibold text-lg mt-1">{p.worst.asset.ticker}</p>
                <p className="font-mono text-sm text-expense font-semibold tabular-nums">{p.worst.metrics.profitPct.toFixed(2)}% · {formatBRL(p.worst.metrics.profit)}</p>
              </div>
            )}
          </div>
        )}

        {/* Tabs */}
        <nav aria-label="Seções de investimentos" className="flex gap-1 overflow-x-auto scrollbar-hide rounded-xl border border-border bg-card p-1">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                aria-current={active ? 'page' : undefined}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${active ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <t.icon size={13} />
                {t.label}
              </button>
            );
          })}
        </nav>

        {/* Actions */}
        {tab !== 'simulator' && tab !== 'history' && tab !== 'dividends' && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => { setAddType(tab === 'wallet' || tab === 'overview' ? 'fii' : (tab as AssetType)); setAddOpen(true); }}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold flex items-center gap-1 hover:bg-primary/90"
            >
              <Plus size={14} /> Adicionar ativo
            </button>
            {inv.assets.length > 0 && (
              <>
                <button onClick={() => { setPreselected(undefined); setContribOpen(true); }} className="px-4 py-2 rounded-lg border border-border bg-card hover:bg-secondary text-sm font-semibold flex items-center gap-1">
                  <Plus size={14} /> Novo aporte
                </button>
                <button onClick={() => setDivOpen(true)} className="px-4 py-2 rounded-lg border border-border bg-card hover:bg-secondary text-sm font-semibold flex items-center gap-1">
                  <DollarSign size={14} /> Registrar provento
                </button>
              </>
            )}
          </div>
        )}

        {/* Content per tab */}
        <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {tab === 'overview' && (
            <>
              <InvestmentCharts data={inv.assetsWithMetrics} dividends={inv.dividends} />
              <WalletList
                data={inv.assetsWithMetrics}
                onDelete={async (id) => { await inv.deleteAsset(id); toast.success('Ativo removido'); }}
                onContribute={(id) => { setPreselected(id); setContribOpen(true); }}
                onDividend={(id) => { setPreselected(id); setDivOpen(true); }}
              />
            </>
          )}

          {(tab === 'wallet' || tab === 'fii' || tab === 'stock' || tab === 'etf' || tab === 'fixed_income') && (
            <WalletList
              data={filteredData}
              onDelete={async (id) => { await inv.deleteAsset(id); toast.success('Ativo removido'); }}
              onContribute={(id) => { setPreselected(id); setContribOpen(true); }}
              onDividend={(id) => { setPreselected(id); setDivOpen(true); }}
            />
          )}

          {tab === 'simulator' && <SimulatorPanel />}

          {tab === 'dividends' && (
            <DividendsPanel
              dividends={inv.dividends}
              assets={inv.assets}
              monthly={p.monthlyDividends}
              yearly={p.yearlyDividends}
              portfolioDy={p.portfolioDy}
            />
          )}

          {tab === 'history' && <HistoryPanel inv={inv} />}
        </motion.div>
      </main>

      <AddAssetModal open={addOpen} onClose={() => setAddOpen(false)} defaultType={addType} onCreate={handleCreate} />
      <NewContributionModal
        open={contribOpen}
        onClose={() => setContribOpen(false)}
        assets={inv.assets}
        currentPrice={currentPrice}
        onSubmit={inv.addContribution}
        preselectedAssetId={preselected}
      />
      <RegisterDividendModal open={divOpen} onClose={() => setDivOpen(false)} assets={inv.assets} onSubmit={inv.addDividend} />
    </div>
  );
}

function StatCard({ icon, label, value, sub, tone }: { icon: any; label: string; value: string; sub?: string; tone?: 'primary' | 'green' | 'red' }) {
  const color = tone === 'green' ? 'text-income' : tone === 'red' ? 'text-expense' : 'text-foreground';
  return (
    <div className="p-3 lg:p-4 rounded-xl bg-card border border-border">
      <div className="flex items-center justify-between gap-1.5 mb-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground truncate">{label}</p>
        <span className="text-primary shrink-0">{icon}</span>
      </div>
      <p className={`font-mono font-semibold text-base lg:text-xl tabular-nums truncate ${color}`}>{value}</p>
      {sub && <p className="font-mono text-[11px] text-muted-foreground tabular-nums mt-0.5">{sub}</p>}
    </div>
  );
}

function HistoryPanel({ inv }: { inv: ReturnType<typeof useInvestments> }) {
  const items = useMemo(() => {
    const rows: { date: string; ticker: string; label: string; value: number; tone: 'buy' | 'sell' | 'div' }[] = [];
    inv.transactions.forEach((t) => {
      const asset = inv.assets.find((a) => a.id === t.asset_id);
      rows.push({
        date: t.date,
        ticker: asset?.ticker ?? '—',
        label: `${t.kind === 'buy' ? 'Aporte' : 'Venda'} ${t.quantity} × ${formatBRL(t.unit_price)}`,
        value: t.total,
        tone: t.kind === 'buy' ? 'buy' : 'sell',
      });
    });
    inv.dividends.forEach((d) => {
      const asset = inv.assets.find((a) => a.id === d.asset_id);
      rows.push({
        date: d.pay_date,
        ticker: asset?.ticker ?? '—',
        label: `Provento (${d.type})`,
        value: d.amount,
        tone: 'div',
      });
    });
    return rows.sort((a, b) => b.date.localeCompare(a.date));
  }, [inv]);

  if (items.length === 0) return <p className="text-sm text-muted-foreground text-center py-6">Nenhum movimento registrado.</p>;

  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={i} className="p-3 rounded-xl bg-card border border-border flex items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-sm">{it.ticker}</p>
            <p className="text-xs text-muted-foreground">{it.label} · {new Date(it.date).toLocaleDateString('pt-BR')}</p>
          </div>
          <p className={`font-bold tabular-nums text-sm font-mono ${it.tone === 'buy' ? 'text-primary' : it.tone === 'sell' ? 'text-expense' : 'text-income'}`}>
            {it.tone === 'div' ? '+' : it.tone === 'sell' ? '−' : ''} {formatBRL(it.value)}
          </p>
        </div>
      ))}
    </div>
  );
}
