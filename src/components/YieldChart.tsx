import { useYieldHistory, formatPercentage } from '@/hooks/useCdiYield';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TrendingUp, Info } from 'lucide-react';

interface YieldChartProps {
  principal: number;
  startDate: Date | string | null;
  annualRate: number;
  formatCurrency: (amount: number) => string;
}

export function YieldChart({ 
  principal, 
  startDate, 
  annualRate,
  formatCurrency 
}: YieldChartProps) {
  const history = useYieldHistory(principal, startDate, annualRate);
  
  if (history.length < 2) {
    return (
      <div className="card-finance">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={18} className="text-accent" />
          <h3 className="text-sm font-medium text-muted-foreground">Evolução do Rendimento</h3>
        </div>
        <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">
          <p>Dados insuficientes para o gráfico</p>
        </div>
      </div>
    );
  }
  
  // Format data for chart
  const chartData = history.map(point => ({
    ...point,
    dateFormatted: format(parseISO(point.date), 'dd/MM', { locale: ptBR }),
  }));
  
  return (
    <div className="card-finance">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp size={18} className="text-accent" />
          <h3 className="text-sm font-medium text-muted-foreground">Evolução do Rendimento</h3>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Info size={12} />
          <span>CDI {formatPercentage(annualRate)} a.a.</span>
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height={140}>
        <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <defs>
            <linearGradient id="yieldGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--income))" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="hsl(var(--income))" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <XAxis 
            dataKey="dateFormatted" 
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
            interval="preserveStartEnd"
          />
          <YAxis hide domain={['dataMin', 'dataMax']} />
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
                        Total: <span className="font-mono text-foreground">{formatCurrency(data.balance)}</span>
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
            stroke="hsl(var(--income))"
            strokeWidth={2}
            fill="url(#balanceGradient)"
            name="Saldo Total"
          />
        </AreaChart>
      </ResponsiveContainer>
      
      {/* Legend */}
      <div className="flex justify-center gap-6 mt-3 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-income" />
          <span className="text-muted-foreground">Saldo Total</span>
        </div>
      </div>
      
      {/* Disclaimer */}
      <p className="text-[10px] text-muted-foreground text-center mt-3 opacity-70">
        * Valores estimados baseados em 100% do CDI. Rendimento passado não garante rendimento futuro.
      </p>
    </div>
  );
}
