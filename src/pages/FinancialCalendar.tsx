import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isSameMonth, isSameDay, isToday,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ChevronLeft, ChevronRight, Calendar as CalendarIcon,
  ArrowUpRight, ArrowDownRight, CalendarClock, Flag, Target, CreditCard as CreditCardIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffectiveFinance } from '@/hooks/useEffectiveFinance';
import { useRecurring } from '@/hooks/useRecurring';
import { useFinancialGoals } from '@/hooks/useFinancialGoals';
import { useCreditCards } from '@/hooks/useCreditCards';

type EventKind = 'income' | 'expense' | 'bill' | 'goal' | 'piggy' | 'card';
interface DayEvent {
  id: string;
  kind: EventKind;
  title: string;
  amount?: number;
  route: string;
}

const KIND_META: Record<EventKind, { label: string; dot: string; text: string; bg: string; Icon: any }> = {
  income:  { label: 'Entrada',        dot: 'bg-income',      text: 'text-income',       bg: 'bg-income/10',      Icon: ArrowUpRight },
  expense: { label: 'Gasto',          dot: 'bg-expense',     text: 'text-expense',      bg: 'bg-expense/10',     Icon: ArrowDownRight },
  bill:    { label: 'Conta prevista', dot: 'bg-orange-500',  text: 'text-orange-500',   bg: 'bg-orange-500/10',  Icon: CalendarClock },
  goal:    { label: 'Prazo de meta',  dot: 'bg-primary',     text: 'text-primary',      bg: 'bg-primary/10',     Icon: Flag },
  piggy:   { label: 'Cofrinho',       dot: 'bg-accent',      text: 'text-accent',       bg: 'bg-accent/10',      Icon: Target },
  card:    { label: 'Fatura cartão',  dot: 'bg-violet-500',  text: 'text-violet-500',   bg: 'bg-violet-500/10',  Icon: CreditCardIcon },
};

