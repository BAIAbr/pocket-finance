import { useCdiYield, formatPercentage } from '@/hooks/useCdiYield';
import { Target, TrendingUp, Wallet, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GoalYieldCardProps {
  goalName: string;
  goalColor: string;
  principal: number;
  startDate: Date | string | null;
  annualRate: number;
  targetAmount: number;
  formatCurrency: (amount: number) => string;
  onAddValue?: () => void;
  onDelete?: () => void;
  deadline?: string | null;
}

export function GoalYieldCard({ 
  goalName,
  goalColor,
  principal, 
  startDate, 
  annualRate,
  targetAmount,
  formatCurrency,
  onAddValue,
  onDelete,
  deadline
}: GoalYieldCardProps) {
  const yieldCalc = useCdiYield(principal, startDate, annualRate);
  
  // Calculate progress with yield
  const progressWithYield = targetAmount > 0 ? (yieldCalc.updatedBalance / targetAmount) * 100 : 0;
  const progressWithoutYield = targetAmount > 0 ? (principal / targetAmount) * 100 : 0;
  
  return (
    <div className="card-finance">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div 
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${goalColor}20` }}
          >
            <Target size={24} style={{ color: goalColor }} />
          </div>
          <div>
            <p className="font-semibold">{goalName}</p>
            {deadline && (
              <p className="text-xs text-muted-foreground">
                até {deadline}
              </p>
            )}
          </div>
        </div>
        {onDelete && (
          <button
            onClick={onDelete}
            className="p-2 text-muted-foreground hover:text-destructive transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18"/>
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
            </svg>
          </button>
        )}
      </div>
      
      {/* Progress section */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Progresso</span>
          <span className="font-mono font-medium">{Math.min(progressWithYield, 100).toFixed(0)}%</span>
        </div>
        
        {/* Progress bar with yield indicator */}
        <div className="h-3 bg-secondary rounded-full overflow-hidden relative">
          {/* Base progress (without yield) */}
          <div 
            className="h-full rounded-full transition-all duration-500 absolute left-0 top-0"
            style={{ 
              width: `${Math.min(progressWithoutYield, 100)}%`,
              backgroundColor: goalColor 
            }}
          />
          {/* Yield portion (lighter shade) */}
          {yieldCalc.totalYield > 0.01 && (
            <div 
              className="h-full rounded-r-full transition-all duration-500 absolute top-0 opacity-50"
              style={{ 
                left: `${Math.min(progressWithoutYield, 100)}%`,
                width: `${Math.min(progressWithYield - progressWithoutYield, 100 - progressWithoutYield)}%`,
                backgroundColor: goalColor 
              }}
            />
          )}
        </div>
        
        {/* Values display */}
        <div className="flex justify-between text-sm">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <Wallet size={12} className="text-muted-foreground" />
              <span className="font-mono text-muted-foreground">
                {formatCurrency(principal)}
              </span>
            </div>
            {yieldCalc.totalYield > 0.01 && (
              <div className="flex items-center gap-2 mt-0.5">
                <TrendingUp size={12} className="text-income" />
                <span className="text-xs text-income font-mono">
                  +{formatCurrency(yieldCalc.totalYield)}
                </span>
              </div>
            )}
          </div>
          <div className="text-right">
            <span className="font-mono font-semibold block">
              {formatCurrency(targetAmount)}
            </span>
            <span className="text-xs text-muted-foreground">meta</span>
          </div>
        </div>
      </div>

      {/* Yield info badge */}
      {yieldCalc.daysInvested > 0 && (
        <div className="flex items-center justify-center gap-2 mt-3 py-1.5 px-3 bg-income/10 rounded-lg">
          <Info size={12} className="text-income" />
          <p className="text-xs text-income">
            {yieldCalc.cdiPercentage.toFixed(0)}% CDI • {yieldCalc.daysInvested} {yieldCalc.daysInvested === 1 ? 'dia' : 'dias'} rendendo
          </p>
        </div>
      )}

      {onAddValue && (
        <button
          onClick={onAddValue}
          className="w-full mt-4 py-2 rounded-lg bg-secondary text-sm font-medium hover:bg-secondary/80 transition-all touch-scale"
        >
          + Adicionar valor
        </button>
      )}
    </div>
  );
}
