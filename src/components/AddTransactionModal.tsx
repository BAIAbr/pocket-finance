import { useState } from 'react';
import { X, Check, ArrowDownLeft, ArrowUpRight, Plus, Settings, Users } from 'lucide-react';
import { useFinanceContext } from '@/contexts/FinanceContext';
import { useFamilyContext } from '@/contexts/FamilyContext';
import { cn } from '@/lib/utils';
import { getIconByName } from '@/lib/icons';
import { format } from 'date-fns';
import { QuickCategoryModal } from './QuickCategoryModal';
import { useNavigate } from 'react-router-dom';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddTransactionModal({ isOpen, onClose }: AddTransactionModalProps) {
  const { categories, addTransaction, addCategory } = useFinanceContext();
  const { family, shareTransaction, viewContext } = useFamilyContext();
  const navigate = useNavigate();
  
  const isInFamilyMode = viewContext === 'family';
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showQuickCategoryModal, setShowQuickCategoryModal] = useState(false);
  const [shareWithFamily, setShareWithFamily] = useState(isInFamilyMode);

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
      // Share with family if checkbox is checked
      if (shareWithFamily && family && result.id) {
        await shareTransaction(result.id);
      }
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
    setShareWithFamily(isInFamilyMode);
  };

  const handleQuickCategorySave = async (categoryData: { name: string; icon: string; color: string; type: 'income' | 'expense' }) => {
    const newCategory = await addCategory(categoryData);
    if (newCategory) {
      setCategoryId(newCategory.id);
    }
    return newCategory;
  };

  const handleGoToCategories = () => {
    onClose();
    navigate('/categories');
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end lg:items-center lg:justify-center">
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />
        
        {/* Modal */}
        <div className="relative w-full lg:max-w-md bg-card rounded-t-3xl lg:rounded-3xl animate-slide-up max-h-screen lg:max-h-[85vh] overflow-y-auto shadow-2xl">
          {showSuccess ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className={cn(
                'w-20 h-20 rounded-full flex items-center justify-center animate-success-pop',
                type === 'income' ? 'gradient-income' : 'gradient-expense'
              )}>
                <Check size={40} className="text-primary-foreground" />
              </div>
              <p className="mt-4 text-lg font-medium">Transação adicionada!</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center justify-between p-4 lg:px-6 lg:py-3 border-b border-border">
                <h2 className="text-lg font-semibold">Nova Transação</h2>
                <button 
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-secondary touch-scale"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-4 lg:p-6 space-y-5 lg:space-y-4">
                {/* Type Toggle */}
                <div className="flex gap-2 p-1 bg-secondary rounded-xl">
                  <button
                    onClick={() => { setType('expense'); setCategoryId(''); }}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-all',
                      type === 'expense' 
                        ? 'gradient-expense text-primary-foreground shadow-glow-expense' 
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
                        ? 'gradient-income text-primary-foreground shadow-glow-income' 
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
                      className="amount-input w-full h-16 lg:h-14 pl-12 pr-4 rounded-xl bg-secondary"
                    />
                  </div>
                </div>

                {/* Category */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm text-muted-foreground">Categoria</label>
                    <button
                      onClick={handleGoToCategories}
                      className="text-xs text-accent flex items-center gap-1 hover:underline"
                    >
                      <Settings size={12} />
                      Gerenciar
                    </button>
                  </div>
                  <div className="grid grid-cols-4 lg:grid-cols-5 gap-2">
                    {filteredCategories.map(category => {
                      const IconComponent = getIconByName(category.icon);
                      const isSelected = categoryId === category.id;
                      
                      return (
                      <button
                          key={category.id}
                          onClick={() => setCategoryId(category.id)}
                          className={cn(
                            'flex flex-col items-center gap-1 p-3 lg:p-2 rounded-xl transition-all touch-scale',
                            isSelected 
                              ? 'bg-secondary ring-2 ring-accent' 
                              : 'bg-secondary/50 hover:bg-secondary'
                          )}
                        >
                          <div 
                            className="w-10 h-10 lg:w-9 lg:h-9 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: `${category.color}20` }}
                          >
                            <IconComponent size={20} className="lg:w-[18px] lg:h-[18px]" style={{ color: category.color }} />
                          </div>
                          <span className="text-xs text-center truncate w-full">
                            {category.name}
                          </span>
                        </button>
                      );
                    })}
                    
                    {/* Add New Category Button */}
                    <button
                      onClick={() => setShowQuickCategoryModal(true)}
                      className="flex flex-col items-center gap-1 p-3 lg:p-2 rounded-xl transition-all touch-scale bg-secondary/30 hover:bg-secondary/50 border-2 border-dashed border-border"
                    >
                      <div className="w-10 h-10 lg:w-9 lg:h-9 rounded-full flex items-center justify-center bg-accent/20">
                        <Plus size={20} className="text-accent lg:w-[18px] lg:h-[18px]" />
                      </div>
                      <span className="text-xs text-center text-muted-foreground">
                        Nova
                      </span>
                    </button>
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

                {/* Share with Family */}
                {family && (
                  <button
                    type="button"
                    onClick={() => setShareWithFamily(!shareWithFamily)}
                    className={cn(
                      'w-full flex items-center gap-3 p-3 lg:p-2.5 rounded-xl transition-all touch-scale',
                      shareWithFamily ? 'bg-primary/15 ring-1 ring-primary' : 'bg-secondary/50'
                    )}
                  >
                    <div className={cn(
                      'w-5 h-5 rounded border-2 flex items-center justify-center transition-all',
                      shareWithFamily ? 'bg-primary border-primary' : 'border-muted-foreground/40'
                    )}>
                      {shareWithFamily && <Check size={12} className="text-primary-foreground" />}
                    </div>
                    <div className="flex items-center gap-2">
                      <Users size={16} className={shareWithFamily ? 'text-primary' : 'text-muted-foreground'} />
                      <span className={cn('text-sm', shareWithFamily ? 'text-primary font-medium' : 'text-muted-foreground')}>
                        Compartilhar com a Família
                      </span>
                    </div>
                  </button>
                )}

                {/* Submit */}
                <button
                  onClick={handleSubmit}
                  disabled={!amount || !categoryId || isSubmitting}
                  className={cn(
                    'w-full py-4 lg:py-3 rounded-xl font-semibold text-primary-foreground transition-all touch-scale',
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
                    `Adicionar ${type === 'income' ? 'Entrada' : 'Saída'}`
                  )}
                </button>
              </div>

              {/* Safe area spacing */}
              <div className="h-8 lg:h-4" />
            </>
          )}
        </div>
      </div>

      {/* Quick Category Modal */}
      <QuickCategoryModal
        isOpen={showQuickCategoryModal}
        onClose={() => setShowQuickCategoryModal(false)}
        onSave={handleQuickCategorySave}
        defaultType={type}
      />
    </>
  );
}