export default function FinancialCalendar() {
  const navigate = useNavigate();
  const [cursor, setCursor] = useState(new Date());
  const [selected, setSelected] = useState<Date>(new Date());

  const { transactions, categories, formatCurrency } = useEffectiveFinance() as any;
  const { items: recurring } = useRecurring();
  const { goals } = useFinancialGoals();
  const { piggyBanks } = useEffectiveFinance() as any;
  const { cards, invoices } = useCreditCards();

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  // Build event map keyed by yyyy-MM-dd
  const eventsByDay = useMemo(() => {
    const map = new Map<string, DayEvent[]>();
    const push = (key: string, ev: DayEvent) => {
      const arr = map.get(key) ?? [];
      arr.push(ev);
      map.set(key, arr);
    };

    (transactions as any[]).forEach((t) => {
      const cat = (categories as any[]).find(c => c.id === t.category_id);
      push(t.date, {
        id: `tx-${t.id}`,
        kind: t.type,
        title: t.description || cat?.name || (t.type === 'income' ? 'Entrada' : 'Gasto'),
        amount: Number(t.amount),
        route: '/history',
      });
    });

    (recurring as any[]).filter(r => r.is_active).forEach((r) => {
      push(r.next_due_date, {
        id: `rec-${r.id}`,
        kind: 'bill',
        title: r.name,
        amount: Number(r.amount),
        route: '/recurring',
      });
    });

    (goals as any[]).filter(g => !g.is_completed && g.target_date).forEach((g) => {
      push(g.target_date, {
        id: `goal-${g.id}`,
        kind: 'goal',
        title: g.title,
        amount: Number(g.target_amount),
        route: '/planning',
      });
    });

    (piggyBanks as any[]).filter(p => !p.is_completed && p.target_date).forEach((p) => {
      push(p.target_date, {
        id: `piggy-${p.id}`,
        kind: 'piggy',
        title: p.name,
        amount: Number(p.target_amount ?? 0),
        route: '/savings',
      });
    });

    (invoices as any[]).filter(i => i.status !== 'paid').forEach((inv) => {
      const card = (cards as any[]).find(c => c.id === inv.card_id);
      const remaining = Number(inv.total_amount) - Number(inv.paid_amount);
      if (remaining <= 0) return;
      push(inv.due_date, {
        id: `card-inv-${inv.id}`,
        kind: 'card',
        title: `Fatura ${card?.name ?? 'Cartão'}`,
        amount: remaining,
        route: `/cards/${inv.card_id}`,
      });
    });

    return map;
  }, [transactions, categories, recurring, goals, piggyBanks, invoices, cards]);

  const selectedKey = format(selected, 'yyyy-MM-dd');
  const selectedEvents = eventsByDay.get(selectedKey) ?? [];

  // Monthly totals
  const monthTotals = useMemo(() => {
    let income = 0, expense = 0, upcoming = 0;
    const first = format(startOfMonth(cursor), 'yyyy-MM-dd');
    const last = format(endOfMonth(cursor), 'yyyy-MM-dd');
    eventsByDay.forEach((evs, key) => {
      if (key < first || key > last) return;
      evs.forEach(e => {
        if (e.kind === 'income' && e.amount) income += e.amount;
        if (e.kind === 'expense' && e.amount) expense += e.amount;
        if (e.kind === 'bill' && e.amount) upcoming += e.amount;
      });
    });
    return { income, expense, upcoming, balance: income - expense };
  }, [eventsByDay, cursor]);

  const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  return (
    <div className="min-h-screen bg-background pb-28 safe-top">
      <header className="px-4 pt-6 pb-4 max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
            <CalendarIcon size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Calendário Financeiro</h1>
            <p className="text-sm text-muted-foreground">Visualize entradas, gastos, contas e prazos em um só lugar.</p>
          </div>
        </div>
      </header>

      <main className="px-4 space-y-4 max-w-4xl mx-auto">
        {/* Month header */}
        <div className="card-finance">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setCursor(subMonths(cursor, 1))}
              className="w-9 h-9 rounded-lg hover:bg-secondary flex items-center justify-center touch-scale"
              aria-label="Mês anterior"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                {format(cursor, 'yyyy')}
              </p>
              <h2 className="text-lg font-semibold capitalize">
                {format(cursor, 'MMMM', { locale: ptBR })}
              </h2>
            </div>
            <button
              onClick={() => setCursor(addMonths(cursor, 1))}
              className="w-9 h-9 rounded-lg hover:bg-secondary flex items-center justify-center touch-scale"
              aria-label="Próximo mês"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Weekday header */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {weekDays.map((d, i) => (
              <div key={i} className="text-center text-[11px] font-semibold text-muted-foreground py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((d) => {
              const key = format(d, 'yyyy-MM-dd');
              const evs = eventsByDay.get(key) ?? [];
              const inMonth = isSameMonth(d, cursor);
              const isSel = isSameDay(d, selected);
              const today = isToday(d);
              const kinds = Array.from(new Set(evs.map(e => e.kind))).slice(0, 4);
              return (
                <button
                  key={key}
                  onClick={() => setSelected(d)}
                  className={cn(
                    'aspect-square rounded-lg flex flex-col items-center justify-start pt-1.5 gap-0.5 transition-all',
                    inMonth ? 'text-foreground' : 'text-muted-foreground/40',
                    isSel && 'bg-primary text-primary-foreground shadow-sm',
                    !isSel && today && 'bg-primary/15 text-primary font-semibold',
                    !isSel && !today && 'hover:bg-secondary',
                  )}
                >
                  <span className="text-xs font-medium">{format(d, 'd')}</span>
                  {kinds.length > 0 && (
                    <div className="flex items-center gap-0.5">
                      {kinds.map(k => (
                        <span
                          key={k}
                          className={cn(
                            'w-1 h-1 rounded-full',
                            isSel ? 'bg-primary-foreground/80' : KIND_META[k].dot,
                          )}
                        />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Monthly summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <SummaryTile label="Entradas" value={formatCurrency(monthTotals.income)} cls="text-income" />
          <SummaryTile label="Gastos" value={formatCurrency(monthTotals.expense)} cls="text-expense" />
          <SummaryTile label="Contas previstas" value={formatCurrency(monthTotals.upcoming)} cls="text-orange-500" />
          <SummaryTile label="Saldo do mês" value={formatCurrency(monthTotals.balance)} cls={monthTotals.balance >= 0 ? 'text-income' : 'text-expense'} />
        </div>

        {/* Selected day events */}
        <div className="card-finance">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-muted-foreground">Dia selecionado</p>
              <h3 className="font-semibold text-base capitalize">
                {format(selected, "EEEE, dd 'de' MMMM", { locale: ptBR })}
              </h3>
            </div>
            <span className="text-xs px-2 py-1 rounded-full bg-secondary text-muted-foreground">
              {selectedEvents.length} evento{selectedEvents.length === 1 ? '' : 's'}
            </span>
          </div>

          {selectedEvents.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Nenhum evento neste dia.
            </div>
          ) : (
            <ul className="space-y-2">
              {selectedEvents.map(ev => {
                const meta = KIND_META[ev.kind];
                const Icon = meta.Icon;
                return (
                  <li key={ev.id}>
                    <button
                      onClick={() => navigate(ev.route)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl bg-secondary/40 hover:bg-secondary transition text-left touch-scale"
                    >
                      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', meta.bg, meta.text)}>
                        <Icon size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{ev.title}</p>
                        <p className="text-[11px] text-muted-foreground">{meta.label}</p>
                      </div>
                      {typeof ev.amount === 'number' && (
                        <p className={cn('font-semibold text-sm shrink-0', meta.text)}>
                          {formatCurrency(ev.amount)}
                        </p>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Legend */}
        <div className="card-finance">
          <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Legenda</p>
          <div className="flex flex-wrap gap-3">
            {(Object.keys(KIND_META) as EventKind[]).map(k => (
              <div key={k} className="flex items-center gap-1.5 text-xs">
                <span className={cn('w-2 h-2 rounded-full', KIND_META[k].dot)} />
                <span className="text-muted-foreground">{KIND_META[k].label}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

function SummaryTile({ label, value, cls }: { label: string; value: string; cls: string }) {
  return (
    <div className="card-finance !p-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={cn('text-base font-bold mt-0.5', cls)}>{value}</p>
    </div>
  );
}
