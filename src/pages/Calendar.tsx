import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, CalendarClock, Check,
} from 'lucide-react';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, addWeeks, addYears,
  format, isSameMonth, isSameDay, parseISO, isToday,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useFinanceContext } from '@/contexts/FinanceContext';
import { useRecurring, daysUntil } from '@/hooks/useRecurring';
import { cn } from '@/lib/utils';

type EventKind = 'transaction' | 'recurring';
interface DayEvent {
  id: string;
  kind: EventKind;
  type: 'income' | 'expense';
  name: string;
  amount: number;
  date: Date;
  recurringId?: string;
}

function projectRecurrenceInRange(nextDue: string, frequency: 'weekly'|'monthly'|'yearly', rangeStart: Date, rangeEnd: Date): Date[] {
  const start = parseISO(nextDue);
  const dates: Date[] = [];
  const step = (d: Date) =>
    frequency === 'weekly' ? addWeeks(d, 1) :
    frequency === 'yearly' ? addYears(d, 1) :
    addMonths(d, 1);
  const stepBack = (d: Date) =>
    frequency === 'weekly' ? addWeeks(d, -1) :
    frequency === 'yearly' ? addYears(d, -1) :
    addMonths(d, -1);

  // Forward
  let cur = start;
  let guard = 0;
  while (cur <= rangeEnd && guard < 200) {
    if (cur >= rangeStart) dates.push(cur);
    cur = step(cur);
    guard++;
  }
  // Backward (older due dates in range)
  cur = stepBack(start);
  guard = 0;
  while (cur >= rangeStart && guard < 200) {
    if (cur <= rangeEnd) dates.push(cur);
    cur = stepBack(cur);
    guard++;
  }
  return dates;
}

