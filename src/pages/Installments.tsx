import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, CreditCard, Check, Trash2, ChevronDown, ChevronUp, Calendar, RotateCcw } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useInstallments, InstallmentPurchaseWithItems } from '@/hooks/useInstallments';
import { useFinanceContext } from '@/contexts/FinanceContext';
import { InstallmentFormModal } from '@/components/InstallmentFormModal';
import { daysUntil } from '@/hooks/useRecurring';
import { cn } from '@/lib/utils';

export default function InstallmentsPage() {
  const navigate = useNavigate();
  const { purchases, isLoading, create, remove, markPaid, markUnpaid } = useInstallments();
  const { settings, getCategoryById } = useFinanceContext();
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const fmt = (v: number) =>
    `${settings.currencySymbol} ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const summary = useMemo(() => {
    let openTotal = 0, paidTotal = 0, nextDue: string | null = null;
    purchases.forEach(p => {
      p.items.forEach(i => {
        if (i.is_paid) paidTotal += Number(i.amount);
        else {
          openTotal += Number(i.amount);
          if (!nextDue || i.due_date < nextDue) nextDue = i.due_date;
        }
      });
    });
    return { openTotal, paidTotal, nextDue };
  }, [purchases]);

  const progressOf = (p: InstallmentPurchaseWithItems) => {
    const paid = p.items.filter(i => i.is_paid).length;
    return { paid, total: p.installments_count, pct: p.installments_count ? (paid / p.installments_count) * 100 : 0 };
  };

  return (
    <div className="min-h-screen bg-background pb-28 lg:pb-8 safe-top">
      <header className="px-4 lg:px-8 pt-6 pb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-secondary hover:bg-secondary/70 touch-scale">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <p className="text-muted-foreground text-sm font-medium">Cartões</p>
          <h1 className="text-2xl lg:text-3xl font-bold">Compras parceladas</h1>
        </div>
        <button onClick={() => setShowForm(true)}
          className="p-2.5 rounded-xl bg-primary text-primary-foreground touch-scale shadow-sm">
          <Plus size={18} />
        </button>
      </header>

      <main className="px-4 lg:px-8 space-y-5">
        {/* Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="card-finance !p-4">
            <p className="text-[11px] text-muted-foreground font-medium mb-1">Em aberto</p>
            <p className="font-bold text-lg text-expense">{fmt(summary.openTotal)}</p>
            {summary.nextDue && (
              <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                <Calendar size={10} /> Próx: {format(parseISO(summary.nextDue), "d 'de' MMM", { locale: ptBR })}
              </p>
            )}
          </div>
          <div className="card-finance !p-4">
            <p className="text-[11px] text-muted-foreground font-medium mb-1">Já pago</p>
            <p className="font-bold text-lg text-income">{fmt(summary.paidTotal)}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{purchases.length} {purchases.length === 1 ? 'compra' : 'compras'}</p>
          </div>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="card-finance text-center py-8 text-sm text-muted-foreground">Carregando...</div>
        ) : purchases.length === 0 ? (
          <div className="card-finance text-center py-10">
            <CreditCard size={28} className="text-muted-foreground mx-auto mb-2" />
            <p className="font-medium">Nenhuma compra parcelada</p>
            <p className="text-xs text-muted-foreground mb-4">Registre compras no cartão para acompanhar cada parcela e o vencimento.</p>
            <button onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">
              <Plus size={14} /> Adicionar compra
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {purchases.map(p => {
              const { paid, total, pct } = progressOf(p);
              const isOpen = !!expanded[p.id];
              const cat = p.category_id ? getCategoryById(p.category_id) : null;
              const nextItem = p.items.find(i => !i.is_paid);
              const nextDays = nextItem ? daysUntil(nextItem.due_date) : null;
              return (
                <div key={p.id} className="card-finance !p-4">
                  <div className="flex items-start justify-between gap-3">
                    <button onClick={() => setExpanded(s => ({ ...s, [p.id]: !s[p.id] }))} className="flex-1 text-left min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold truncate">{p.name}</p>
                        {p.card_name && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground truncate max-w-[100px]">
                            {p.card_name}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {p.installments_count}x de {fmt(Number(p.total_amount) / p.installments_count)}
                        {cat ? ` · ${(cat as any).name}` : ''}
                      </p>
                    </button>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setExpanded(s => ({ ...s, [p.id]: !s[p.id] }))}
                        className="p-2 rounded-lg hover:bg-secondary touch-scale">
                        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                      <button onClick={() => setConfirmDelete(p.id)}
                        className="p-2 rounded-lg hover:bg-destructive/10 text-destructive touch-scale">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="text-muted-foreground">{paid}/{total} pagas</span>
                      {nextItem && (
                        <span className={cn('font-medium', nextDays! < 0 ? 'text-expense' : nextDays! <= 3 ? 'text-amber-500' : 'text-muted-foreground')}>
                          {nextDays! < 0 ? `Venceu há ${Math.abs(nextDays!)}d` : nextDays === 0 ? 'Vence hoje' : `Próx em ${nextDays}d`}
                        </span>
                      )}
                    </div>
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>

                  {isOpen && (
                    <div className="mt-4 space-y-2">
                      {p.items.map(i => {
                        const d = daysUntil(i.due_date);
                        return (
                          <div key={i.id} className={cn(
                            'flex items-center gap-3 p-3 rounded-xl border transition',
                            i.is_paid ? 'bg-income/5 border-income/20' : 'bg-secondary/50 border-transparent'
                          )}>
                            <div className={cn(
                              'w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0',
                              i.is_paid ? 'bg-income/20 text-income' : 'bg-primary/15 text-primary'
                            )}>
                              {i.installment_number}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">{fmt(Number(i.amount))}</p>
                              <p className="text-[11px] text-muted-foreground">
                                {format(parseISO(i.due_date), "d 'de' MMM 'de' yyyy", { locale: ptBR })}
                                {!i.is_paid && (
                                  <span className={cn('ml-2', d < 0 ? 'text-expense' : d <= 3 ? 'text-amber-500' : '')}>
                                    · {d < 0 ? `${Math.abs(d)}d atrasado` : d === 0 ? 'hoje' : `em ${d}d`}
                                  </span>
                                )}
                                {i.is_paid && i.paid_at && (
                                  <span className="ml-2 text-income">· Pago em {format(parseISO(i.paid_at), 'dd/MM', { locale: ptBR })}</span>
                                )}
                              </p>
                            </div>
                            {i.is_paid ? (
                              <button onClick={() => markUnpaid(i)} title="Reverter"
                                className="p-2 rounded-lg hover:bg-secondary text-muted-foreground touch-scale">
                                <RotateCcw size={14} />
                              </button>
                            ) : (
                              <button onClick={() => markPaid(p, i)}
                                className="flex items-center gap-1 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold touch-scale">
                                <Check size={12} /> Pagar
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <p className="text-[11px] text-muted-foreground text-center pt-2">
          Ao marcar como paga, uma transação de despesa é criada automaticamente com o valor da parcela.
        </p>
      </main>

      <InstallmentFormModal isOpen={showForm} onClose={() => setShowForm(false)} onSubmit={create} />

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card rounded-2xl p-5 max-w-sm w-full">
            <h3 className="font-semibold mb-1">Excluir compra parcelada?</h3>
            <p className="text-sm text-muted-foreground mb-4">Todas as parcelas serão removidas. As transações já lançadas permanecem no histórico.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 rounded-xl bg-secondary font-medium">Cancelar</button>
              <button onClick={async () => { await remove(confirmDelete); setConfirmDelete(null); }}
                className="flex-1 py-2.5 rounded-xl bg-destructive text-destructive-foreground font-medium">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
