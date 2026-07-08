import { useState, useEffect } from 'react';
import { X, Check, ArrowDownLeft, ArrowUpRight, Trash2 } from 'lucide-react';
import { useFinanceContext } from '@/contexts/FinanceContext';
import { cn } from '@/lib/utils';
import { getIconByName } from '@/lib/icons';
import { format, parseISO } from 'date-fns';
import { Transaction } from '@/hooks/useSupabaseFinance';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { MoneyInput } from '@/components/ui/money-input';

interface EditTransactionModalProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
}

export function EditTransactionModal({ transaction, isOpen, onClose }: EditTransactionModalProps) {
  const { categories, updateTransaction, deleteTransaction } = useFinanceContext();

  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (transaction) {
      setType(transaction.type);
      setAmount(String(transaction.amount));
      setCategoryId(transaction.category_id || '');
      setDescription(transaction.description || '');
      setDate(transaction.date.split('T')[0]);
      setShowDeleteConfirm(false);
    }
  }, [transaction]);

  const filteredCategories = categories.filter(c => c.type === type);

  const handleSubmit = async () => {
    if (!transaction || !amount || !categoryId || isSubmitting) return;
    setIsSubmitting(true);

    await updateTransaction(transaction.id, {
      type,
      amount: parseFloat(amount),
      category_id: categoryId,
      description,
      date: new Date(date).toISOString(),
    });

    setIsSubmitting(false);
    onClose();
  };

  const handleDelete = async () => {
    if (!transaction || isSubmitting) return;
    setIsSubmitting(true);
    await deleteTransaction(transaction.id);
    setIsSubmitting(false);
    onClose();
  };

  if (!transaction) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Transação</DialogTitle>
          <DialogDescription>Modifique os dados da transação</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Type Toggle */}
          <div className="flex gap-2 p-1 bg-secondary rounded-xl">
            <button
              onClick={() => { setType('expense'); setCategoryId(''); }}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium transition-all text-sm',
                type === 'expense'
                  ? 'gradient-expense text-primary-foreground shadow-glow-expense'
                  : 'text-muted-foreground'
              )}
            >
              <ArrowUpRight size={16} />
              Saída
            </button>
            <button
              onClick={() => { setType('income'); setCategoryId(''); }}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium transition-all text-sm',
                type === 'income'
                  ? 'gradient-income text-primary-foreground shadow-glow-income'
                  : 'text-muted-foreground'
              )}
            >
              <ArrowDownLeft size={16} />
              Entrada
            </button>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm text-muted-foreground mb-1.5">Valor</label>
            <MoneyInput
              value={amount}
              onChange={setAmount}
              className="amount-input w-full h-14 px-4 rounded-xl bg-secondary"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm text-muted-foreground mb-1.5">Categoria</label>
            <div className="grid grid-cols-4 gap-2">
              {filteredCategories.map(category => {
                const IconComponent = getIconByName(category.icon);
                const isSelected = categoryId === category.id;
                return (
                  <button
                    key={category.id}
                    onClick={() => setCategoryId(category.id)}
                    className={cn(
                      'flex flex-col items-center gap-1 p-2.5 rounded-xl transition-all touch-scale',
                      isSelected
                        ? 'bg-secondary ring-2 ring-accent'
                        : 'bg-secondary/50 hover:bg-secondary'
                    )}
                  >
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: `${category.color}20` }}
                    >
                      <IconComponent size={18} style={{ color: category.color }} />
                    </div>
                    <span className="text-[11px] text-center truncate w-full">{category.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm text-muted-foreground mb-1.5">Descrição</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-finance"
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm text-muted-foreground mb-1.5">Data</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input-finance"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            {showDeleteConfirm ? (
              <div className="flex-1 flex gap-2">
                <button
                  onClick={handleDelete}
                  disabled={isSubmitting}
                  className="flex-1 py-3 rounded-xl font-semibold text-primary-foreground bg-destructive hover:bg-destructive/90 transition-all"
                >
                  Confirmar exclusão
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-3 rounded-xl bg-secondary text-foreground font-medium"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-3 rounded-xl text-destructive hover:bg-destructive/10 transition-all"
                  aria-label="Excluir"
                >
                  <Trash2 size={20} />
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!amount || !categoryId || isSubmitting}
                  className={cn(
                    'flex-1 py-3 rounded-xl font-semibold text-primary-foreground transition-all',
                    amount && categoryId && !isSubmitting
                      ? type === 'income'
                        ? 'gradient-income shadow-glow-income'
                        : 'gradient-expense shadow-glow-expense'
                      : 'bg-muted text-muted-foreground cursor-not-allowed'
                  )}
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mx-auto" />
                  ) : (
                    'Salvar alterações'
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
