import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useCreditCards, CreditCardInvoice } from '@/hooks/useCreditCards';
import CreditCardVisual from '@/components/creditcards/CreditCardVisual';
import CardFormModal from '@/components/creditcards/CardFormModal';
import PurchaseFormModal from '@/components/creditcards/PurchaseFormModal';
import PayInvoiceModal from '@/components/creditcards/PayInvoiceModal';
import { useFinanceContext } from '@/contexts/FinanceContext';

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('pt-BR');

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  open: { label: 'Aberta', color: 'bg-blue-500/10 text-blue-600' },
  closed: { label: 'Fechada', color: 'bg-orange-500/10 text-orange-600' },
  paid: { label: 'Paga', color: 'bg-emerald-500/10 text-emerald-600' },
  partial: { label: 'Parcial', color: 'bg-yellow-500/10 text-yellow-600' },
  overdue: { label: 'Atrasada', color: 'bg-red-500/10 text-red-600' },
};

export default function CreditCardDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { categories } = useFinanceContext();
  const cats = categories as any[];
  const {
    cards, installments, purchases, invoices, getCardMetrics,
    updateCard, deleteCard, createPurchase, payInvoice, deletePurchase,
  } = useCreditCards();

  const [openEdit, setOpenEdit] = useState(false);
  const [openPurchase, setOpenPurchase] = useState(false);
  const [payTarget, setPayTarget] = useState<CreditCardInvoice | null>(null);

  const card = cards.find(c => c.id === id);
  const metrics = useMemo(() => id ? getCardMetrics(id) : null, [id, getCardMetrics]);

  if (!card || !metrics) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <Button variant="ghost" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4 mr-1" />Voltar</Button>
        <div className="text-center py-16 text-muted-foreground">Cartão não encontrado</div>
      </div>
    );
  }

  const currentInvoice = metrics.currentInvoice;
  const cardPurchases = purchases.filter(p => p.card_id === card.id);
  const cardInstallments = installments.filter(i => i.card_id === card.id);
  const currentInstallments = currentInvoice ? cardInstallments.filter(i => i.invoice_id === currentInvoice.id) : [];

  const catName = (cid: string | null) => cid ? (cats.find(c => c.id === cid)?.name ?? '—') : '—';
  const purchaseOf = (pid: string) => cardPurchases.find(p => p.id === pid);

  const invSorted = metrics.cardInvoices.slice().sort((a, b) => b.reference_month.localeCompare(a.reference_month));

  return (
    <div className="max-w-3xl mx-auto p-4 pb-24 space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate('/cards')}><ArrowLeft className="w-4 h-4 mr-1" />Voltar</Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setOpenEdit(true)}><Edit2 className="w-4 h-4 mr-1" />Editar</Button>
          <Button variant="outline" size="sm" onClick={async () => {
            if (confirm('Remover este cartão? Todas as compras e faturas serão apagadas.')) {
              await deleteCard(card.id); navigate('/cards');
            }
          }}><Trash2 className="w-4 h-4" /></Button>
        </div>
      </div>

      <CreditCardVisual
        card={card}
        used={metrics.used}
        available={metrics.available}
        percent={metrics.percent}
        invoiceAmount={currentInvoice ? Number(currentInvoice.total_amount) - Number(currentInvoice.paid_amount) : 0}
        dueDate={currentInvoice?.due_date}
      />

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border bg-card p-3">
          <div className="text-xs text-muted-foreground">Limite total</div>
          <div className="font-semibold">{fmt(metrics.limit)}</div>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <div className="text-xs text-muted-foreground">Disponível</div>
          <div className="font-semibold text-emerald-500">{fmt(metrics.available)}</div>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <div className="text-xs text-muted-foreground">Fechamento</div>
          <div className="font-semibold">{currentInvoice ? fmtDate(currentInvoice.closing_date) : `Dia ${card.closing_day}`}</div>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <div className="text-xs text-muted-foreground">Vencimento</div>
          <div className="font-semibold">{currentInvoice ? fmtDate(currentInvoice.due_date) : `Dia ${card.due_day}`}</div>
        </div>
      </div>

      <div className="flex gap-2">
        <Button className="flex-1" onClick={() => setOpenPurchase(true)}><Plus className="w-4 h-4 mr-1" />Nova compra</Button>
        {currentInvoice && Number(currentInvoice.total_amount) > Number(currentInvoice.paid_amount) && (
          <Button variant="secondary" className="flex-1" onClick={() => setPayTarget(currentInvoice)}>Pagar fatura</Button>
        )}
      </div>

      <Tabs defaultValue="current">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="current">Fatura atual</TabsTrigger>
          <TabsTrigger value="purchases">Compras</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="space-y-2">
          {!currentInvoice ? (
            <div className="text-center py-8 text-sm text-muted-foreground">Nenhuma fatura ainda</div>
          ) : (
            <>
              <div className="rounded-lg border p-3 flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">Total da fatura</div>
                  <div className="text-xl font-bold">{fmt(Number(currentInvoice.total_amount))}</div>
                  {Number(currentInvoice.paid_amount) > 0 && (
                    <div className="text-xs text-muted-foreground mt-1">Pago: {fmt(Number(currentInvoice.paid_amount))}</div>
                  )}
                </div>
                <Badge className={STATUS_LABEL[currentInvoice.status].color}>{STATUS_LABEL[currentInvoice.status].label}</Badge>
              </div>
              {currentInstallments.length === 0 ? (
                <div className="text-center py-6 text-sm text-muted-foreground">Sem lançamentos</div>
              ) : (
                <div className="space-y-1">
                  {currentInstallments.map(inst => {
                    const p = purchaseOf(inst.purchase_id);
                    return (
                      <div key={inst.id} className="rounded-lg border p-3 flex items-center justify-between">
                        <div className="min-w-0">
                          <div className="font-medium truncate">{p?.description ?? 'Compra'}</div>
                          <div className="text-xs text-muted-foreground">
                            {p ? `${catName(p.category_id)} • ${fmtDate(p.purchase_date)}` : ''}
                            {inst.total_installments > 1 && ` • ${inst.installment_number}/${inst.total_installments}`}
                          </div>
                        </div>
                        <div className="font-semibold">{fmt(Number(inst.amount))}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="purchases" className="space-y-1">
          {cardPurchases.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">Nenhuma compra registrada</div>
          ) : cardPurchases.map(p => (
            <div key={p.id} className="rounded-lg border p-3 flex items-center justify-between">
              <div className="min-w-0">
                <div className="font-medium truncate">{p.description}</div>
                <div className="text-xs text-muted-foreground">
                  {catName(p.category_id)} • {fmtDate(p.purchase_date)}
                  {p.installments_count > 1 && ` • ${p.installments_count}x`}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="font-semibold">{fmt(Number(p.total_amount))}</div>
                <Button variant="ghost" size="icon" onClick={async () => {
                  if (confirm('Remover compra e todas as parcelas?')) await deletePurchase(p.id);
                }}><Trash2 className="w-4 h-4" /></Button>
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="history" className="space-y-1">
          {invSorted.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">Sem histórico</div>
          ) : invSorted.map(inv => (
            <button key={inv.id} onClick={() => Number(inv.total_amount) > Number(inv.paid_amount) && setPayTarget(inv)}
              className="w-full rounded-lg border p-3 flex items-center justify-between hover:bg-muted/50 transition text-left">
              <div>
                <div className="font-medium">{new Date(inv.reference_month + 'T00:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</div>
                <div className="text-xs text-muted-foreground">Vence {fmtDate(inv.due_date)}</div>
              </div>
              <div className="text-right">
                <div className="font-semibold">{fmt(Number(inv.total_amount))}</div>
                <Badge className={STATUS_LABEL[inv.status].color}>{STATUS_LABEL[inv.status].label}</Badge>
              </div>
            </button>
          ))}
        </TabsContent>
      </Tabs>

      <CardFormModal open={openEdit} onClose={() => setOpenEdit(false)} editing={card}
        onSubmit={async (input) => { await updateCard(card.id, input); }} />
      <PurchaseFormModal open={openPurchase} onClose={() => setOpenPurchase(false)}
        onSubmit={createPurchase} cards={cards} initialCardId={card.id} />
      <PayInvoiceModal open={!!payTarget} onClose={() => setPayTarget(null)} invoice={payTarget}
        onSubmit={async (amount, account) => {
          if (payTarget) await payInvoice(payTarget.id, payTarget.card_id, amount, account);
        }} />
    </div>
  );
}
