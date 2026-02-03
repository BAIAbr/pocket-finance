import { useState } from 'react';
import { useFinanceContext } from '@/contexts/FinanceContext';
import { Plus, Trash2, X, Check, Edit2 } from 'lucide-react';
import { getIconByName } from '@/lib/icons';
import { cn } from '@/lib/utils';
import { Category } from '@/hooks/useSupabaseFinance';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

type TransactionType = 'income' | 'expense';

const availableIcons = [
  'Briefcase', 'Laptop', 'TrendingUp', 'Gift', 'Plus', 'DollarSign', 'CreditCard',
  'UtensilsCrossed', 'Car', 'Home', 'Gamepad2', 'Heart', 'GraduationCap', 
  'ShoppingBag', 'Receipt', 'MoreHorizontal', 'Plane', 'Coffee', 'Music', 'Book',
  'Smartphone', 'Wifi', 'Tv', 'Dumbbell', 'Pill', 'Baby', 'Dog', 'Cat',
];

const availableColors = [
  '#10B981', '#34D399', '#6EE7B7', '#059669', '#047857',
  '#F43F5E', '#FB7185', '#FDA4AF', '#E11D48', '#BE123C',
  '#8B5CF6', '#A78BFA', '#C4B5FD', '#7C3AED', '#6D28D9',
  '#3B82F6', '#60A5FA', '#93C5FD', '#2563EB', '#1D4ED8',
  '#F59E0B', '#FBBF24', '#FCD34D', '#D97706', '#B45309',
];

