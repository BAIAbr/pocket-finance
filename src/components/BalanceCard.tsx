import { useFinanceContext } from '@/contexts/FinanceContext';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react';

export function BalanceCard() {
  const { totalBalance, currentMonthStats, formatCurrency } = useFinanceContext();

  return (
    <div className="card-finance gradient-balance p-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
      
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-2">
          <Wallet size={18} className="text-white/80" />
          <span className="text-white/80 text-sm font-medium">Saldo Total</span>
        </div>
        
        <p className={cn(
          'font-mono text-4xl font-bold mb-6 tracking-tight',
          totalBalance >= 0 ? 'text-white' : 'text-rose-200'
        )}>
          {formatCurrency(totalBalance)}
        </p>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={14} className="text-emerald-300" />
              <span className="text-white/70 text-xs">Entradas</span>
            </div>
            <p className="font-mono text-lg font-semibold text-emerald-300">
              {formatCurrency(currentMonthStats.income)}
            </p>
          </div>
          
          <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown size={14} className="text-rose-300" />
              <span className="text-white/70 text-xs">Saídas</span>
            </div>
            <p className="font-mono text-lg font-semibold text-rose-300">
              {formatCurrency(currentMonthStats.expense)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
