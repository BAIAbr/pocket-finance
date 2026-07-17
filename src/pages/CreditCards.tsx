import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, CreditCard as CardIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCreditCards } from '@/hooks/useCreditCards';
import CardFormModal from '@/components/creditcards/CardFormModal';
import PurchaseFormModal from '@/components/creditcards/PurchaseFormModal';
import CreditCardVisual from '@/components/creditcards/CreditCardVisual';

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function CreditCards() {
  const navigate = useNavigate();
  const { cards, loading, totals, createCard, createPurchase, getCardMetrics } = useCreditCards();
  const [openForm, setOpenForm] = useState(false);
  const [openPurchase, setOpenPurchase] = useState(false);
  const [purchaseCardId, setPurchaseCardId] = useState<string | undefined>();

  return (
    <div className="max-w-4xl mx-auto p-4 pb-24 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cartões de crédito</h1>
          <p className="text-sm text-muted-foreground">Gerencie limites, faturas e parcelas</p>
        </div>
        <div className="flex gap-2">
          {cards.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => { setPurchaseCardId(undefined); setOpenPurchase(true); }}>
              Nova compra
            </Button>
          )}
          <Button size="sm" onClick={() => setOpenForm(true)}><Plus className="w-4 h-4 mr-1" />Adicionar</Button>
        </div>
      </div>

      {cards.length > 0 && (
        <div className="rounded-xl border p-4 bg-card">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div><div className="text-xs text-muted-foreground">Limite total</div><div className="font-semibold">{fmt(totals.limit)}</div></div>
            <div><div className="text-xs text-muted-foreground">Utilizado</div><div className="font-semibold text-red-500">{fmt(totals.used)}</div></div>
            <div><div className="text-xs text-muted-foreground">Disponível</div><div className="font-semibold text-emerald-500">{fmt(totals.available)}</div></div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : cards.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-dashed">
          <CardIcon className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-semibold mb-1">Nenhum cartão cadastrado</h3>
          <p className="text-sm text-muted-foreground mb-4">Cadastre seu primeiro cartão para começar</p>
          <Button onClick={() => setOpenForm(true)}><Plus className="w-4 h-4 mr-1" />Adicionar cartão</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cards.map(card => {
            const m = getCardMetrics(card.id);
            return (
              <CreditCardVisual
                key={card.id}
                card={card}
                used={m.used}
                available={m.available}
                percent={m.percent}
                invoiceAmount={m.currentInvoice ? Number(m.currentInvoice.total_amount) - Number(m.currentInvoice.paid_amount) : 0}
                dueDate={m.currentInvoice?.due_date}
                onClick={() => navigate(`/cards/${card.id}`)}
              />
            );
          })}
        </div>
      )}

      <CardFormModal open={openForm} onClose={() => setOpenForm(false)} onSubmit={createCard} />
      <PurchaseFormModal
        open={openPurchase}
        onClose={() => setOpenPurchase(false)}
        onSubmit={createPurchase}
        cards={cards}
        initialCardId={purchaseCardId}
      />
    </div>
  );
}
