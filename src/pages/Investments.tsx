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

type Tab = 'overview' | 'wallet' | 'fii' | 'stock' | 'etf' | 'fixed_income' | 'simulator' | 'history';

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: 'overview', label: 'Visão geral', icon: PieChart },
  { id: 'wallet', label: 'Carteira', icon: WalletIcon },
  { id: 'fii', label: 'FIIs', icon: TrendingUp },
  { id: 'stock', label: 'Ações', icon: TrendingUp },
  { id: 'etf', label: 'ETFs', icon: TrendingUp },
  { id: 'fixed_income', label: 'Renda Fixa', icon: TrendingUp },
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
      <header className="px-4 lg:px-8 pt-6 pb-4 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />
        <div className="relative flex items-start justify-between gap-3">
          <div>
            <p className="text-muted-foreground text-sm font-medium">Central de</p>
            <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">Investimentos</h1>
          </div>
          <button
            onClick={() => inv.refreshQuotes()}
            className="p-2 rounded-xl bg-secondary hover:bg-secondary/80"
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
          <StatCard icon={<DollarSign size={16} />} label="Prov. mensais" value={formatBRL(p.monthlyDividends)} tone="green" />
          <StatCard icon={<DollarSign size={16} />} label="Prov. anuais" value={formatBRL(p.yearlyDividends)} sub={`DY ${p.portfolioDy.toFixed(2)}%`} tone="green" />
        </div>

        {p.best && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Trophy size={12} /> Melhor ativo</p>
              <p className="font-bold text-lg mt-1">{p.best.asset.ticker}</p>
              <p className="text-sm text-emerald-500 font-semibold tabular-nums">{p.best.metrics.profitPct.toFixed(2)}% · {formatBRL(p.best.metrics.profit)}</p>
            </div>
            {p.worst && p.worst.asset.id !== p.best.asset.id && (
              <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><TrendingDown size={12} /> Pior ativo</p>
                <p className="font-bold text-lg mt-1">{p.worst.asset.ticker}</p>
                <p className="text-sm text-red-500 font-semibold tabular-nums">{p.worst.metrics.profitPct.toFixed(2)}% · {formatBRL(p.worst.metrics.profit)}</p>
              </div>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 lg:mx-0 lg:px-0 lg:flex-wrap">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`shrink-0 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${active ? 'bg-primary text-primary-foreground' : 'bg-secondary/60 text-muted-foreground hover:bg-secondary'}`}
              >
                <t.icon size={13} />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Actions */}
        {tab !== 'simulator' && tab !== 'history' && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => { setAddType(tab === 'wallet' || tab === 'overview' ? 'fii' : (tab as AssetType)); setAddOpen(true); }}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold flex items-center gap-1"
            >
              <Plus size={14} /> Adicionar ativo
            </button>
            {inv.assets.length > 0 && (
              <>
                <button onClick={() => { setPreselected(undefined); setContribOpen(true); }} className="px-4 py-2 rounded-xl bg-secondary text-sm font-semibold flex items-center gap-1">
                  <Plus size={14} /> Novo aporte
                </button>
                <button onClick={() => setDivOpen(true)} className="px-4 py-2 rounded-xl bg-secondary text-sm font-semibold flex items-center gap-1">
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
  const bg = tone === 'green' ? 'bg-emerald-500/10' : tone === 'red' ? 'bg-red-500/10' : 'bg-primary/10';
  const color = tone === 'green' ? 'text-emerald-500' : tone === 'red' ? 'text-red-500' : 'text-primary';
  return (
    <div className="p-3 rounded-2xl bg-card border border-border">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${bg} ${color} mb-2`}>{icon}</div>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="font-bold text-base tabular-nums">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground tabular-nums">{sub}</p>}
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
        <div key={i} className="p-3 rounded-xl bg-card border border-border flex items-center justify-between">
          <div>
            <p className="font-semibold text-sm">{it.ticker}</p>
            <p className="text-xs text-muted-foreground">{it.label} · {new Date(it.date).toLocaleDateString('pt-BR')}</p>
          </div>
          <p className={`font-bold tabular-nums text-sm ${it.tone === 'buy' ? 'text-primary' : it.tone === 'sell' ? 'text-red-500' : 'text-emerald-500'}`}>
            {it.tone === 'div' ? '+' : it.tone === 'sell' ? '−' : ''} {formatBRL(it.value)}
          </p>
        </div>
      ))}
    </div>
  );
}
