import { useFinanceContext } from '@/contexts/FinanceContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Wallet, PiggyBank } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function BalanceCard() {
  const { totalBalance, currentMonthStats, formatCurrency, piggyBank, isLoading } = useFinanceContext();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const piggyBalance = Number(piggyBank?.balance || 0);
  const availableBalance = totalBalance - piggyBalance;

  if (isLoading) {
    return (
      <div className="card-finance gradient-balance p-6 animate-pulse">
        <div className="h-6 w-24 bg-white/20 rounded mb-4" />
        <div className="h-10 w-40 bg-white/20 rounded mb-6" />
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/10 rounded-xl p-3 h-20" />
          <div className="bg-white/10 rounded-xl p-3 h-20" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Main Balance Card */}
      <div className="card-finance gradient-balance p-6 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <Wallet size={18} className="text-white/80" />
            <span className="text-white/80 text-sm font-medium">Saldo Disponível</span>
          </div>
          
          <p className={cn(
            'font-mono text-4xl font-bold mb-6 tracking-tight',
            availableBalance >= 0 ? 'text-white' : 'text-rose-200'
          )}>
            {formatCurrency(availableBalance)}
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

      {/* Saved Money Card */}
      {isAuthenticated && (
        <button
          onClick={() => navigate('/savings')}
          className="w-full card-finance bg-gradient-to-r from-amber-500 to-orange-500 p-4 relative overflow-hidden touch-scale"
        >
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                <PiggyBank size={24} className="text-white" />
              </div>
              <div className="text-left">
                <p className="text-white/80 text-sm font-medium">Dinheiro Guardado</p>
                <p className="font-mono text-2xl font-bold text-white">
                  {formatCurrency(piggyBalance)}
                </p>
              </div>
            </div>
            <div className="text-white/60 text-sm">
              Ver →
            </div>
          </div>
        </button>
      )}
    </div>
  );
}
