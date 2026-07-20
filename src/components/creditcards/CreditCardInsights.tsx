import { useNavigate } from 'react-router-dom';
import { Sparkles, TrendingUp, AlertTriangle, LineChart, Target, Star, Repeat, Wand2, ChevronRight } from 'lucide-react';
import { CardInsight, InsightIcon, InsightSeverity } from '@/hooks/useCreditCardInsights';
import { cn } from '@/lib/utils';

const ICONS: Record<InsightIcon, any> = {
  'trend-up': TrendingUp,
  'trend-down': TrendingUp,
  alert: AlertTriangle,
  forecast: LineChart,
  target: Target,
  star: Star,
  repeat: Repeat,
  sparkle: Wand2,
};

const TONE: Record<InsightSeverity, string> = {
  info: 'bg-primary/10 text-primary',
  good: 'bg-emerald-500/10 text-emerald-600',
  warning: 'bg-orange-500/10 text-orange-600',
  danger: 'bg-red-500/10 text-red-600',
};

interface Props {
  insights: CardInsight[];
  title?: string;
  compact?: boolean;
  showCardLink?: boolean;
  emptyLabel?: string;
}

export default function CreditCardInsights({ insights, title = 'Insights do cartão', compact, showCardLink, emptyLabel }: Props) {
  const navigate = useNavigate();
  if (!insights || insights.length === 0) {
    if (emptyLabel === null) return null;
    return null;
  }
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <Sparkles className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className={cn('grid gap-2', compact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2')}>
        {insights.map(i => {
          const Icon = ICONS[i.icon] ?? Sparkles;
          const clickable = showCardLink && i.cardId;
          return (
            <button
              key={i.id}
              type="button"
              onClick={clickable ? () => navigate(`/cards/${i.cardId}`) : undefined}
              className={cn(
                'rounded-xl border bg-card p-3 text-left flex gap-3 items-start transition-colors',
                clickable ? 'hover:bg-accent cursor-pointer' : 'cursor-default',
              )}
            >
              <div className={cn('rounded-lg p-2 shrink-0', TONE[i.severity])}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold truncate">{i.title}</div>
                  {i.value && <div className="text-xs font-semibold shrink-0">{i.value}</div>}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5 leading-snug">{i.description}</div>
              </div>
              {clickable && <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 self-center" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
