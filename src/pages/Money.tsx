import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutGrid, Receipt, CreditCard, FileText, Repeat, Wallet, TrendingUp, TrendingDown, AlertTriangle, ChevronRight } from 'lucide-react';
import { useEffectiveFinance } from '@/hooks/useEffectiveFinance';
import { useCreditCards } from '@/hooks/useCreditCards';
import { useRecurring, daysUntil } from '@/hooks/useRecurring';
import { TransactionList } from '@/components/TransactionList';
import CreditCardVisual from '@/components/creditcards/CreditCardVisual';
import { QuickActionsFab } from '@/components/QuickActionsFab';
import { cn } from '@/lib/utils';

const tabs = [
  { label: 'Visão geral', icon: LayoutGrid, to: '/money' },
  { label: 'Transações', icon: Receipt, to: '/history' },
  { label: 'Cartões', icon: CreditCard, to: '/cards' },
  { label: 'Faturas', icon: FileText, to: '/cards/reports' },
  { label: 'Recorrências', icon: Repeat, to: '/recurring' },
];

const Label = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <span className={cn('font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground', className)}>{children}</span>
);

export default function Money() {
  const navigate = useNavigate();
  const { totalBalance, currentMonthStats, formatCurrency, isFamily } = useEffectiveFinance();
  const { cards, invoices, getCardMetrics, loading: cardsLoading } = useCreditCards();
  const { items: recurring } = useRecurring();

  const openInvoices = useMemo(
    () => (invoices as any[]).filter(i => i.status !== 'paid').reduce((s, i) => s + Math.max(Number(i.total_amount) - Number(i.paid_amount || 0), 0), 0),
    [invoices]
  );
  const next7 = useMemo(
    () => recurring.filter(r => r.is_active && r.type === 'expense' && daysUntil(r.next_due_date) >= 0 && daysUntil(r.next_due_date) <= 7),
    [recurring]
  );
  const next7Total = next7.reduce((s, r) => s + Number(r.amount), 0);
  const activeRecurring = recurring.filter(r => r.is_active).sort((a, b) => a.next_due_date.localeCompare(b.next_due_date));
  const monthlyRecurring = activeRecurring.filter(r => r.type === 'expense' && r.frequency === 'monthly').reduce((s, r) => s + Number(r.amount), 0);

  const kpis = [
    { label: isFamily ? 'Saldo familiar' : 'Saldo disponível', value: formatCurrency(totalBalance), icon: Wallet, tone: totalBalance < 0 ? 'text-expense' : '' },
    { label: 'Entradas do mês', value: `+${formatCurrency(currentMonthStats.income)}`, icon: TrendingUp, tone: 'text-income' },
    { label: 'Saídas do mês', value: `-${formatCurrency(currentMonthStats.expense)}`, icon: TrendingDown, tone: 'text-expense' },
    ...(!isFamily ? [{ label: 'Faturas em aberto', value: formatCurrency(openInvoices), icon: CreditCard, tone: '' }] : []),
    { label: 'Próximos 7 dias', value: formatCurrency(next7Total), icon: AlertTriangle, tone: next7Total > 0 ? 'text-primary' : '', hint: `${next7.length} conta(s) recorrente(s)` },
  ];

  return (
    <div className="min-h-screen bg-background pb-28 lg:pb-8 safe-top">
      <header className="px-4 lg:px-8 pt-6 pb-4">
        <Label>{isFamily ? 'Contexto familiar' : 'Minha conta'}</Label>
        <h1 className="text-2xl lg:text-4xl font-semibold tracking-tight">Dinheiro</h1>
        <p className="text-sm text-muted-foreground mt-1">Transações, cartões, faturas e recorrências em um só lugar.</p>
      </header>

      <main className="px-4 lg:px-8 space-y-6">
        <nav className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1 scrollbar-hide">
          {tabs.map(t => {
            const active = t.to === '/money';
            return (
              <button key={t.to} onClick={() => navigate(t.to)}
                className={cn('flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  active ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60')}>
                <t.icon size={16} />{t.label}
              </button>
            );
          })}
        </nav>

        <section className={cn('grid grid-cols-2 gap-3', kpis.length === 5 ? 'lg:grid-cols-5' : 'lg:grid-cols-4')}>
          {kpis.map(k => (
            <div key={k.label} className="rounded-xl border border-border bg-card p-4 min-w-0">
              <div className="flex items-center justify-between gap-2"><Label className="truncate">{k.label}</Label><k.icon size={14} className="text-muted-foreground shrink-0" /></div>
              <p className={cn('mt-2 font-mono text-lg lg:text-xl font-medium tabular-nums truncate', k.tone)}>{k.value}</p>
              {'hint' in k && k.hint && <p className="mt-1 text-xs text-muted-foreground truncate">{k.hint}</p>}
            </div>
          ))}
        </section>

        {!isFamily && !cardsLoading && cards.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-medium">Cartões de crédito</h2>
              <button onClick={() => navigate('/cards')} className="text-xs text-primary flex items-center gap-1">Gerenciar cartões <ChevronRight size={12} /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {cards.slice(0, 2).map(card => {
                const m = getCardMetrics(card.id);
                return (
                  <CreditCardVisual key={card.id} card={card} used={m.used} available={m.available} percent={m.percent}
                    invoiceAmount={m.currentInvoice ? Number(m.currentInvoice.total_amount) - Number(m.currentInvoice.paid_amount) : 0}
                    dueDate={m.currentInvoice?.due_date} onClick={() => navigate(`/cards/${card.id}`)} />
                );
              })}
            </div>
          </section>
        )}

        <section className="rounded-2xl border border-border bg-card p-4 lg:p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2"><h2 className="text-base font-medium">Últimas transações</h2><Label className="border border-border rounded px-1.5 py-0.5">7 dias</Label></div>
            <button onClick={() => navigate('/history')} className="text-xs text-primary flex items-center gap-1">Ver histórico <ChevronRight size={12} /></button>
          </div>
          <TransactionList compact />
        </section>

        <section className="rounded-2xl border border-border bg-card p-4 lg:p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-baseline gap-2 min-w-0">
              <h2 className="text-base font-medium">Recorrências e assinaturas</h2>
              {monthlyRecurring > 0 && <span className="font-mono text-[11px] text-primary truncate">{formatCurrency(monthlyRecurring)}/mês</span>}
            </div>
            <button onClick={() => navigate('/recurring')} className="text-xs text-primary flex items-center gap-1 shrink-0">Ver todas <ChevronRight size={12} /></button>
          </div>
          {activeRecurring.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma recorrência ativa.</p>
          ) : (
            <ul className="divide-y divide-border">
              {activeRecurring.slice(0, 5).map(r => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{r.name}</p>
                    <p className="text-xs text-muted-foreground">Próximo: {r.next_due_date.split('-').reverse().join('/')}</p>
                  </div>
                  <span className={cn('font-mono text-sm tabular-nums shrink-0', r.type === 'income' ? 'text-income' : 'text-expense')}>
                    {r.type === 'income' ? '+' : '-'}{formatCurrency(Number(r.amount))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
      <QuickActionsFab />
    </div>
  );
}
