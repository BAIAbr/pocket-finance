import { useState } from 'react';
import { useCdiYield, formatPercentage } from '@/hooks/useCdiYield';
import { PiggyBank, TrendingUp, Wallet, Calendar, Info, Settings2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';

interface YieldStatsCardProps {
  principal: number;
  startDate: Date | string | null;
  annualRate: number;
  formatCurrency: (amount: number) => string;
  onRateChange?: (rate: number) => void;
}

export function YieldStatsCard({ 
  principal, 
  startDate, 
  annualRate,
  formatCurrency,
  onRateChange
}: YieldStatsCardProps) {
  const [showRateConfig, setShowRateConfig] = useState(false);
  const [tempRate, setTempRate] = useState(annualRate);
  const yieldCalc = useCdiYield(principal, startDate, annualRate);
  
  const handleSaveRate = () => {
    if (onRateChange) {
      onRateChange(tempRate);
    }
    setShowRateConfig(false);
  };
  
  return (
    <div className="card-finance space-y-4">
      {/* Main Balance Display */}
      <div className="gradient-balance p-5 rounded-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <PiggyBank size={20} className="text-white/80" />
            <span className="text-white/80 text-sm font-medium">Saldo Atualizado</span>
          </div>
          <p className="font-mono text-3xl font-bold text-white tracking-tight">
            {formatCurrency(yieldCalc.updatedBalance)}
          </p>
          
          {yieldCalc.totalYield > 0 && (
            <div className="flex items-center gap-1 mt-2">
              <TrendingUp size={14} className="text-white/70" />
              <span className="text-white/70 text-sm">
                +{formatCurrency(yieldCalc.totalYield)} rendido ({formatPercentage(yieldCalc.effectiveRate)})
              </span>
            </div>
          )}
        </div>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Principal Amount */}
        <div className="bg-secondary/50 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <Wallet size={14} className="text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Valor Aportado</span>
          </div>
          <p className="font-mono font-semibold text-foreground">
            {formatCurrency(yieldCalc.principalAmount)}
          </p>
        </div>
        
        {/* Total Yield */}
        <div className="bg-secondary/50 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={14} className="text-income" />
            <span className="text-xs text-muted-foreground">Total Rendido</span>
          </div>
          <p className={cn(
            "font-mono font-semibold",
            yieldCalc.totalYield > 0 ? "text-income" : "text-foreground"
          )}>
            {yieldCalc.totalYield > 0 ? '+' : ''}{formatCurrency(yieldCalc.totalYield)}
          </p>
        </div>
        
        {/* Daily Yield */}
        <div className="bg-secondary/50 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <Calendar size={14} className="text-accent" />
            <span className="text-xs text-muted-foreground">Rend. do Dia</span>
          </div>
          <p className={cn(
            "font-mono font-semibold",
            yieldCalc.dailyYield > 0 ? "text-accent" : "text-foreground"
          )}>
            {yieldCalc.dailyYield > 0 ? '+' : ''}{formatCurrency(yieldCalc.dailyYield)}
          </p>
        </div>
        
        {/* Days Invested */}
        <div className="bg-secondary/50 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <Info size={14} className="text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Dias Investidos</span>
          </div>
          <p className="font-mono font-semibold text-foreground">
            {yieldCalc.daysInvested} {yieldCalc.daysInvested === 1 ? 'dia' : 'dias'}
          </p>
        </div>
      </div>
      
      {/* CDI Rate Info - Clickable to configure */}
      {showRateConfig ? (
        <div className="bg-accent/10 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Taxa CDI do seu banco</span>
            <button
              onClick={handleSaveRate}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:bg-accent/90 transition-colors"
            >
              <Check size={14} />
              Salvar
            </button>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Taxa anual</span>
              <span className="font-mono font-semibold text-accent">{formatPercentage(tempRate)}</span>
            </div>
            <Slider
              value={[tempRate]}
              onValueChange={(value) => setTempRate(value[0])}
              min={5}
              max={20}
              step={0.05}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>5%</span>
              <span>20%</span>
            </div>
          </div>
          
          <p className="text-xs text-muted-foreground">
            💡 Consulte a taxa CDI do seu banco. A maioria paga entre 100% e 110% do CDI.
          </p>
        </div>
      ) : (
        <button
          onClick={() => {
            setTempRate(annualRate);
            setShowRateConfig(true);
          }}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-accent/10 rounded-lg hover:bg-accent/20 transition-colors group"
        >
          <Info size={14} className="text-accent" />
          <p className="text-xs text-accent">
            Rendimento estimado: 100% do CDI ({formatPercentage(yieldCalc.annualRate)} a.a.)
          </p>
          <Settings2 size={14} className="text-accent opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      )}
    </div>
  );
}
