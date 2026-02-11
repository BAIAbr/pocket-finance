import { TrendingDown, TrendingUp, Flame, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFinanceContext } from '@/contexts/FinanceContext';

interface WeeklySummaryCardProps {
  totalSpent: number;
  variationPercent: number;
  topCategory: { name: string; icon: string; color: string; total: number } | null;
  currentStreak: number;
  isVisible: boolean;
}

export function WeeklySummaryCard({
  totalSpent,
  variationPercent,
  topCategory,
  currentStreak,
  isVisible,
}: WeeklySummaryCardProps) {
  const navigate = useNavigate();
  const { formatCurrency } = useFinanceContext();

  if (!isVisible || totalSpent === 0) return null;

  const isReduction = variationPercent < 0;
  const absVariation = Math.abs(variationPercent);

  return (
    <div className="rounded-2xl bg-card border border-border/50 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-medium text-muted-foreground">Resumo da semana</h3>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Total gasto</p>
          <p className="text-2xl font-bold">{formatCurrency(totalSpent)}</p>
        </div>

        {variationPercent !== 0 && (
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
            isReduction 
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
              : 'bg-red-500/10 text-red-600 dark:text-red-400'
          }`}>
            {isReduction ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
            {absVariation.toFixed(0)}%
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-border/30">
        <div className="flex items-center gap-4">
          {topCategory && (
            <div className="flex items-center gap-2">
              <div 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: topCategory.color }} 
              />
              <span className="text-xs text-muted-foreground">
                Maior gasto: <span className="font-medium text-foreground">{topCategory.name}</span>
              </span>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <Flame className="w-3 h-3 text-orange-500" />
            <span className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{currentStreak}</span> dias
            </span>
          </div>
        </div>

        <button
          onClick={() => navigate('/reports')}
          className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
        >
          Ver detalhes
        </button>
      </div>
    </div>
  );
}
