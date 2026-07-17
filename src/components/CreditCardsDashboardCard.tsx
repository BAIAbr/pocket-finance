import { useNavigate } from 'react-router-dom';
import { CreditCard as CardIcon, ChevronRight } from 'lucide-react';
import { useCreditCards } from '@/hooks/useCreditCards';
import CreditCardVisual from '@/components/creditcards/CreditCardVisual';

export default function CreditCardsDashboardCard() {
  const navigate = useNavigate();
  const { cards, loading, getCardMetrics } = useCreditCards();

  if (loading) return null;
  if (cards.length === 0) return null;

  const display = cards.slice(0, 2);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <CardIcon className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Cartões</h3>
        </div>
        <button onClick={() => navigate('/cards')} className="text-xs text-primary flex items-center gap-1">
          Ver todos <ChevronRight className="w-3 h-3" />
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {display.map(card => {
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
    </div>
  );
}