export default function CalendarPage() {
  const navigate = useNavigate();
  const { transactions, settings, getCategoryById } = useFinanceContext();
  const { items: recurring, payNow } = useRecurring();
  const [cursor, setCursor] = useState(new Date());
  const [selected, setSelected] = useState<Date>(new Date());

  const fmt = (v: number) => `${settings.currencySymbol} ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days = useMemo(() => {
    const arr: Date[] = [];
    let d = gridStart;
    while (d <= gridEnd) { arr.push(d); d = addDays(d, 1); }
    return arr;
  }, [gridStart, gridEnd]);

  const events = useMemo<DayEvent[]>(() => {
    const list: DayEvent[] = [];
    (transactions as any[]).forEach(t => {
      const d = parseISO(t.date);
      if (d >= gridStart && d <= gridEnd) {
        list.push({
          id: `t-${t.id}`,
          kind: 'transaction',
          type: t.type,
          name: t.description || getCategoryById(t.category_id)?.name || 'Transação',
          amount: Number(t.amount),
          date: d,
        });
      }
    });
    recurring.filter(r => r.is_active).forEach(r => {
      const projected = projectRecurrenceInRange(r.next_due_date, r.frequency, gridStart, gridEnd);
      projected.forEach(d => {
        list.push({
          id: `r-${r.id}-${format(d, 'yyyy-MM-dd')}`,
          kind: 'recurring',
          type: r.type,
          name: r.name,
          amount: Number(r.amount),
          date: d,
          recurringId: r.id,
        });
      });
    });
    return list;
  }, [transactions, recurring, gridStart, gridEnd, getCategoryById]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, DayEvent[]>();
    events.forEach(e => {
      const key = format(e.date, 'yyyy-MM-dd');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    });
    return map;
  }, [events]);

  const monthTotals = useMemo(() => {
    let income = 0, expense = 0;
    events.forEach(e => {
      if (!isSameMonth(e.date, cursor)) return;
      if (e.type === 'income') income += e.amount; else expense += e.amount;
    });
    return { income, expense };
  }, [events, cursor]);

  const selectedEvents = eventsByDay.get(format(selected, 'yyyy-MM-dd')) || [];

  return (
    <div className="min-h-screen bg-background pb-28 lg:pb-8 safe-top">
      <header className="px-4 lg:px-8 pt-6 pb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-secondary hover:bg-secondary/70 touch-scale">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <p className="text-muted-foreground text-sm font-medium">Planejamento</p>
          <h1 className="text-2xl lg:text-3xl font-bold">Calendário Financeiro</h1>
        </div>
      </header>

      <main className="px-4 lg:px-8 space-y-5">
        {/* Month header + totals */}
        <div className="card-finance">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setCursor(addMonths(cursor, -1))} className="p-2 rounded-lg bg-secondary hover:bg-secondary/70 touch-scale">
              <ChevronLeft size={16} />
            </button>
            <div className="text-center">
              <h2 className="font-semibold text-lg capitalize">{format(cursor, 'MMMM yyyy', { locale: ptBR })}</h2>
              <button onClick={() => { setCursor(new Date()); setSelected(new Date()); }} className="text-[11px] text-primary font-medium">Hoje</button>
            </div>
            <button onClick={() => setCursor(addMonths(cursor, 1))} className="p-2 rounded-lg bg-secondary hover:bg-secondary/70 touch-scale">
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="p-3 rounded-xl bg-income/10 border border-income/20">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp size={12} className="text-income" />
                <span className="text-[11px] font-medium text-income">Entradas</span>
              </div>
              <p className="font-bold text-sm text-income">{fmt(monthTotals.income)}</p>
            </div>
            <div className="p-3 rounded-xl bg-expense/10 border border-expense/20">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingDown size={12} className="text-expense" />
                <span className="text-[11px] font-medium text-expense">Saídas</span>
              </div>
              <p className="font-bold text-sm text-expense">{fmt(monthTotals.expense)}</p>
            </div>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {['D','S','T','Q','Q','S','S'].map((d, i) => (
              <div key={i} className="text-center text-[10px] font-semibold text-muted-foreground py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, i) => {
              const key = format(day, 'yyyy-MM-dd');
              const dayEvents = eventsByDay.get(key) || [];
              const hasIncome = dayEvents.some(e => e.type === 'income');
              const hasExpense = dayEvents.some(e => e.type === 'expense');
              const hasRecurring = dayEvents.some(e => e.kind === 'recurring');
              const inMonth = isSameMonth(day, cursor);
              const isSelected = isSameDay(day, selected);
              const isNow = isToday(day);
              return (
                <button
                  key={i}
                  onClick={() => setSelected(day)}
                  className={cn(
                    'aspect-square rounded-lg text-xs font-medium flex flex-col items-center justify-center transition relative',
                    !inMonth && 'text-muted-foreground/40',
                    inMonth && !isSelected && 'hover:bg-secondary',
                    isSelected && 'bg-primary text-primary-foreground shadow-md',
                    !isSelected && isNow && 'ring-2 ring-primary/40',
                  )}
                >
                  <span>{format(day, 'd')}</span>
                  {dayEvents.length > 0 && (
                    <div className="flex gap-0.5 mt-0.5 absolute bottom-1">
                      {hasIncome && <span className={cn('w-1 h-1 rounded-full', isSelected ? 'bg-primary-foreground' : 'bg-income')} />}
                      {hasExpense && <span className={cn('w-1 h-1 rounded-full', isSelected ? 'bg-primary-foreground' : 'bg-expense')} />}
                      {hasRecurring && <span className={cn('w-1 h-1 rounded-full', isSelected ? 'bg-primary-foreground' : 'bg-primary')} />}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3 flex-wrap mt-3 pt-3 border-t border-border">
            <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-income" /><span className="text-[10px] text-muted-foreground">Entrada</span></div>
            <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-expense" /><span className="text-[10px] text-muted-foreground">Saída</span></div>
            <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-primary" /><span className="text-[10px] text-muted-foreground">Recorrente</span></div>
          </div>
        </div>

        {/* Selected day events */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="font-semibold">{format(selected, "d 'de' MMMM", { locale: ptBR })}</h3>
            <span className="text-xs text-muted-foreground">{selectedEvents.length} {selectedEvents.length === 1 ? 'evento' : 'eventos'}</span>
          </div>

          {selectedEvents.length === 0 ? (
            <div className="card-finance text-center py-8">
              <CalendarClock size={22} className="text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Sem eventos nesta data</p>
            </div>
          ) : (
            <div className="space-y-2">
              {selectedEvents.sort((a, b) => a.kind === 'recurring' ? -1 : 1).map(e => {
                const days = daysUntil(format(e.date, 'yyyy-MM-dd'));
                return (
                  <div key={e.id} className="card-finance !p-3 flex items-center gap-3">
                    <div className={cn('w-1 self-stretch rounded-full', e.type === 'income' ? 'bg-income' : 'bg-expense')} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{e.name}</p>
                        {e.kind === 'recurring' && (
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/15 text-primary uppercase">Recorrente</span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {e.kind === 'recurring' ? (days < 0 ? `Venceu há ${Math.abs(days)}d` : days === 0 ? 'Vence hoje' : `Em ${days}d`) : 'Lançado'}
                      </p>
                    </div>
                    <p className={cn('font-semibold text-sm whitespace-nowrap', e.type === 'income' ? 'text-income' : 'text-expense')}>
                      {e.type === 'income' ? '+' : '-'}{fmt(e.amount)}
                    </p>
                    {e.kind === 'recurring' && e.recurringId && days >= 0 && (
                      <button
                        onClick={() => {
                          const r = recurring.find(x => x.id === e.recurringId);
                          if (r) payNow(r);
                        }}
                        className="p-2 rounded-lg bg-primary/15 hover:bg-primary/25 text-primary touch-scale"
                        title="Marcar como paga"
                      >
                        <Check size={14} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
