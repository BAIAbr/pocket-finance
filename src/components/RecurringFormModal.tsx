import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useFinanceContext } from '@/contexts/FinanceContext';
import { RecurringInput, RecurringTransaction, Frequency } from '@/hooks/useRecurring';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: RecurringInput) => Promise<any>;
  editing?: RecurringTransaction | null;
}

export function RecurringFormModal({ isOpen, onClose, onSubmit, editing }: Props) {
  const { categories } = useFinanceContext();
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [frequency, setFrequency] = useState<Frequency>('monthly');
  const [nextDueDate, setNextDueDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (editing) {
      setType(editing.type);
      setName(editing.name);
      setAmount(String(editing.amount));
      setCategoryId(editing.category_id ?? '');
      setFrequency(editing.frequency);
      setNextDueDate(editing.next_due_date);
      setNotes(editing.notes ?? '');
    } else {
      setType('expense');
      setName('');
      setAmount('');
      setCategoryId('');
      setFrequency('monthly');
      setNextDueDate(format(new Date(), 'yyyy-MM-dd'));
      setNotes('');
    }
  }, [editing, isOpen]);

  const filteredCats = (categories as any[]).filter(c => c.type === type);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !amount) return;
    setSubmitting(true);
    await onSubmit({
      name: name.trim(),
      amount: Number(amount),
      type,
      category_id: categoryId || null,
      frequency,
      next_due_date: nextDueDate,
      notes: notes.trim() || null,
    });
    setSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-card w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="sticky top-0 bg-card border-b border-border px-5 py-4 flex items-center justify-between">
          <h2 className="font-semibold text-lg">{editing ? 'Editar recorrência' : 'Nova recorrência'}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setType('expense')} className={cn('py-3 rounded-xl font-medium text-sm transition', type === 'expense' ? 'bg-expense text-white' : 'bg-secondary')}>Despesa</button>
            <button type="button" onClick={() => setType('income')} className={cn('py-3 rounded-xl font-medium text-sm transition', type === 'income' ? 'bg-income text-white' : 'bg-secondary')}>Entrada</button>
          </div>

          <div>
            <label className="text-xs text-muted-foreground font-medium">Nome</label>
            <input value={name} onChange={e => setName(e.target.value)} maxLength={80} required placeholder="Ex: Netflix, Aluguel..." className="w-full mt-1 px-4 py-3 bg-secondary rounded-xl outline-none focus:ring-2 focus:ring-primary" />
          </div>

          <div>
            <label className="text-xs text-muted-foreground font-medium">Valor</label>
            <input type="number" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)} required placeholder="0,00" className="w-full mt-1 px-4 py-3 bg-secondary rounded-xl outline-none focus:ring-2 focus:ring-primary" />
          </div>

          <div>
            <label className="text-xs text-muted-foreground font-medium">Categoria</label>
            <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full mt-1 px-4 py-3 bg-secondary rounded-xl outline-none focus:ring-2 focus:ring-primary">
              <option value="">Sem categoria</option>
              {filteredCats.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-muted-foreground font-medium">Frequência</label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {(['weekly','monthly','yearly'] as Frequency[]).map(f => (
                <button key={f} type="button" onClick={() => setFrequency(f)} className={cn('py-2.5 rounded-xl text-sm font-medium transition', frequency === f ? 'bg-primary text-primary-foreground' : 'bg-secondary')}>
                  {f === 'weekly' ? 'Semanal' : f === 'monthly' ? 'Mensal' : 'Anual'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground font-medium">Próximo vencimento</label>
            <input type="date" value={nextDueDate} onChange={e => setNextDueDate(e.target.value)} required className="w-full mt-1 px-4 py-3 bg-secondary rounded-xl outline-none focus:ring-2 focus:ring-primary" />
          </div>

          <div>
            <label className="text-xs text-muted-foreground font-medium">Notas (opcional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} maxLength={300} rows={2} className="w-full mt-1 px-4 py-3 bg-secondary rounded-xl outline-none focus:ring-2 focus:ring-primary resize-none" />
          </div>

          <button type="submit" disabled={submitting} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-60">
            {submitting ? 'Salvando...' : editing ? 'Salvar alterações' : 'Criar recorrência'}
          </button>
        </form>
      </div>
    </div>
  );
}
