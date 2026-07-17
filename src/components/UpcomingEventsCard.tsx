import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, ChevronRight, CalendarClock, Target, Flag } from 'lucide-react';
import { parseISO, differenceInCalendarDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useRecurring } from '@/hooks/useRecurring';
import { useFinancialGoals } from '@/hooks/useFinancialGoals';
import { useEffectiveFinance } from '@/hooks/useEffectiveFinance';
import { cn } from '@/lib/utils';

interface EventItem {
  id: string;
  kind: 'bill' | 'goal' | 'piggy';
  title: string;
  subtitle: string;
  date: string;
  amount?: number;
  route: string;
  accent: 'income' | 'expense' | 'primary';
}

function daysDelta(iso: string): number {
  try { return differenceInCalendarDays(parseISO(iso), new Date()); } catch { return 999; }
}

export function UpcomingEventsCard() {
  const navigate = useNavigate();
  const { items: recurring } = useRecurring();
  const { goals } = useFinancialGoals();
  const { piggyBanks, formatCurrency } = useEffectiveFinance() as any;

  const events = useMemo<EventItem[]>(() => {
    const out: EventItem[] = [];

    recurring
      .filter(r => r.is_active)
      .forEach(r => {
        const d = daysDelta(r.next_due_date);
        if (d > 45) return;
        out.push({
          id: `bill-${r.id}`,
          kind: 'bill',
          title: r.name,
          subtitle: r.type === 'income' ? 'Recebimento previsto' : 'Conta a pagar',
          date: r.next_due_date,
          amount: Number(r.amount),
          route: '/recurring',
          accent: r.type === 'income' ? 'income' : 'expense',
        });
      });

    (goals as any[])
      .filter(g => !g.is_completed && g.target_date)
      .forEach(g => {
        const d = daysDelta(g.target_date!);
        if (d > 90 || d < -30) return;
        out.push({
          id: `goal-${g.id}`,
          kind: 'goal',
          title: g.title,
          subtitle: 'Prazo da meta',
          date: g.target_date!,
          amount: Number(g.target_amount),
          route: '/planning',
          accent: 'primary',
        });
      });

    (piggyBanks as any[])
      .filter(p => !p.is_completed && p.target_date)
      .forEach(p => {
        const d = daysDelta(p.target_date);
        if (d > 90 || d < -30) return;
        out.push({
          id: `piggy-${p.id}`,
          kind: 'piggy',
          title: p.name,
          subtitle: 'Meta do cofrinho',
          date: p.target_date,
          amount: Number(p.target_amount ?? 0),
          route: '/savings',
          accent: 'primary',
        });
      });

    out.sort((a, b) => a.date.localeCompare(b.date));
    return out.slice(0, 6);
  }, [recurring, goals, piggyBanks]);

  if (events.length === 0) return null;

  return (
    <div className="card-finance">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
            <CalendarDays size={16} className="text-primary" />
          </div>
          <h3 className="font-semibold text-sm">Próximos eventos</h3>
        </div>
        <button onClick={() => navigate('/recurring')} className="text-xs text-primary font-medium flex items-center gap-0.5">
          Ver tudo <ChevronRight size={14} />
        </button>
      </div>

      <ul className="space-y-2">
        {events.map(ev => {
          const d = daysDelta(ev.date);
          const label = d < 0 ? `${Math.abs(d)}d de atraso` : d === 0 ? 'Hoje' : `Em ${d}d`;
          const badgeCls =
            d < 0 ? 'bg-destructive/15 text-destructive'
            : d === 0 ? 'bg-primary/15 text-primary'
            : d <= 3 ? 'bg-orange-500/15 text-orange-500'
            : 'bg-secondary text-muted-foreground';
          const Icon = ev.kind === 'bill' ? CalendarClock : ev.kind === 'goal' ? Flag : Target;
          const amountCls =
            ev.accent === 'income' ? 'text-income'
            : ev.accent === 'expense' ? 'text-expense'
            : 'text-primary';
          let dateLbl = '';
          try { dateLbl = format(parseISO(ev.date), "dd 'de' MMM", { locale: ptBR }); } catch { dateLbl = ev.date; }

          return (
            <li key={ev.id}>
              <button
                onClick={() => navigate(ev.route)}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition text-left touch-scale"
              >
                <div className={cn(
                  'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
                  ev.accent === 'income' ? 'bg-income/15 text-income'
                  : ev.accent === 'expense' ? 'bg-expense/15 text-expense'
                  : 'bg-primary/15 text-primary'
                )}>
                  <Icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-sm truncate">{ev.title}</p>
                    {typeof ev.amount === 'number' && (
                      <p className={cn('font-semibold text-sm whitespace-nowrap shrink-0', amountCls)}>
                        {formatCurrency(ev.amount)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap mt-0.5">
                    <span className="text-[11px] text-muted-foreground">{ev.subtitle}</span>
                    <span className="text-[11px] text-muted-foreground">•</span>
                    <span className="text-[11px] text-muted-foreground">{dateLbl}</span>
                    <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full', badgeCls)}>{label}</span>
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
