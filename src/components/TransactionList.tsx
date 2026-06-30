import { useState } from 'react';
import { useEffectiveFinance } from '@/hooks/useEffectiveFinance';
import { parseISO, format, isAfter, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { getIconByName } from '@/lib/icons';
import { Trash2, ChevronRight, Pencil } from 'lucide-react';
import { Transaction } from '@/hooks/useSupabaseFinance';
import { useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import { EditTransactionModal } from './EditTransactionModal';

interface TransactionItemProps {
  transaction: Transaction;
  showActions?: boolean;
  onEdit?: (transaction: Transaction) => void;
}

export function TransactionItem({ transaction, showActions = false, onEdit }: TransactionItemProps) {
  const { getCategoryById, formatCurrency, deleteTransaction } = useEffectiveFinance();
  const category = getCategoryById(transaction.category_id);
  
  const IconComponent = getIconByName(category?.icon || 'Circle');
  const isIncome = transaction.type === 'income';

  const handleDelete = async () => {
    if (typeof window !== 'undefined' && !window.confirm('Excluir esta transação?')) return;
    await deleteTransaction(transaction.id);
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl bg-secondary/50 touch-scale transaction-item group",
        onEdit && "cursor-pointer"
      )}
      onClick={() => onEdit?.(transaction)}
    >
      <div 
        className={cn(
          'w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 group-hover:scale-110',
          isIncome ? 'bg-success/15' : 'bg-destructive/15'
        )}
        style={{ 
          backgroundColor: `${category?.color}15`,
          boxShadow: `0 4px 12px -4px ${category?.color}40`
        }}
      >
        <IconComponent 
          size={20} 
          style={{ color: category?.color }}
          className="transition-transform group-hover:scale-110"
        />
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground truncate">
          {transaction.description || category?.name || 'Transação'}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          <span className={cn(
            'inline-block px-1.5 py-0.5 rounded text-xs mr-1.5',
            isIncome ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
          )}>
            {category?.name}
          </span>
          {format(parseISO(transaction.date), "d 'de' MMM", { locale: ptBR })}
        </p>
      </div>
      
      <div className="flex items-center gap-2">
        <span className={cn(
          'font-mono font-semibold text-sm',
          isIncome ? 'text-income' : 'text-expense'
        )}>
          {isIncome ? '+' : '-'}{formatCurrency(Number(transaction.amount))}
        </span>
        
        {showActions && (
          <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => { e.stopPropagation(); onEdit?.(transaction); }}
              className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all duration-200 touch-scale"
              aria-label="Editar transação"
            >
              <Pencil size={15} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleDelete(); }}
              className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all duration-200 touch-scale"
              aria-label="Excluir transação"
            >
              <Trash2 size={15} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

interface TransactionListProps {
  compact?: boolean;
}

export function TransactionList({ compact = false }: TransactionListProps) {
  const { recentTransactions, isLoading, isFamily } = useEffectiveFinance();
  const navigate = useNavigate();
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const displayTransactions = useMemo(() => {
    if (!compact) return recentTransactions;
    const sevenDaysAgo = subDays(new Date(), 7);
    const weekTransactions = recentTransactions.filter(t =>
      isAfter(parseISO(t.date), sevenDaysAgo)
    );
    return weekTransactions.slice(0, 5);
  }, [recentTransactions, compact]);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="p-3 rounded-xl bg-secondary/50 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-secondary rounded w-3/4" />
                <div className="h-3 bg-secondary rounded w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (displayTransactions.length === 0) {
    return (
      <div className="card-finance text-center py-8">
        <p className="text-muted-foreground">
          {isFamily ? 'Nenhuma transação compartilhada' : 'Nenhuma transação ainda'}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          {isFamily ? 'Compartilhe transações para ver aqui' : 'Toque no botão + para adicionar'}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {displayTransactions.map(transaction => (
          <TransactionItem 
            key={transaction.id} 
            transaction={transaction}
            showActions={!compact}
            onEdit={setEditingTransaction}
          />
        ))}

        {compact && recentTransactions.length > displayTransactions.length && (
          <button
            onClick={() => navigate('/history')}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary/10 text-primary text-sm font-medium hover:bg-primary/15 transition-colors"
          >
            Ver mês completo
            <ChevronRight size={16} />
          </button>
        )}
      </div>

      <EditTransactionModal
        transaction={editingTransaction}
        isOpen={!!editingTransaction}
        onClose={() => setEditingTransaction(null)}
      />
    </>
  );
}