export default function Categories() {
  const { categories, addCategory, updateCategory, deleteCategory, transactions } = useFinanceContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [activeType, setActiveType] = useState<TransactionType>('expense');
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  // Modal state
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('Circle');
  const [color, setColor] = useState('#10B981');
  const [type, setType] = useState<TransactionType>('expense');

  const filteredCategories = categories.filter(c => c.type === activeType);

  // Count transactions per category
  const getTransactionCount = (categoryId: string) => {
    return transactions.filter(t => t.category_id === categoryId).length;
  };

  const openAddModal = () => {
    setEditingCategory(null);
    setName('');
    setIcon('Circle');
    setColor(activeType === 'income' ? '#10B981' : '#F43F5E');
    setType(activeType);
    setIsModalOpen(true);
  };

  const openEditModal = (category: Category) => {
    setEditingCategory(category);
    setName(category.name);
    setIcon(category.icon);
    setColor(category.color);
    setType(category.type);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) return;

    if (editingCategory) {
      await updateCategory(editingCategory.id, { name, icon, color, type });
      toast.success('Categoria atualizada!');
    } else {
      await addCategory({ name, icon, color, type });
      toast.success('Categoria criada!');
    }
    setIsModalOpen(false);
  };

  const handleDeleteConfirm = async () => {
    if (!categoryToDelete) return;
    
    const count = getTransactionCount(categoryToDelete.id);
    await deleteCategory(categoryToDelete.id);
    
    if (count > 0) {
      toast.success(`Categoria excluída. ${count} transações foram desvinculadas.`);
    } else {
      toast.success('Categoria excluída!');
    }
    
    setCategoryToDelete(null);
  };

  return (
    <div className="min-h-screen bg-background pb-24 safe-top">
      {/* Header */}
      <header className="px-4 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Categorias</h1>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-accent text-accent-foreground touch-scale text-sm font-medium"
          >
            <Plus size={18} />
            Nova
          </button>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie suas categorias de receitas e despesas
        </p>
      </header>

      <main className="px-4 space-y-6">
        {/* Type Tabs */}
        <div className="flex gap-2 p-1 bg-secondary rounded-xl">
          <button
            onClick={() => setActiveType('expense')}
            className={cn(
              'flex-1 py-2.5 rounded-lg font-medium transition-all text-sm',
              activeType === 'expense' 
                ? 'bg-destructive text-destructive-foreground' 
                : 'text-muted-foreground'
            )}
          >
            Saídas ({categories.filter(c => c.type === 'expense').length})
          </button>
          <button
            onClick={() => setActiveType('income')}
            className={cn(
              'flex-1 py-2.5 rounded-lg font-medium transition-all text-sm',
              activeType === 'income' 
                ? 'bg-success text-success-foreground' 
                : 'text-muted-foreground'
            )}
          >
            Entradas ({categories.filter(c => c.type === 'income').length})
          </button>
        </div>

        {/* Categories List */}
        <div className="space-y-2">
          {filteredCategories.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Nenhuma categoria encontrada</p>
              <button
                onClick={openAddModal}
                className="mt-4 text-accent hover:underline text-sm"
              >
                Criar primeira categoria
              </button>
            </div>
          ) : (
            filteredCategories.map(category => {
              const IconComponent = getIconByName(category.icon);
              const txCount = getTransactionCount(category.id);
              
              return (
                <div 
                  key={category.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border touch-scale cursor-pointer hover:bg-secondary/50 transition-colors"
                  onClick={() => openEditModal(category)}
                >
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${category.color}20` }}
                  >
                    <IconComponent size={24} style={{ color: category.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{category.name}</p>
                      {category.is_default && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                          Padrão
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {txCount} {txCount === 1 ? 'transação' : 'transações'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(category);
                      }}
                      className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-secondary"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCategoryToDelete(category);
                      }}
                      className="p-2 text-muted-foreground hover:text-destructive transition-colors rounded-lg hover:bg-secondary"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* Edit/Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsModalOpen(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl animate-slide-up max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-semibold">
                {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-full hover:bg-secondary touch-scale"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-6">
              {/* Name */}
              <div>
                <label className="block text-sm text-muted-foreground mb-2">Nome</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Alimentação"
                  className="input-finance"
                  autoFocus
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm text-muted-foreground mb-2">Tipo</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setType('expense')}
                    className={cn(
                      'flex-1 py-2.5 rounded-lg font-medium transition-all text-sm',
                      type === 'expense' 
                        ? 'bg-destructive text-destructive-foreground' 
                        : 'bg-secondary text-muted-foreground'
                    )}
                  >
                    Saída
                  </button>
                  <button
                    onClick={() => setType('income')}
                    className={cn(
                      'flex-1 py-2.5 rounded-lg font-medium transition-all text-sm',
                      type === 'income' 
                        ? 'bg-success text-success-foreground' 
                        : 'bg-secondary text-muted-foreground'
                    )}
                  >
                    Entrada
                  </button>
                </div>
              </div>

              {/* Icon */}
              <div>
                <label className="block text-sm text-muted-foreground mb-2">Ícone</label>
                <div className="grid grid-cols-7 gap-2">
                  {availableIcons.map(iconName => {
                    const IconComp = getIconByName(iconName);
                    return (
                      <button
                        key={iconName}
                        onClick={() => setIcon(iconName)}
                        className={cn(
                          'w-10 h-10 rounded-lg flex items-center justify-center transition-all',
                          icon === iconName 
                            ? 'bg-accent ring-2 ring-accent' 
                            : 'bg-secondary hover:bg-secondary/80'
                        )}
                      >
                        <IconComp size={20} style={{ color: icon === iconName ? color : undefined }} />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Color */}
              <div>
                <label className="block text-sm text-muted-foreground mb-2">Cor</label>
                <div className="grid grid-cols-10 gap-2">
                  {availableColors.map(c => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className={cn(
                        'w-8 h-8 rounded-full transition-all',
                        color === c && 'ring-2 ring-offset-2 ring-offset-card ring-foreground'
                      )}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div>
                <label className="block text-sm text-muted-foreground mb-2">Prévia</label>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50">
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${color}20` }}
                  >
                    {(() => {
                      const PreviewIcon = getIconByName(icon);
                      return <PreviewIcon size={24} style={{ color }} />;
                    })()}
                  </div>
                  <span className="font-medium">{name || 'Nome da categoria'}</span>
                </div>
              </div>

              {/* Save Button */}
              <button
                onClick={handleSave}
                disabled={!name.trim()}
                className={cn(
                  'w-full py-4 rounded-xl font-semibold text-white transition-all touch-scale flex items-center justify-center gap-2',
                  name.trim()
                    ? 'gradient-balance shadow-glow-accent'
                    : 'bg-muted text-muted-foreground cursor-not-allowed'
                )}
              >
                <Check size={20} />
                {editingCategory ? 'Salvar Alterações' : 'Criar Categoria'}
              </button>
            </div>

            <div className="h-8" />
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!categoryToDelete} onOpenChange={(open) => !open && setCategoryToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir categoria?</AlertDialogTitle>
            <AlertDialogDescription>
              {categoryToDelete && getTransactionCount(categoryToDelete.id) > 0 ? (
                <>
                  Esta categoria possui <strong>{getTransactionCount(categoryToDelete.id)}</strong> transações vinculadas. 
                  As transações serão mantidas, mas ficarão sem categoria.
                </>
              ) : (
                'Esta ação não pode ser desfeita.'
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
