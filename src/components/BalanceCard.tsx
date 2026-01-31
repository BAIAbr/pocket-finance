import { useFinanceContext } from '@/contexts/FinanceContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Wallet, PiggyBank, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function BalanceCard() {
  const { totalBalance, currentMonthStats, formatCurrency, piggyBank, isLoading } = useFinanceContext();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const piggyBalance = Number(piggyBank?.balance || 0);
  const availableBalance = totalBalance - piggyBalance;

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="card-finance gradient-balance p-6">
          <div className="h-5 w-28 bg-white/20 rounded-lg mb-3 shimmer" />
          <div className="h-12 w-48 bg-white/20 rounded-lg mb-6 shimmer" />
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 rounded-xl p-4 h-24 shimmer" />
            <div className="bg-white/10 rounded-xl p-4 h-24 shimmer" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Main Balance Card */}
      <div className="card-finance gradient-balance p-6 relative overflow-hidden group">
        {/* Animated background elements */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-500" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2 group-hover:scale-110 transition-transform duration-500" />
        <div className="absolute top-1/2 right-1/4 w-24 h-24 bg-white/3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <Wallet size={16} className="text-white" />
            </div>
            <span className="text-white/90 text-sm font-medium tracking-wide">Saldo Disponível</span>
          </div>
          
          <p className={cn(
            'font-mono text-4xl font-bold mb-6 tracking-tight transition-all duration-300',
            availableBalance >= 0 ? 'text-white' : 'text-rose-200'
          )}>
            {formatCurrency(availableBalance)}
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm border border-white/10 hover:bg-white/15 transition-all duration-200 group/card">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-emerald-400/30 flex items-center justify-center">
                  <TrendingUp size={12} className="text-emerald-300" />
                </div>
                <span className="text-white/70 text-xs font-medium">Entradas</span>
              </div>
              <p className="font-mono text-xl font-bold text-emerald-300 group-hover/card:scale-105 transition-transform origin-left">
                {formatCurrency(currentMonthStats.income)}
              </p>
            </div>
            
            <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm border border-white/10 hover:bg-white/15 transition-all duration-200 group/card">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-rose-400/30 flex items-center justify-center">
                  <TrendingDown size={12} className="text-rose-300" />
                </div>
                <span className="text-white/70 text-xs font-medium">Saídas</span>
              </div>
              <p className="font-mono text-xl font-bold text-rose-300 group-hover/card:scale-105 transition-transform origin-left">
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
          className="w-full card-finance gradient-savings p-4 relative overflow-hidden touch-scale hover-lift group"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-125 transition-transform duration-500" />
          <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-white/5 rounded-full group-hover:scale-150 transition-transform duration-500" />
          
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm border border-white/10 group-hover:rotate-12 transition-transform duration-300">
                <PiggyBank size={24} className="text-white" />
              </div>
              <div className="text-left">
                <div className="flex items-center gap-1.5">
                  <p className="text-white/90 text-sm font-medium">Dinheiro Guardado</p>
                  <Sparkles size={12} className="text-amber-200 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="font-mono text-2xl font-bold text-white">
                  {formatCurrency(piggyBalance)}
                </p>
              </div>
            </div>
            <div className="text-white/70 text-sm font-medium group-hover:translate-x-1 transition-transform">
              Ver →
            </div>
          </div>
        </button>
      )}
    </div>
  );
}
