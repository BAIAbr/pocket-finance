import { useState } from 'react';
import { X, Check, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { useFinanceContext } from '@/contexts/FinanceContext';
import { cn } from '@/lib/utils';
import { getIconByName } from '@/lib/icons';
import { format } from 'date-fns';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddTransactionModal({ isOpen, onClose }: AddTransactionModalProps) {
  const { categories, addTransaction } = useFinanceContext();
  
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredCategories = categories.filter(c => c.type === type);

  const handleSubmit = async () => {
    if (!amount || !categoryId || isSubmitting) return;

    setIsSubmitting(true);
    
    const result = await addTransaction({
      type,
      amount: parseFloat(amount),
      category_id: categoryId,
      description,
      date: new Date(date).toISOString(),
    });

    if (result) {
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        resetForm();
        onClose();
      }, 1000);
    }
    
    setIsSubmitting(false);
  };

  const resetForm = () => {
    setAmount('');
    setCategoryId('');
    setDescription('');
    setDate(format(new Date(), 'yyyy-MM-dd'));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl animate-slide-up max-h-[90vh] overflow-y-auto">
        {showSuccess ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className={cn(
              'w-20 h-20 rounded-full flex items-center justify-center animate-success-pop',
              type === 'income' ? 'gradient-income' : 'gradient-expense'
            )}>
              <Check size={40} className="text-white" />
            </div>
            <p className="mt-4 text-lg font-medium">Transação adicionada!</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-semibold">Nova Transação</h2>
              <button 
                onClick={onClose}
                className="p-2 rounded-full hover:bg-secondary touch-scale"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-6">
              {/* Type Toggle */}
              <div className="flex gap-2 p-1 bg-secondary rounded-xl">
                <button
                  onClick={() => { setType('expense'); setCategoryId(''); }}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-all',
                    type === 'expense' 
                      ? 'gradient-expense text-white shadow-glow-expense' 
                      : 'text-muted-foreground'
                  )}
                >
                  <ArrowUpRight size={18} />
                  Saída
                </button>
                <button
                  onClick={() => { setType('income'); setCategoryId(''); }}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-all',
                    type === 'income' 
                      ? 'gradient-income text-white shadow-glow-income' 
                      : 'text-muted-foreground'
                  )}
                >
                  <ArrowDownLeft size={18} />
                  Entrada
                </button>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm text-muted-foreground mb-2">Valor</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">
                    R$
                  </span>
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="amount-input w-full h-16 pl-12 pr-4 rounded-xl bg-secondary"
                  />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm text-muted-foreground mb-2">Categoria</label>
                <div className="grid grid-cols-4 gap-2">
                  {filteredCategories.map(category => {
                    const IconComponent = getIconByName(category.icon);
                    const isSelected = categoryId === category.id;
                    
                    return (
                      <button
                        key={category.id}
                        onClick={() => setCategoryId(category.id)}
                        className={cn(
                          'flex flex-col items-center gap-1 p-3 rounded-xl transition-all touch-scale',
                          isSelected 
                            ? 'bg-secondary ring-2 ring-accent' 
                            : 'bg-secondary/50 hover:bg-secondary'
                        )}
                      >
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: `${category.color}20` }}
                        >
                          <IconComponent size={20} style={{ color: category.color }} />
                        </div>
                        <span className="text-xs text-center truncate w-full">
                          {category.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm text-muted-foreground mb-2">Descrição (opcional)</label>
                <input
                  type="text"
                  placeholder="Ex: Almoço no restaurante"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="input-finance"
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm text-muted-foreground mb-2">Data</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="input-finance"
                />
              </div>

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={!amount || !categoryId || isSubmitting}
                className={cn(
                  'w-full py-4 rounded-xl font-semibold text-white transition-all touch-scale',
                  amount && categoryId && !isSubmitting
                    ? type === 'income' 
                      ? 'gradient-income shadow-glow-income' 
                      : 'gradient-expense shadow-glow-expense'
                    : 'bg-muted text-muted-foreground cursor-not-allowed'
                )}
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                ) : (
                  `Adicionar ${type === 'income' ? 'Entrada' : 'Saída'}`
                )}
              </button>
            </div>

            {/* Safe area spacing */}
            <div className="h-8" />
          </>
        )}
      </div>
    </div>
  );
}
