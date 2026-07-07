import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { format, subDays, parseISO, isAfter, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TrendingUp, PiggyBank } from 'lucide-react';
import { useCdiYield } from '@/hooks/useCdiYield';

interface PiggyBankData {
  id: string;
  name: string;
  balance: number;
  principal_amount: number;
  cdi_rate_annual: number;
  yield_start_date: string | null;
  created_at: string;
  color: string;
}

interface ConsolidatedYieldChartProps {
  piggyBanks: PiggyBankData[];
  formatCurrency: (amount: number) => string;
}

export function ConsolidatedYieldChart({ piggyBanks, formatCurrency }: ConsolidatedYieldChartProps) {
  // Filter piggy banks with balance
  const activePiggyBanks = piggyBanks.filter(p => Number(p.principal_amount) > 0);
  
  if (activePiggyBanks.length === 0) {
    return null;
  }
  
  // Generate consolidated data for last 30 days
  const today = startOfDay(new Date());
  const daysToShow = 30;
  
  // Calculate earliest start date
  const earliestDate = activePiggyBanks.reduce((earliest, piggy) => {
    const startDate = new Date(piggy.yield_start_date || piggy.created_at);
    return startDate < earliest ? startDate : earliest;
  }, today);
  
  const chartData = [];
  
  for (let i = daysToShow; i >= 0; i--) {
    const date = subDays(today, i);
    if (isBefore(date, earliestDate)) continue;
    
    let totalBalance = 0;
    let totalPrincipal = 0;
    let totalYield = 0;
    
    for (const piggy of activePiggyBanks) {
      const startDate = startOfDay(new Date(piggy.yield_start_date || piggy.created_at));
      
      // Skip if this piggy bank wasn't created yet on this date
      if (isBefore(date, startDate)) continue;
      
      const principal = Number(piggy.principal_amount);
      const annualRate = Number(piggy.cdi_rate_annual) || 14.15;
      
      // Calculate days invested for this specific date
      const daysInvested = Math.max(0, Math.floor((date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
      
      // Calculate compound yield up to this date
      const dailyRate = annualRate / 100 / 252;
      const accumulatedYield = principal * (Math.pow(1 + dailyRate, daysInvested) - 1);
      
      totalPrincipal += principal;
      totalYield += accumulatedYield;
      totalBalance += principal + accumulatedYield;
    }
    
    chartData.push({
      date: format(date, 'yyyy-MM-dd'),
      dateFormatted: format(date, 'dd/MM', { locale: ptBR }),
      balance: totalBalance,
      principal: totalPrincipal,
      yield: totalYield,
    });
  }
  
  if (chartData.length < 2) {
    return null;
  }
  
  // Calculate totals for summary
  const currentData = chartData[chartData.length - 1];
  const totalBalance = currentData?.balance || 0;
  const totalYield = currentData?.yield || 0;
  const totalPrincipal = currentData?.principal || 0;
  
  return (
    <div className="card-finance">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp size={18} className="text-accent" />
          <h3 className="text-sm font-medium text-muted-foreground">Evolução Consolidada</h3>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <PiggyBank size={12} />
          <span>{activePiggyBanks.length} {activePiggyBanks.length === 1 ? 'meta' : 'metas'}</span>
        </div>
      </div>
      
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-secondary/50 rounded-lg p-3 text-center">
          <p className="text-xs text-muted-foreground mb-1">Total Investido</p>
          <p className="font-mono font-semibold text-sm">{formatCurrency(totalPrincipal)}</p>
        </div>
        <div className="bg-income/10 rounded-lg p-3 text-center">
          <p className="text-xs text-muted-foreground mb-1">Rendimento</p>
          <p className="font-mono font-semibold text-sm text-income">+{formatCurrency(totalYield)}</p>
        </div>
        <div className="bg-accent/10 rounded-lg p-3 text-center">
          <p className="text-xs text-muted-foreground mb-1">Saldo Total</p>
          <p className="font-mono font-semibold text-sm text-accent">{formatCurrency(totalBalance)}</p>
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height={160}>
        <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <defs>
            <linearGradient id="consolidatedGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.4}/>
              <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <XAxis 
            dataKey="dateFormatted" 
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
            interval="preserveStartEnd"
          />
          <YAxis hide domain={['dataMin * 0.95', 'dataMax * 1.05']} />
          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="bg-popover border border-border rounded-lg p-3 shadow-lg text-xs">
                    <p className="font-medium text-foreground mb-2">{label}</p>
                    <div className="space-y-1">
                      <p className="text-muted-foreground">
                        Aportado: <span className="font-mono text-foreground">{formatCurrency(data.principal)}</span>
                      </p>
                      <p className="text-muted-foreground">
                        Rendido: <span className="font-mono text-income">+{formatCurrency(data.yield)}</span>
                      </p>
                      <p className="text-muted-foreground font-medium">
                        Total: <span className="font-mono text-accent">{formatCurrency(data.balance)}</span>
                      </p>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Area
            type="monotone"
            dataKey="balance"
            stroke="hsl(var(--accent))"
            strokeWidth={2}
            fill="url(#consolidatedGradient)"
            name="Saldo Total"
          />
        </AreaChart>
      </ResponsiveContainer>
      
      <p className="text-[10px] text-muted-foreground text-center mt-3 opacity-70">
        * Evolução dos últimos 30 dias de todos os metas
      </p>
    </div>
  );
}
