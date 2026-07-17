import { CreditCard as CardIcon } from 'lucide-react';
import type { CreditCard } from '@/hooks/useCreditCards';

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface Props {
  card: CreditCard;
  used: number;
  available: number;
  percent: number;
  dueDate?: string;
  invoiceAmount?: number;
  onClick?: () => void;
  compact?: boolean;
}

export default function CreditCardVisual({ card, used, available, percent, dueDate, invoiceAmount, onClick, compact }: Props) {
  const barColor = percent >= 80 ? 'bg-red-500' : percent >= 50 ? 'bg-yellow-500' : 'bg-emerald-500';

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-2xl p-4 shadow-lg text-white transition-transform active:scale-[0.98] hover:scale-[1.01]"
      style={{ background: `linear-gradient(135deg, ${card.color} 0%, ${card.color}cc 100%)` }}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 text-xs opacity-90">
            <CardIcon className="w-4 h-4" />
            <span>{card.bank ?? 'Cartão'}</span>
          </div>
          <div className="text-lg font-semibold mt-1 truncate">{card.name}</div>
        </div>
        <div className="text-right text-xs opacity-90">
          <div>{card.brand ?? ''}</div>
          {card.last_digits && <div className="tracking-widest mt-1">•••• {card.last_digits}</div>}
        </div>
      </div>

      {!compact && (
        <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
          <div>
            <div className="opacity-80">Fatura atual</div>
            <div className="text-base font-semibold">{fmt(invoiceAmount ?? used)}</div>
          </div>
          <div className="text-right">
            <div className="opacity-80">Disponível</div>
            <div className="text-base font-semibold">{fmt(available)}</div>
          </div>
        </div>
      )}

      <div className="space-y-1">
        <div className="h-2 rounded-full bg-white/20 overflow-hidden">
          <div className={`h-full ${barColor} transition-all`} style={{ width: `${Math.min(100, percent)}%` }} />
        </div>
        <div className="flex justify-between text-[11px] opacity-90">
          <span>{percent.toFixed(0)}% utilizado</span>
          <span>Limite {fmt(Number(card.credit_limit))}</span>
        </div>
      </div>

      {dueDate && !compact && (
        <div className="mt-3 text-[11px] opacity-90">
          Vence em {new Date(dueDate + 'T00:00:00').toLocaleDateString('pt-BR')}
        </div>
      )}
    </button>
  );
}
