import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarClock, ChevronRight, Check } from 'lucide-react';
import { useRecurring, daysUntil } from '@/hooks/useRecurring';
import { useFinanceContext } from '@/contexts/FinanceContext';
import { cn } from '@/lib/utils';

export function UpcomingBillsCard() {
  const { items, payNow } = useRecurring();
  const { settings } = useFinanceContext();
  const navigate = useNavigate();

  const upcoming = useMemo(() => {
    return items
      .filter(i => i.is_active)
      .filter(i => daysUntil(i.next_due_date) <= 30)
      .sort((a, b) => a.next_due_date.localeCompare(b.next_due_date))
      .slice(0, 5);
  }, [items]);

  if (upcoming.length === 0) return null;

  const fmt = (v: number) => `${settings.currencySymbol} ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="card-finance">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
            <CalendarClock size={16} className="text-primary" />
          </div>
          <h3 className="font-semibold text-sm">Próximas contas</h3>
        </div>
        <button onClick={() => navigate('/recurring')} className="text-xs text-primary font-medium flex items-center gap-0.5">
          Ver todas <ChevronRight size={14} />
        </button>
      </div>

      <div className="space-y-2">
        {upcoming.map(item => {
          const days = daysUntil(item.next_due_date);
          const isOverdue = days < 0;
          const isToday = days === 0;
          const isSoon = days > 0 && days <= 3;
          const label = isOverdue ? `Vencida há ${Math.abs(days)}d` : isToday ? 'Vence hoje' : `Em ${days}d`;

          return (
            <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition">
              <div className={cn('w-1 self-stretch rounded-full', item.type === 'income' ? 'bg-income' : 'bg-expense')} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{item.name}</p>
                <p className={cn(
                  'text-[11px] font-medium',
                  isOverdue ? 'text-destructive' : isToday ? 'text-primary' : isSoon ? 'text-orange-500' : 'text-muted-foreground'
                )}>{label}</p>
              </div>
              <div className="text-right">
                <p className={cn('font-semibold text-sm', item.type === 'income' ? 'text-income' : 'text-expense')}>
                  {item.type === 'income' ? '+' : '-'}{fmt(item.amount)}
                </p>
              </div>
              <button
                onClick={() => payNow(item)}
                className="p-2 rounded-lg bg-primary/15 hover:bg-primary/25 text-primary transition touch-scale"
                title="Marcar como paga"
              >
                <Check size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
