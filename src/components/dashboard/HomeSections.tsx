import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles, CreditCard, CalendarClock, Flag, Target, CheckCircle2, AlertTriangle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';
import { parseISO, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useEffectiveFinance } from '@/hooks/useEffectiveFinance';
import { useAuth } from '@/contexts/AuthContext';
import { useSmartInsights } from '@/hooks/useSmartInsights';
import { useRecurring, daysUntil } from '@/hooks/useRecurring';
import { useFinancialGoals } from '@/hooks/useFinancialGoals';
import { useCreditCards } from '@/hooks/useCreditCards';
import { cn } from '@/lib/utils';

const label = 'font-mono text-[10px] uppercase tracking-[0.08em]';

function SectionTitle({ children, action, onAction }: { children: string; action?: string; onAction?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2 mb-4">
      <h3 className={cn(label, 'text-muted-foreground')}>{children}</h3>
      {action && (
        <button onClick={onAction} className="text-xs text-primary font-medium inline-flex items-center gap-1 hover:gap-1.5 transition-all shrink-0">
          {action} <ArrowRight size={12} />
        </button>
      )}
    </div>
  );
}

/* ---------- FOX ---------- */
export function FoxHighlightCard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { greeting, insights } = useSmartInsights(profile?.name);
  const main = insights.find(i => i.tone === 'negative' || i.tone === 'warning') ?? insights[0];

  return (
    <section className="relative overflow-hidden rounded-2xl border border-primary/25 bg-card p-5 lg:p-6 h-full flex flex-col">
      <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div className="relative flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
          <Sparkles size={14} className="text-primary" />
        </div>
        <span className={cn(label, 'text-primary')}>Copiloto Fox</span>
      </div>
      <div className="relative mt-4 flex-1">
        <p className="text-xs text-muted-foreground">Seu panorama financeiro</p>
        <h2 className="mt-1 text-lg lg:text-xl font-semibold leading-snug">{main ? main.title : greeting.headline}</h2>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{main ? main.description : greeting.subline}</p>
      </div>
      <button
        onClick={() => navigate('/ai-insights')}
        className="relative mt-5 self-start text-sm text-primary font-medium inline-flex items-center gap-1.5 hover:gap-2 transition-all"
      >
        Ver análise <ArrowRight size={14} />
      </button>
    </section>
  );
}

