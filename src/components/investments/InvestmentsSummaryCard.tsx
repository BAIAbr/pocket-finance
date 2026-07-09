import { useNavigate } from 'react-router-dom';
import { TrendingUp, ArrowRight } from 'lucide-react';
import { useInvestments } from '@/hooks/useInvestments';
import { formatBRL } from '@/lib/currency';

export function InvestmentsSummaryCard() {
  const navigate = useNavigate();
  const { portfolio, loading, assets } = useInvestments();

  if (loading || assets.length === 0) return null;

  const positive = portfolio.totalProfit >= 0;

  return (
    <button
      onClick={() => navigate('/investments')}
      className="w-full text-left p-4 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 hover:border-primary/40 transition-all touch-scale"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center">
            <TrendingUp size={18} className="text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Investimentos</p>
            <p className="font-bold text-sm">Central</p>
          </div>
        </div>
        <ArrowRight size={16} className="text-primary" />
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <p className="text-muted-foreground">Patrimônio</p>
          <p className="font-bold text-sm tabular-nums">{formatBRL(portfolio.totalPatrimony)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Prov. mês</p>
          <p className="font-bold text-sm tabular-nums text-emerald-500">{formatBRL(portfolio.monthlyDividends)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Rentab.</p>
          <p className={`font-bold text-sm tabular-nums ${positive ? 'text-emerald-500' : 'text-red-500'}`}>{portfolio.totalProfitPct.toFixed(2)}%</p>
        </div>
      </div>
    </button>
  );
}
