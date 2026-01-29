import { useState } from 'react';
import { useFinanceContext } from '@/contexts/FinanceContext';
import { Plus, Trash2, X, Check } from 'lucide-react';
import { getIconByName } from '@/lib/icons';
import { cn } from '@/lib/utils';
import { TransactionType, Category } from '@/types/finance';

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
  const { categories, addCategory, updateCategory, deleteCategory } = useFinanceContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [activeType, setActiveType] = useState<TransactionType>('expense');

  // Modal state
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('Circle');
  const [color, setColor] = useState('#10B981');
  const [type, setType] = useState<TransactionType>('expense');

  const filteredCategories = categories.filter(c => c.type === activeType);

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

  const handleSave = () => {
    if (!name.trim()) return;

    if (editingCategory) {
      updateCategory(editingCategory.id, { name, icon, color, type });
    } else {
      addCategory({ name, icon, color, type });
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta categoria?')) {
      deleteCategory(id);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24 safe-top">
      {/* Header */}
      <header className="px-4 pt-6 pb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Categorias</h1>
        <button
          onClick={openAddModal}
          className="p-2 rounded-full bg-accent text-accent-foreground touch-scale"
        >
          <Plus size={20} />
        </button>
      </header>

      <main className="px-4 space-y-6">
        {/* Type Tabs */}
        <div className="flex gap-2 p-1 bg-secondary rounded-xl">
          <button
            onClick={() => setActiveType('expense')}
            className={cn(
              'flex-1 py-2 rounded-lg font-medium transition-all text-sm',
              activeType === 'expense' 
                ? 'bg-destructive text-destructive-foreground' 
                : 'text-muted-foreground'
            )}
          >
            Saídas
          </button>
          <button
            onClick={() => setActiveType('income')}
            className={cn(
              'flex-1 py-2 rounded-lg font-medium transition-all text-sm',
              activeType === 'income' 
                ? 'bg-success text-success-foreground' 
                : 'text-muted-foreground'
            )}
          >
            Entradas
          </button>
        </div>

        {/* Categories List */}
        <div className="space-y-2">
          {filteredCategories.map(category => {
            const IconComponent = getIconByName(category.icon);
            return (
              <div 
                key={category.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border touch-scale"
                onClick={() => openEditModal(category)}
              >
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${category.color}20` }}
                >
                  <IconComponent size={24} style={{ color: category.color }} />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{category.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {category.type === 'income' ? 'Entrada' : 'Saída'}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(category.id);
                  }}
                  className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            );
          })}
        </div>
      </main>

      {/* Modal */}
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
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm text-muted-foreground mb-2">Tipo</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setType('expense')}
                    className={cn(
                      'flex-1 py-2 rounded-lg font-medium transition-all text-sm',
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
                      'flex-1 py-2 rounded-lg font-medium transition-all text-sm',
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
                        color === c && 'ring-2 ring-offset-2 ring-offset-card ring-white'
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
                Salvar
              </button>
            </div>

            <div className="h-8" />
          </div>
        </div>
      )}
    </div>
  );
}
