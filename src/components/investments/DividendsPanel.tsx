import { useMemo } from 'react';
import { DollarSign, TrendingUp } from 'lucide-react';
import { InvestmentAsset, InvestmentDividend } from '@/hooks/useInvestments';
import { formatBRL } from '@/lib/currency';

interface Props {
  dividends: InvestmentDividend[];
  assets: InvestmentAsset[];
  monthly: number;
  yearly: number;
  portfolioDy: number;
}

export function DividendsPanel({ dividends, assets, monthly, yearly, portfolioDy }: Props) {
  const accumulated = useMemo(
    () => dividends.reduce((s, d) => s + Number(d.amount || 0), 0),
    [dividends],
  );

  const byAsset = useMemo(() => {
    const map: Record<string, number> = {};
    dividends.forEach((d) => {
      map[d.asset_id] = (map[d.asset_id] ?? 0) + Number(d.amount);
    });
    return Object.entries(map)
      .map(([id, total]) => ({ asset: assets.find((a) => a.id === id), total }))
      .filter((x) => x.asset)
      .sort((a, b) => b.total - a.total);
  }, [dividends, assets]);

  const recent = useMemo(
    () => [...dividends].sort((a, b) => b.pay_date.localeCompare(a.pay_date)).slice(0, 20),
    [dividends],
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card icon={<DollarSign size={16} />} label="Prov. do mês" value={formatBRL(monthly)} />
        <Card icon={<DollarSign size={16} />} label="Prov. do ano" value={formatBRL(yearly)} />
        <Card icon={<DollarSign size={16} />} label="Acumulado" value={formatBRL(accumulated)} />
        <Card icon={<TrendingUp size={16} />} label="DY carteira" value={`${portfolioDy.toFixed(2)}%`} />
      </div>

      {byAsset.length > 0 && (
        <div className="p-4 rounded-2xl bg-card border border-border">
          <h3 className="font-bold text-sm mb-3">Proventos por ativo</h3>
          <div className="space-y-2">
            {byAsset.map(({ asset, total }) => (
              <div key={asset!.id} className="flex items-center justify-between text-sm">
                <span className="font-semibold">{asset!.ticker}</span>
                <span className="tabular-nums text-emerald-500 font-bold">{formatBRL(total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {recent.length > 0 ? (
        <div className="p-4 rounded-2xl bg-card border border-border">
          <h3 className="font-bold text-sm mb-3">Últimos proventos</h3>
          <div className="space-y-2">
            {recent.map((d) => {
              const a = assets.find((x) => x.id === d.asset_id);
              return (
                <div key={d.id} className="flex items-center justify-between text-xs">
                  <div>
                    <p className="font-semibold text-sm">{a?.ticker ?? '—'}</p>
                    <p className="text-muted-foreground">
                      {d.type} · {new Date(d.pay_date).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <p className="tabular-nums text-emerald-500 font-bold text-sm">
                    +{formatBRL(Number(d.amount))}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-6">
          Nenhum provento registrado ainda.
        </p>
      )}
    </div>
  );
}

function Card({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="p-3 rounded-2xl bg-card border border-border">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-500/10 text-emerald-500 mb-2">
        {icon}
      </div>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="font-bold text-base tabular-nums">{value}</p>
    </div>
  );
}
