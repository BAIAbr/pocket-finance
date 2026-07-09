import { useState } from 'react';
import { X, CreditCard } from 'lucide-react';
import { useFinanceContext } from '@/contexts/FinanceContext';
import { InstallmentInput } from '@/hooks/useInstallments';
import { format } from 'date-fns';
import { MoneyInput } from '@/components/ui/money-input';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: InstallmentInput) => Promise<any>;
}

export function InstallmentFormModal({ isOpen, onClose, onSubmit }: Props) {
  const { categories, settings } = useFinanceContext();
  const [name, setName] = useState('');
  const [total, setTotal] = useState('');
  const [count, setCount] = useState('12');
  const [categoryId, setCategoryId] = useState('');
  const [cardName, setCardName] = useState('');
  const [firstDue, setFirstDue] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [notes, setNotes] = useState('');
  const [impactsBalance, setImpactsBalance] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const expenseCats = (categories as any[]).filter(c => c.type === 'expense');
  const totalNum = Number(total) || 0;
  const countNum = Math.max(1, Math.min(360, Number(count) || 1));
  const per = totalNum > 0 ? totalNum / countNum : 0;

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || totalNum <= 0 || countNum < 1) return;
    setSubmitting(true);
    const ok = await onSubmit({
      name: name.trim(),
      total_amount: totalNum,
      installments_count: countNum,
      category_id: categoryId || null,
      first_due_date: firstDue,
      card_name: cardName.trim() || null,
      notes: notes.trim() || null,
      impacts_balance: impactsBalance,
    });
    setSubmitting(false);
    if (ok) {
      setName(''); setTotal(''); setCount('12'); setCategoryId('');
      setCardName(''); setNotes(''); setImpactsBalance(true);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-card w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="sticky top-0 bg-card border-b border-border px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard size={18} className="text-primary" />
            <h2 className="font-semibold text-lg">Nova compra parcelada</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-xs text-muted-foreground font-medium">Descrição</label>
            <input value={name} onChange={e => setName(e.target.value)} maxLength={80} required
              placeholder="Ex: Notebook, TV, Viagem..."
              className="w-full mt-1 px-4 py-3 bg-secondary rounded-xl outline-none focus:ring-2 focus:ring-primary" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground font-medium">Valor total</label>
              <MoneyInput value={total} onChange={setTotal} className="w-full mt-1 px-4 py-3 bg-secondary rounded-xl outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium">Nº parcelas</label>
              <input type="number" min="1" max="360" value={count} onChange={e => setCount(e.target.value)} required
                className="w-full mt-1 px-4 py-3 bg-secondary rounded-xl outline-none focus:ring-2 focus:ring-primary" />
            </div>
          </div>

          {per > 0 && (
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-sm">
              <p className="text-muted-foreground text-xs">Cada parcela</p>
              <p className="font-bold text-primary">
                {countNum}x de {settings.currencySymbol} {per.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          )}

          <div>
            <label className="text-xs text-muted-foreground font-medium">Categoria</label>
            <select value={categoryId} onChange={e => setCategoryId(e.target.value)}
              className="w-full mt-1 px-4 py-3 bg-secondary rounded-xl outline-none focus:ring-2 focus:ring-primary">
              <option value="">Sem categoria</option>
              {expenseCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <p className="text-[10px] text-muted-foreground mt-1">Necessária para marcar parcelas como pagas.</p>
          </div>

          <div>
            <label className="text-xs text-muted-foreground font-medium">Cartão (opcional)</label>
            <input value={cardName} onChange={e => setCardName(e.target.value)} maxLength={40}
              placeholder="Ex: Nubank, Itaú Black..."
              className="w-full mt-1 px-4 py-3 bg-secondary rounded-xl outline-none focus:ring-2 focus:ring-primary" />
          </div>

          <div>
            <label className="text-xs text-muted-foreground font-medium">1ª parcela vence em</label>
            <input type="date" value={firstDue} onChange={e => setFirstDue(e.target.value)} required
              className="w-full mt-1 px-4 py-3 bg-secondary rounded-xl outline-none focus:ring-2 focus:ring-primary" />
          </div>

          <div>
            <label className="text-xs text-muted-foreground font-medium">Notas (opcional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} maxLength={300} rows={2}
              className="w-full mt-1 px-4 py-3 bg-secondary rounded-xl outline-none focus:ring-2 focus:ring-primary resize-none" />
          </div>

          <div className="p-3 rounded-xl bg-secondary/60 border border-border">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">Atualizar saldo disponível automaticamente</p>
                <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                  Desative esta opção ao cadastrar compras antigas ou já pagas anteriormente. As parcelas serão registradas apenas para histórico e estatísticas, sem alterar o saldo atual.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={impactsBalance}
                onClick={() => setImpactsBalance(v => !v)}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${impactsBalance ? 'bg-primary' : 'bg-muted-foreground/30'}`}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${impactsBalance ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>
          </div>

          <button type="submit" disabled={submitting}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-60">
            {submitting ? 'Gerando parcelas...' : 'Gerar parcelas'}
          </button>
        </form>
      </div>
    </div>
  );
}
