import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Edit2, Repeat, Play, Power, MoreVertical, RotateCcw, FastForward, X, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useCreditCards, CreditCardInvoice, CreditCardRecurring, CreditCardInstallment } from '@/hooks/useCreditCards';
import CreditCardVisual from '@/components/creditcards/CreditCardVisual';
import CardFormModal from '@/components/creditcards/CardFormModal';
import PurchaseFormModal from '@/components/creditcards/PurchaseFormModal';
import PayInvoiceModal from '@/components/creditcards/PayInvoiceModal';
import RecurringFormModal from '@/components/creditcards/RecurringFormModal';
import InstallmentEditModal from '@/components/creditcards/InstallmentEditModal';
import ImportInvoiceModal from '@/components/creditcards/ImportInvoiceModal';
import CreditCardInsights from '@/components/creditcards/CreditCardInsights';
import CardRulesManager from '@/components/creditcards/CardRulesManager';
import { useCardInsights } from '@/hooks/useCreditCardInsights';
import { useCreditCardRules, resolveAutoCategory } from '@/hooks/useCreditCardRules';
import { useCardRuleAlerts } from '@/hooks/useCardRuleAlerts';
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
    cards, installments, purchases, invoices, recurring, payments, getCardMetrics,
    updateCard, deleteCard, createPurchase, payInvoice, deletePurchase,
    createRecurring, updateRecurring, deleteRecurring, toggleRecurring, runRecurringNow,
    updateInstallment, deleteInstallment, anticipateInstallment, reopenInvoice, deletePayment,
  } = useCreditCards();

  const [openEdit, setOpenEdit] = useState(false);
  const [openPurchase, setOpenPurchase] = useState(false);
  const [openRecurring, setOpenRecurring] = useState(false);
  const [openImport, setOpenImport] = useState(false);
  const [editingRecurring, setEditingRecurring] = useState<CreditCardRecurring | null>(null);
  const [editingInstallment, setEditingInstallment] = useState<CreditCardInstallment | null>(null);
  const [payTarget, setPayTarget] = useState<CreditCardInvoice | null>(null);


  const card = cards.find(c => c.id === id);
  const metrics = useMemo(() => id ? getCardMetrics(id) : null, [id, getCardMetrics]);
  const insights = useCardInsights(id ?? '');
  const { rules: allRules } = useCreditCardRules();

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

      <div className="flex gap-2 flex-wrap">
        <Button className="flex-1 min-w-[140px]" onClick={() => setOpenPurchase(true)}><Plus className="w-4 h-4 mr-1" />Nova compra</Button>
        <Button variant="outline" className="flex-1 min-w-[140px]" onClick={() => setOpenImport(true)}><Upload className="w-4 h-4 mr-1" />Importar fatura</Button>
        {currentInvoice && Number(currentInvoice.total_amount) > Number(currentInvoice.paid_amount) && (
          <Button variant="secondary" className="flex-1 min-w-[140px]" onClick={() => setPayTarget(currentInvoice)}>Pagar fatura</Button>
        )}
      </div>

      {insights.length > 0 && <CreditCardInsights insights={insights} compact />}

      <Tabs defaultValue="current">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="current">Fatura</TabsTrigger>
          <TabsTrigger value="purchases">Compras</TabsTrigger>
          <TabsTrigger value="recurring">Recorrências</TabsTrigger>
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
                <div className="flex flex-col items-end gap-1">
                  <Badge className={STATUS_LABEL[currentInvoice.status].color}>{STATUS_LABEL[currentInvoice.status].label}</Badge>
                  {(currentInvoice.status === 'paid' || currentInvoice.status === 'closed') && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs"
                      onClick={async () => {
                        if (confirm('Reabrir esta fatura? As parcelas voltarão para "em aberto".')) {
                          await reopenInvoice(currentInvoice.id);
                        }
                      }}>
                      <RotateCcw className="w-3 h-3 mr-1" />Reabrir
                    </Button>
                  )}
                </div>
              </div>
              {currentInstallments.length === 0 ? (
                <div className="text-center py-6 text-sm text-muted-foreground">Sem lançamentos</div>
              ) : (
                <div className="space-y-1">
                  {currentInstallments.map(inst => {
                    const p = purchaseOf(inst.purchase_id);
                    const otherFutureInv = metrics.cardInvoices
                      .filter(i => i.id !== inst.invoice_id && i.reference_month > currentInvoice.reference_month && i.status !== 'paid')
                      .sort((a, b) => a.reference_month.localeCompare(b.reference_month));
                    return (
                      <div key={inst.id} className="rounded-lg border p-3 flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate">{p?.description ?? 'Compra'}</div>
                          <div className="text-xs text-muted-foreground">
                            {p ? `${catName(p.category_id)} • ${fmtDate(p.purchase_date)}` : ''}
                            {inst.total_installments > 1 && ` • ${inst.installment_number}/${inst.total_installments}`}
                          </div>
                        </div>
                        <div className="font-semibold shrink-0">{fmt(Number(inst.amount))}</div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditingInstallment(inst)}>
                              <Edit2 className="w-3.5 h-3.5 mr-2" />Editar / mover
                            </DropdownMenuItem>
                            {otherFutureInv.length > 0 && (
                              <DropdownMenuItem onClick={async () => {
                                await anticipateInstallment(inst.id, currentInvoice.id);
                              }}>
                                <FastForward className="w-3.5 h-3.5 mr-2" />Antecipar p/ atual
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={async () => {
                              if (confirm('Estornar esta parcela? O valor será removido da fatura.')) {
                                await deleteInstallment(inst.id);
                              }
                            }}>
                              <Trash2 className="w-3.5 h-3.5 mr-2" />Estornar parcela
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    );
                  })}
                </div>
              )}

              {(() => {
                const invPayments = payments.filter(pp => pp.invoice_id === currentInvoice.id);
                if (invPayments.length === 0) return null;
                return (
                  <div className="mt-4 space-y-1">
                    <div className="text-xs font-semibold text-muted-foreground px-1">Pagamentos</div>
                    {invPayments.map(pay => (
                      <div key={pay.id} className="rounded-lg border p-3 flex items-center justify-between bg-emerald-500/5">
                        <div className="min-w-0">
                          <div className="font-medium text-emerald-700 dark:text-emerald-400">{fmt(Number(pay.amount))}</div>
                          <div className="text-xs text-muted-foreground">
                            {fmtDate(pay.payment_date)}{pay.source_account ? ` • ${pay.source_account}` : ''}
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7"
                          onClick={async () => {
                            if (confirm('Estornar este pagamento?')) await deletePayment(pay.id);
                          }}>
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                );
              })()}
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

        <TabsContent value="recurring" className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs text-muted-foreground">Assinaturas fixas lançadas todo mês na fatura</div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={runRecurringNow}>
                <Play className="w-3.5 h-3.5 mr-1" />Rodar agora
              </Button>
              <Button size="sm" onClick={() => { setEditingRecurring(null); setOpenRecurring(true); }}>
                <Plus className="w-3.5 h-3.5 mr-1" />Adicionar
              </Button>
            </div>
          </div>
          {(() => {
            const cardRecurring = recurring.filter(r => r.card_id === card.id);
            if (cardRecurring.length === 0) {
              return (
                <div className="text-center py-8 rounded-lg border border-dashed">
                  <Repeat className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <div className="text-sm text-muted-foreground">Nenhuma recorrência cadastrada</div>
                </div>
              );
            }
            return cardRecurring.map(r => (
              <div key={r.id} className={`rounded-lg border p-3 ${!r.is_active ? 'opacity-60' : ''}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate flex items-center gap-2">
                      <Repeat className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      {r.description}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {catName(r.category_id)} • Todo dia {r.day_of_month}
                      {r.last_charged_month && ` • último: ${new Date(r.last_charged_month + 'T00:00:00').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })}`}
                    </div>
                  </div>
                  <div className="font-semibold shrink-0">{fmt(Number(r.amount))}</div>
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t">
                  <button
                    onClick={() => toggleRecurring(r.id, !r.is_active)}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <Power className="w-3 h-3" />{r.is_active ? 'Ativa' : 'Pausada'}
                  </button>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingRecurring(r); setOpenRecurring(true); }}>
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={async () => {
                      if (confirm('Remover esta recorrência? Os lançamentos já feitos não serão excluídos.')) await deleteRecurring(r.id);
                    }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ));
          })()}
        </TabsContent>

        <TabsContent value="history" className="space-y-1">
          {invSorted.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">Sem histórico</div>
          ) : invSorted.map(inv => {
            const remaining = Number(inv.total_amount) - Number(inv.paid_amount);
            return (
              <div key={inv.id} className="w-full rounded-lg border p-3 flex items-center justify-between gap-2 hover:bg-muted/50 transition">
                <button onClick={() => remaining > 0 && setPayTarget(inv)} className="flex-1 text-left min-w-0">
                  <div className="font-medium">{new Date(inv.reference_month + 'T00:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</div>
                  <div className="text-xs text-muted-foreground">Vence {fmtDate(inv.due_date)}</div>
                </button>
                <div className="text-right shrink-0">
                  <div className="font-semibold">{fmt(Number(inv.total_amount))}</div>
                  <Badge className={STATUS_LABEL[inv.status].color}>{STATUS_LABEL[inv.status].label}</Badge>
                </div>
                {(inv.status === 'paid' || inv.status === 'closed') && (
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0"
                    onClick={async () => {
                      if (confirm('Reabrir esta fatura?')) await reopenInvoice(inv.id);
                    }}>
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                )}
              </div>
            );
          })}
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
      <RecurringFormModal
        open={openRecurring}
        onClose={() => { setOpenRecurring(false); setEditingRecurring(null); }}
        cards={cards}
        initialCardId={card.id}
        editing={editingRecurring}
        onSubmit={async (input) => {
          if (editingRecurring) await updateRecurring(editingRecurring.id, input);
          else await createRecurring(input);
        }}
      />
      <InstallmentEditModal
        open={!!editingInstallment}
        onClose={() => setEditingInstallment(null)}
        installment={editingInstallment}
        invoices={invoices}
        onSaveAmount={async (id, amount) => { await updateInstallment(id, { amount }); }}
        onAnticipate={async (id, invId) => { await anticipateInstallment(id, invId); }}
      />
      <ImportInvoiceModal
        open={openImport}
        onClose={() => setOpenImport(false)}
        card={card}
        categories={cats}
        existingPurchases={cardPurchases}
        onImport={createPurchase}
      />
    </div>
  );
}

