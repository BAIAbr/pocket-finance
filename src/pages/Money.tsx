import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutGrid, Receipt, CreditCard, FileText, Repeat, Wallet, TrendingUp, TrendingDown, AlertTriangle, ChevronRight } from 'lucide-react';
import { useEffectiveFinance } from '@/hooks/useEffectiveFinance';
import { useCreditCards } from '@/hooks/useCreditCards';
import { useRecurring, daysUntil } from '@/hooks/useRecurring';
import { TransactionList } from '@/components/TransactionList';
import CreditCardVisual from '@/components/creditcards/CreditCardVisual';
import { QuickActionsFab } from '@/components/QuickActionsFab';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { isUpcomingMoneyDue, moneyDueState, openMoneyInvoice } from '@/lib/moneyPresentation';

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

function ReadNotice({ loading, error }: { loading: boolean; error: string | null }) {
  return <p role={error ? 'alert' : 'status'} className={cn('py-3 text-sm', error ? 'text-destructive' : 'text-muted-foreground')}>{loading ? 'Carregando…' : error}</p>;
}

export default function Money() {
  const navigate = useNavigate();
  const { totalBalance, currentMonthStats, formatCurrency, isFamily, isLoading: financeLoading, loadError: financeError } = useEffectiveFinance();
  const { cards, invoices, getCardMetrics, loading: cardsLoading, loadError: cardsError } = useCreditCards();
  const { items: recurring, isLoading: recurringLoading, loadError: recurringError } = useRecurring();

  const openInvoices = useMemo(
    () => (invoices as any[]).filter(i => i.status !== 'paid').reduce((s, i) => s + Math.max(Number(i.total_amount) - Number(i.paid_amount || 0), 0), 0),
    [invoices]
  );
  const next7 = useMemo(
    () => recurring.filter(r => r.is_active && r.type === 'expense' && isUpcomingMoneyDue(daysUntil(r.next_due_date))),
    [recurring]
  );
  const next7Total = next7.reduce((s, r) => s + Number(r.amount), 0);
  const activeRecurring = recurring.filter(r => r.is_active).sort((a, b) => a.next_due_date.localeCompare(b.next_due_date));
  const monthlyRecurring = activeRecurring.filter(r => r.type === 'expense' && r.frequency === 'monthly').reduce((s, r) => s + Number(r.amount), 0);

  return (
    <div className="min-h-screen bg-background pb-28 lg:pb-8 safe-top">
      <header className="px-4 lg:px-8 pt-5 lg:pt-6 pb-4">
        <Label>{isFamily ? 'Contexto familiar' : 'Minha conta'}</Label>
        <h1 className="text-2xl lg:text-4xl font-semibold">Dinheiro</h1>
        <p className="text-sm text-muted-foreground mt-1">Sua situação financeira e movimentações em um só lugar.</p>
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

        <section aria-labelledby="monthly-summary" className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-6">
          <div className="min-w-0 rounded-lg border border-primary/30 bg-card p-5 lg:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 id="monthly-summary" className="text-sm font-medium">Resumo do mês</h2>
              <TrendingDown size={18} className="shrink-0 text-primary" />
            </div>
            {financeLoading || financeError ? <ReadNotice loading={financeLoading} error={financeError} /> : <>
            <div className="mt-5">
              <Label>Despesas do mês</Label>
              <p className="mt-1 font-mono text-3xl lg:text-4xl font-semibold tabular-nums text-primary break-words">{formatCurrency(currentMonthStats.expense)}</p>
            </div>
            <dl className="mt-5 grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
              <div className="min-w-0">
                <dt className="flex items-center gap-2 text-xs text-muted-foreground"><TrendingUp size={14} />Entradas do mês</dt>
                <dd className="mt-1.5 font-mono text-lg font-medium tabular-nums text-income break-words">+{formatCurrency(currentMonthStats.income)}</dd>
              </div>
              <div className="min-w-0">
                <dt className="flex items-center gap-2 text-xs text-muted-foreground"><Wallet size={14} />{isFamily ? 'Saldo familiar' : 'Saldo disponível'}</dt>
                <dd className={cn('mt-1.5 font-mono text-lg font-medium tabular-nums break-words', totalBalance < 0 && 'text-expense')}>{formatCurrency(totalBalance)}</dd>
              </div>
            </dl>
            </>}
          </div>

          <div className="min-w-0 space-y-5 py-1 lg:py-2">
            {!isFamily && (
              <div className="border-b border-border pb-4">
                <div className="flex items-center gap-2 text-sm font-medium"><CreditCard size={16} className="text-muted-foreground" /><h2>Faturas em aberto</h2></div>
                {cardsLoading || cardsError ? <ReadNotice loading={cardsLoading} error={cardsError} /> : <p className="mt-2 font-mono text-2xl font-medium tabular-nums break-words">{formatCurrency(openInvoices)}</p>}
                <p className="mt-1 text-xs text-muted-foreground">Valor restante das faturas de cartão.</p>
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 text-sm font-medium"><AlertTriangle size={16} className={next7Total > 0 ? 'text-primary' : 'text-muted-foreground'} /><h2>Próximos 7 dias</h2></div>
              {recurringLoading || recurringError ? <ReadNotice loading={recurringLoading} error={recurringError} /> : <>
              <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <p className={cn('font-mono text-xl font-medium tabular-nums break-words', next7Total > 0 && 'text-primary')}>{formatCurrency(next7Total)}</p>
                <span className="text-xs text-muted-foreground">{next7.length} conta(s) recorrente(s)</span>
              </div>
              {next7.length === 0 && <p className="mt-1 text-xs text-muted-foreground">Nenhuma despesa recorrente prevista nos próximos 7 dias.</p>}
              </>}
            </div>
          </div>
        </section>

        <section className="min-w-0 border-t border-border pt-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex flex-wrap items-center gap-2"><h2 className="text-base font-medium">Últimas transações</h2><Label className="border border-border rounded px-1.5 py-0.5">7 dias</Label></div>
            <Button variant="link" size="sm" onClick={() => navigate('/history')} className="px-0 text-xs">Ver histórico <ChevronRight size={12} /></Button>
          </div>
          <div className="[&_.transaction-item]:rounded-lg [&_.transaction-item]:min-h-20 [&_.transaction-item]:gap-2 sm:[&_.transaction-item]:gap-3 [&_.transaction-item>div:first-child]:shrink-0 [&_.transaction-item>div:last-child]:shrink-0 [&_.transaction-item>div:last-child_span]:whitespace-nowrap [&_.transaction-item>div:nth-child(2)>p:first-child]:whitespace-normal [&_.transaction-item>div:nth-child(2)>p:first-child]:break-words [&_.card-finance]:border-0 [&_.card-finance]:bg-transparent [&_.card-finance]:shadow-none">
            <TransactionList compact moneyOverview />
          </div>
        </section>

        {!isFamily && (cardsLoading || cardsError || cards.length > 0) && (
          <section className="space-y-3 border-t border-border pt-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-medium">Cartões de crédito</h2>
              <Button variant="link" size="sm" onClick={() => navigate('/cards')} className="px-0 text-xs">Gerenciar cartões <ChevronRight size={12} /></Button>
            </div>
            {cardsLoading || cardsError ? <ReadNotice loading={cardsLoading} error={cardsError} /> : <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {cards.slice(0, 2).map(card => {
                const m = getCardMetrics(card.id);
                const invoice = openMoneyInvoice(m.cardInvoices);
                return (
                  <CreditCardVisual key={card.id} card={card} used={m.used} available={m.available} percent={m.percent}
                    invoiceAmount={invoice ? Number(invoice.total_amount) - Number(invoice.paid_amount) : 0}
                    hasOpenInvoice={Boolean(invoice)}
                    dueDate={invoice?.due_date} onClick={() => navigate(`/cards/${card.id}`)} />
                );
              })}
            </div>}
          </section>
        )}

        <section className="border-t border-border pt-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex flex-wrap items-baseline gap-2 min-w-0">
              <h2 className="text-base font-medium">Recorrências e assinaturas</h2>
              {!recurringLoading && !recurringError && monthlyRecurring > 0 && <span className="font-mono text-[11px] text-primary break-words">{formatCurrency(monthlyRecurring)}/mês</span>}
            </div>
            <Button variant="link" size="sm" onClick={() => navigate('/recurring')} className="px-0 text-xs">Ver todas <ChevronRight size={12} /></Button>
          </div>
          {recurringLoading || recurringError ? <ReadNotice loading={recurringLoading} error={recurringError} /> : activeRecurring.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma recorrência ativa.</p>
          ) : (
            <ul className="divide-y divide-border">
              {activeRecurring.slice(0, 5).map(r => {
                const days = daysUntil(r.next_due_date);
                const state = moneyDueState(days);
                const dueLabel = state === 'overdue' ? 'Vencida' : days === 0 ? 'Vence hoje' : state === 'soon' ? 'Vence em breve' : 'Próximo';
                return (
                <li key={r.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium break-words">{r.name}</p>
                    <p className={cn('text-xs', state === 'overdue' ? 'text-expense' : state === 'soon' ? 'text-primary' : 'text-muted-foreground')}>{dueLabel}: {r.next_due_date.split('-').reverse().join('/')}</p>
                  </div>
                  <span className={cn('font-mono text-sm tabular-nums shrink-0', r.type === 'income' ? 'text-income' : 'text-expense')}>
                    {r.type === 'income' ? '+' : '-'}{formatCurrency(Number(r.amount))}
                  </span>
                </li>
              ); })}
            </ul>
          )}
        </section>
      </main>
      <QuickActionsFab />
    </div>
  );
}
