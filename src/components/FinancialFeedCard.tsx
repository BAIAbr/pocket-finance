import { useState } from 'react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Activity, Sparkles } from 'lucide-react';
import { useFinancialFeed, FeedEvent } from '@/hooks/useFinancialFeed';
import { useEffectiveFinance } from '@/hooks/useEffectiveFinance';
import { getIconComponent } from '@/lib/icons';
import { cn } from '@/lib/utils';

function eventSign(type: FeedEvent['type']): 'up' | 'down' | 'neutral' {
  if (type === 'income' || type === 'piggy_deposit' || type === 'piggy_completed') return 'up';
  if (type === 'expense' || type === 'piggy_withdraw') return 'down';
  return 'neutral';
}

export function FinancialFeedCard() {
  const feed = useFinancialFeed(14, 30);
  const { formatCurrency } = useEffectiveFinance() as any;
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? feed : feed.slice(0, 6);

  if (feed.length === 0) {
    return (
      <div className="card-finance">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
            <Activity size={16} className="text-primary" />
          </div>
          <h3 className="font-semibold text-sm">Feed financeiro</h3>
        </div>
        <div className="flex flex-col items-center py-6 text-center">
          <Sparkles size={22} className="text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Sua atividade recente aparece aqui.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card-finance">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
            <Activity size={16} className="text-primary" />
          </div>
          <h3 className="font-semibold text-sm">Feed financeiro</h3>
        </div>
        <span className="text-[11px] text-muted-foreground">Últimos 14 dias</span>
      </div>

      <div className="relative">
        <div className="absolute left-[19px] top-1 bottom-1 w-px bg-border/60" aria-hidden />
        <ul className="space-y-3">
          {visible.map(ev => {
            const Icon = getIconComponent(ev.icon);
            const sign = eventSign(ev.type);
            let ago = '';
            try { ago = formatDistanceToNow(parseISO(ev.timestamp), { locale: ptBR, addSuffix: true }); } catch { ago = ''; }
            return (
              <li key={ev.id} className="relative flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 ring-4 ring-background"
                  style={{ backgroundColor: `${ev.color}20`, color: ev.color }}
                >
                  <Icon size={16} />
                </div>
                <div className="flex-1 min-w-0 pt-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{ev.title}</p>
                      {ev.subtitle && <p className="text-[11px] text-muted-foreground truncate">{ev.subtitle}</p>}
                    </div>
                    <p className={cn(
                      'font-semibold text-sm whitespace-nowrap shrink-0',
                      sign === 'up' ? 'text-income' : sign === 'down' ? 'text-expense' : 'text-foreground'
                    )}>
                      {sign === 'up' ? '+' : sign === 'down' ? '-' : ''}{formatCurrency(ev.amount)}
                    </p>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{ago}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {feed.length > 6 && (
        <button
          onClick={() => setShowAll(v => !v)}
          className="w-full mt-4 py-2 rounded-lg text-xs font-medium bg-secondary hover:bg-secondary/70 transition"
        >
          {showAll ? 'Recolher' : `Ver todos os ${feed.length} eventos`}
        </button>
      )}
    </div>
  );
}
