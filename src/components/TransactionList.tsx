import { useFinanceContext } from '@/contexts/FinanceContext';
import { parseISO, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { getIconByName } from '@/lib/icons';
import { Trash2 } from 'lucide-react';
import { Transaction } from '@/types/finance';

interface TransactionItemProps {
  transaction: Transaction;
  showDelete?: boolean;
}

export function TransactionItem({ transaction, showDelete = false }: TransactionItemProps) {
  const { getCategoryById, formatCurrency, deleteTransaction } = useFinanceContext();
  const category = getCategoryById(transaction.categoryId);
  
  const IconComponent = getIconByName(category?.icon || 'Circle');
  const isIncome = transaction.type === 'income';

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
          {transaction.description || category?.name}
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
          {isIncome ? '+' : '-'}{formatCurrency(transaction.amount)}
        </span>
        
        {showDelete && (
          <button
            onClick={() => deleteTransaction(transaction.id)}
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
  const { recentTransactions } = useFinanceContext();

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
