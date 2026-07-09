import { TrendingUp, TrendingDown, Trash2, Plus, DollarSign } from 'lucide-react';
import { formatBRL } from '@/lib/currency';
import { InvestmentAsset, QuoteCache } from '@/hooks/useInvestments';
import { AssetMetrics } from '@/lib/investments/calculations';

interface Props {
  data: { asset: InvestmentAsset; quote?: QuoteCache; metrics: AssetMetrics }[];
  onDelete: (id: string) => void;
  onContribute: (assetId: string) => void;
  onDividend: (assetId: string) => void;
}

const TYPE_LABELS: Record<string, string> = { fii: 'FII', stock: 'Ação', etf: 'ETF', fixed_income: 'Renda Fixa' };

export function WalletList({ data, onDelete, onContribute, onDividend }: Props) {
  if (data.length === 0) {
    return (
      <div className="p-8 rounded-2xl border border-dashed border-border text-center">
        <p className="text-sm text-muted-foreground">Sua carteira está vazia. Adicione seu primeiro ativo para começar.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.map(({ asset, quote, metrics }) => {
        const positive = metrics.profit >= 0;
        const priceAvailable = quote?.price != null;
        return (
          <div key={asset.id} className="p-4 rounded-2xl bg-card border border-border">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-base">{asset.ticker}</p>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">{TYPE_LABELS[asset.type] ?? asset.type}</span>
                  {asset.segment && <span className="text-[10px] text-muted-foreground">· {asset.segment}</span>}
                </div>
                {asset.name && <p className="text-xs text-muted-foreground truncate mt-0.5">{asset.name}</p>}
              </div>
              <button onClick={() => onDelete(asset.id)} className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                <Trash2 size={14} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
              <div className="p-2 rounded-lg bg-secondary/40">
                <p className="text-muted-foreground">Quantidade</p>
                <p className="font-bold text-sm tabular-nums">{metrics.quantity.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</p>
              </div>
              <div className="p-2 rounded-lg bg-secondary/40">
                <p className="text-muted-foreground">Preço médio</p>
                <p className="font-bold text-sm tabular-nums">{formatBRL(metrics.averagePrice)}</p>
              </div>
              <div className="p-2 rounded-lg bg-secondary/40">
                <p className="text-muted-foreground">Preço atual</p>
                <p className="font-bold text-sm tabular-nums">{priceAvailable ? formatBRL(quote!.price!) : '—'}</p>
              </div>
              <div className="p-2 rounded-lg bg-secondary/40">
                <p className="text-muted-foreground">Patrimônio</p>
                <p className="font-bold text-sm tabular-nums">{formatBRL(metrics.patrimony)}</p>
              </div>
              <div className="p-2 rounded-lg bg-secondary/40">
                <p className="text-muted-foreground">Investido</p>
                <p className="font-bold text-sm tabular-nums">{formatBRL(metrics.invested)}</p>
              </div>
              <div className={`p-2 rounded-lg ${positive ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                <p className="text-muted-foreground flex items-center gap-1">
                  {positive ? <TrendingUp size={11} /> : <TrendingDown size={11} />} Resultado
                </p>
                <p className={`font-bold text-sm tabular-nums ${positive ? 'text-emerald-500' : 'text-red-500'}`}>
                  {priceAvailable ? `${formatBRL(metrics.profit)} (${metrics.profitPct.toFixed(2)}%)` : '—'}
                </p>
              </div>
            </div>

            {metrics.dividendsReceived > 0 && (
              <div className="mt-2 text-xs text-muted-foreground">
                Proventos recebidos: <span className="font-semibold text-primary">{formatBRL(metrics.dividendsReceived)}</span>
              </div>
            )}

            <div className="flex gap-2 mt-3">
              <button onClick={() => onContribute(asset.id)} className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center gap-1">
                <Plus size={13} /> Novo aporte
              </button>
              <button onClick={() => onDividend(asset.id)} className="flex-1 py-2 rounded-xl bg-secondary text-xs font-semibold flex items-center justify-center gap-1">
                <DollarSign size={13} /> Provento
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