/* ---------- Evolução ---------- */
const compactBRL = (v: number) => {
  const a = Math.abs(v);
  if (a >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace('.', ',')}M`;
  if (a >= 1000) return `${(v / 1000).toFixed(a >= 10000 ? 0 : 1).replace('.', ',')}k`;
  return `${Math.round(v)}`;
};

function FoxTooltip({ active, payload, label, fmt }: any) {
  if (!active || !payload?.length) return null;
  const get = (k: string) => Number(payload.find((p: any) => p.dataKey === k)?.value ?? 0);
  return (
    <div className="rounded-xl border border-border bg-popover/95 backdrop-blur px-3 py-2.5 shadow-lg min-w-[150px]">
      <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground mb-1.5 capitalize">{label}</p>
      <div className="flex items-center justify-between gap-4 text-xs"><span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-primary" />Entradas</span><span className="font-mono tabular-nums">{fmt(get('income'))}</span></div>
      <div className="flex items-center justify-between gap-4 text-xs mt-1"><span className="flex items-center gap-1.5 text-muted-foreground"><span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />Saídas</span><span className="font-mono tabular-nums">{fmt(get('expense'))}</span></div>
    </div>
  );
}
function Delta({ name, cur, prev, invert }: { name: string; cur: number; prev: number; invert?: boolean }) {
  const has = prev !== 0;
  const pct = has ? ((cur - prev) / Math.abs(prev)) * 100 : 0;
  const good = invert ? pct <= 0 : pct >= 0;
  return (
    <div className="min-w-0">
      <p className="text-[11px] text-muted-foreground truncate">{name}</p>
      <p className={cn('font-mono text-sm font-medium tabular-nums', !has || pct === 0 ? 'text-muted-foreground' : good ? 'text-income' : 'text-expense')}>
        {has ? `${pct > 0 ? '+' : ''}${pct.toFixed(0)}%` : '—'}
      </p>
    </div>
  );
}

export function FinancialEvolutionCard() {
  const { getMonthlyStats, formatCurrency } = useEffectiveFinance();
  const all = getMonthlyStats(6);
  const stats = all.filter(s => s.income > 0 || s.expense > 0);
  const cur = all[all.length - 1];
  const prev = all[all.length - 2];

  return (
    <section className="rounded-2xl border border-border/60 bg-card p-5 lg:p-6 h-full">
      <SectionTitle>Evolução financeira</SectionTitle>
      {stats.length === 0 ? (
        <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">
          Adicione transações para ver sua evolução
        </div>
      ) : (
        <>
          <div className="flex items-center gap-4 mb-3 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><span className="w-3 h-0.5 rounded-full bg-primary" />Entradas</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-3 h-0.5 rounded-full bg-muted-foreground/60" />Saídas</span>
            <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.08em]">6 meses</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={all} margin={{ left: 0, right: 4, top: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="foxIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.35} strokeDasharray="2 6" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tickMargin={8}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
                tickFormatter={(v: string) => v ? v.charAt(0).toUpperCase() + v.slice(1, 3) : v} />
              <YAxis width={44} axisLine={false} tickLine={false} tickCount={4}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10, fontFamily: 'JetBrains Mono, monospace', opacity: 0.7 }}
                tickFormatter={compactBRL} />
              <Tooltip cursor={{ stroke: 'hsl(var(--primary))', strokeOpacity: 0.3, strokeWidth: 1 }} content={<FoxTooltip fmt={formatCurrency} />} />
              <Area type="monotone" dataKey="expense" stroke="hsl(var(--muted-foreground))" strokeOpacity={0.6} strokeWidth={1.5} strokeDasharray="4 4" fill="transparent" dot={false} activeDot={{ r: 3 }} animationDuration={600} />
              <Area type="monotone" dataKey="income" stroke="hsl(var(--primary))" strokeWidth={2.25} fill="url(#foxIncome)" dot={false} activeDot={{ r: 4, stroke: 'hsl(var(--background))', strokeWidth: 2 }} animationDuration={600} />
            </AreaChart>
          </ResponsiveContainer>
          {cur && prev && (
            <div className="mt-4 pt-4 border-t border-border/50">
              <p className="text-[11px] text-muted-foreground mb-2">Este mês vs. mês anterior</p>
              <div className="grid grid-cols-3 gap-3">
                <Delta name="Entradas" cur={cur.income} prev={prev.income} />
                <Delta name="Saídas" cur={cur.expense} prev={prev.expense} invert />
                <Delta name="Economia" cur={cur.balance} prev={prev.balance} />
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

/* ---------- Dados compartilhados de eventos ---------- */
type Ev = { id: string; kind: 'invoice' | 'bill' | 'goal' | 'piggy'; title: string; amount?: number; date: string; days: number; route: string };

function useHomeEvents() {
  const { items: recurring } = useRecurring();
  const { goals } = useFinancialGoals();
  const { piggyBanks } = useEffectiveFinance() as any;
  const { cards, invoices } = useCreditCards();

  return useMemo<Ev[]>(() => {
    const out: Ev[] = [];
    (invoices as any[]).forEach(i => {
      if (i.status === 'paid') return;
      const remaining = Number(i.total_amount) - Number(i.paid_amount);
      if (remaining <= 0 || !i.due_date) return;
      const d = daysUntil(i.due_date);
      if (d > 45 || d < -30) return;
      const card = (cards as any[]).find(c => c.id === i.card_id);
      out.push({ id: `inv-${i.id}`, kind: 'invoice', title: `Fatura ${card?.name ?? 'cartão'}`, amount: remaining, date: i.due_date, days: d, route: `/cards/${i.card_id}` });
    });
    recurring.filter(r => r.is_active).forEach(r => {
      const d = daysUntil(r.next_due_date);
      if (d > 45) return;
      out.push({ id: `rec-${r.id}`, kind: 'bill', title: r.name, amount: Number(r.amount), date: r.next_due_date, days: d, route: '/recurring' });
    });
    (goals as any[]).filter(g => !g.is_completed && g.target_date).forEach(g => {
      const d = daysUntil(g.target_date);
      if (d > 90 || d < -30) return;
      out.push({ id: `goal-${g.id}`, kind: 'goal', title: g.title, amount: Number(g.target_amount), date: g.target_date, days: d, route: '/planning' });
    });
    (piggyBanks as any[]).filter(p => !p.is_completed && p.target_date).forEach(p => {
      const d = daysUntil(p.target_date);
      if (d > 90 || d < -30) return;
      out.push({ id: `pig-${p.id}`, kind: 'piggy', title: p.name, amount: Number(p.target_amount ?? 0), date: p.target_date, days: d, route: '/savings' });
    });
    return out.sort((a, b) => a.date.localeCompare(b.date));
  }, [recurring, goals, piggyBanks, cards, invoices]);
}

const kindIcon = { invoice: CreditCard, bill: CalendarClock, goal: Flag, piggy: Target };
const kindName = { invoice: 'Fatura', bill: 'Recorrência', goal: 'Meta', piggy: 'Cofrinho' };
const whenLabel = (d: number) => (d < 0 ? `Atrasado ${Math.abs(d)}d` : d === 0 ? 'Vence hoje' : d === 1 ? 'Vence amanhã' : `Vence em ${d} dias`);

/* ---------- Atenção ---------- */
export function AttentionCard() {
  const navigate = useNavigate();
  const { formatCurrency } = useEffectiveFinance();
  const events = useHomeEvents();
  const items = events.filter(e => (e.kind === 'invoice' || e.kind === 'bill' ? e.days <= 7 : e.days <= 15)).slice(0, 3);

  return (
    <section className="rounded-2xl border border-border/60 bg-card p-5 lg:p-6 h-full">
      <SectionTitle>Atenção</SectionTitle>
      {items.length === 0 ? (
        <div className="flex items-start gap-3 py-2">
          <CheckCircle2 size={18} className="text-income shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium">Tudo em ordem</p>
            <p className="text-xs text-muted-foreground mt-0.5">Nenhuma ação financeira requer sua atenção.</p>
          </div>
        </div>
      ) : (
        <ul className="divide-y divide-border/50">
          {items.map(e => {
            const Icon = kindIcon[e.kind];
            const urgent = e.days <= 3;
            return (
              <li key={e.id}>
                <button onClick={() => navigate(e.route)} className="w-full flex items-center gap-3 py-3 first:pt-0 last:pb-0 text-left group">
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', urgent ? 'bg-expense/10 text-expense' : 'bg-primary/10 text-primary')}>
                    {urgent ? <AlertTriangle size={15} /> : <Icon size={15} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{e.title}</p>
                    <p className={cn('text-[11px]', urgent ? 'text-expense' : 'text-muted-foreground')}>{whenLabel(e.days)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    {typeof e.amount === 'number' && <p className="font-mono text-sm tabular-nums">{formatCurrency(e.amount)}</p>}
                    <span className="text-[11px] text-primary inline-flex items-center gap-0.5">Ver <ArrowRight size={10} /></span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/* ---------- Próximos eventos ---------- */
export function NextEventsCard() {
  const navigate = useNavigate();
  const events = useHomeEvents().filter(e => e.days >= 0).slice(0, 4);

  return (
    <section className="rounded-2xl border border-border/60 bg-card p-5 lg:p-6 h-full">
      <SectionTitle action="Ver calendário" onAction={() => navigate('/calendar')}>Próximos eventos</SectionTitle>
      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">Nenhum evento agendado para os próximos dias.</p>
      ) : (
        <ul className="space-y-3">
          {events.map(e => {
            let dl = e.date;
            try { dl = format(parseISO(e.date), 'dd/MM', { locale: ptBR }); } catch { /* keep */ }
            return (
              <li key={e.id}>
                <button onClick={() => navigate(e.route)} className="w-full flex items-center gap-3 text-left">
                  <span className="font-mono text-xs tabular-nums text-muted-foreground w-11 shrink-0">{dl}</span>
                  <span className="w-1 h-1 rounded-full bg-primary shrink-0" />
                  <span className="text-sm truncate flex-1 min-w-0">{e.title}</span>
                  <span className={cn(label, 'text-muted-foreground shrink-0')}>{kindName[e.kind]}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
