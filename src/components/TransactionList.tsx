import { useFinanceContext } from '@/contexts/FinanceContext';
import { parseISO, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { getIconByName } from '@/lib/icons';
import { Trash2 } from 'lucide-react';
import { Transaction } from '@/hooks/useSupabaseFinance';

interface TransactionItemProps {
  transaction: Transaction;
  showDelete?: boolean;
}

export function TransactionItem({ transaction, showDelete = false }: TransactionItemProps) {
  const { getCategoryById, formatCurrency, deleteTransaction } = useFinanceContext();
  const category = getCategoryById(transaction.category_id);
  
  const IconComponent = getIconByName(category?.icon || 'Circle');
  const isIncome = transaction.type === 'income';

  const handleDelete = async () => {
    await deleteTransaction(transaction.id);
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50 touch-scale">
      <div 
        className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center',
          isIncome ? 'bg-success/20' : 'bg-destructive/20'
        )}
        style={{ backgroundColor: `${category?.color}20` }}
      >
        <IconComponent 
          size={20} 
          style={{ color: category?.color }}
        />
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground truncate">
          {transaction.description || category?.name || 'Transação'}
        </p>
        <p className="text-xs text-muted-foreground">
          {category?.name} • {format(parseISO(transaction.date), "d 'de' MMM", { locale: ptBR })}
        </p>
      </div>
      
      <div className="flex items-center gap-2">
        <span className={cn(
          'font-mono font-semibold',
          isIncome ? 'text-income' : 'text-expense'
        )}>
          {isIncome ? '+' : '-'}{formatCurrency(Number(transaction.amount))}
        </span>
        
        {showDelete && (
          <button
            onClick={handleDelete}
            className="p-2 text-muted-foreground hover:text-destructive transition-colors touch-scale"
            aria-label="Excluir transação"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

export function TransactionList() {
  const { recentTransactions, isLoading } = useFinanceContext();

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

  if (recentTransactions.length === 0) {
    return (
      <div className="card-finance text-center py-8">
        <p className="text-muted-foreground">Nenhuma transação ainda</p>
        <p className="text-sm text-muted-foreground mt-1">
          Toque no botão + para adicionar
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {recentTransactions.map(transaction => (
        <TransactionItem 
          key={transaction.id} 
          transaction={transaction}
          showDelete
        />
      ))}
    </div>
  );
}
