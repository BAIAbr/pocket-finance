import { useState } from 'react';
import { X, Check } from 'lucide-react';
import { getIconByName } from '@/lib/icons';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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

interface QuickCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (category: { name: string; icon: string; color: string; type: TransactionType }) => Promise<any>;
  defaultType?: TransactionType;
  defaultName?: string;
}

export function QuickCategoryModal({ 
  isOpen, 
  onClose, 
  onSave, 
  defaultType = 'expense',
  defaultName = ''
}: QuickCategoryModalProps) {
  const [name, setName] = useState(defaultName);
  const [icon, setIcon] = useState('Circle');
  const [color, setColor] = useState(defaultType === 'income' ? '#10B981' : '#F43F5E');
  const [type, setType] = useState<TransactionType>(defaultType);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || isSaving) return;
    
    setIsSaving(true);
    const result = await onSave({ name: name.trim(), icon, color, type });
    setIsSaving(false);
    
    if (result) {
      onClose();
      // Reset form
      setName('');
      setIcon('Circle');
      setColor('#F43F5E');
    }
  };

  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    setColor(newType === 'income' ? '#10B981' : '#F43F5E');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Categoria</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
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
                onClick={() => handleTypeChange('expense')}
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
                onClick={() => handleTypeChange('income')}
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
            <div className="grid grid-cols-7 gap-1.5">
              {availableIcons.map(iconName => {
                const IconComp = getIconByName(iconName);
                return (
                  <button
                    key={iconName}
                    onClick={() => setIcon(iconName)}
                    className={cn(
                      'w-9 h-9 rounded-lg flex items-center justify-center transition-all',
                      icon === iconName 
                        ? 'bg-accent ring-2 ring-accent' 
                        : 'bg-secondary hover:bg-secondary/80'
                    )}
                  >
                    <IconComp size={18} style={{ color: icon === iconName ? color : undefined }} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm text-muted-foreground mb-2">Cor</label>
            <div className="grid grid-cols-10 gap-1.5">
              {availableColors.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={cn(
                    'w-7 h-7 rounded-full transition-all',
                    color === c && 'ring-2 ring-offset-2 ring-offset-background ring-foreground'
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
                className="w-11 h-11 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${color}20` }}
              >
                {(() => {
                  const PreviewIcon = getIconByName(icon);
                  return <PreviewIcon size={22} style={{ color }} />;
                })()}
              </div>
              <span className="font-medium">{name || 'Nome da categoria'}</span>
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={!name.trim() || isSaving}
            className={cn(
              'w-full py-3.5 rounded-xl font-semibold text-primary-foreground transition-all touch-scale flex items-center justify-center gap-2',
              name.trim() && !isSaving
                ? 'gradient-balance shadow-glow-accent'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            )}
          >
            {isSaving ? (
              <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              <>
                <Check size={18} />
                Salvar Categoria
              </>
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
