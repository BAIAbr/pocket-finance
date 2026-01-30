import { useState } from 'react';
import { useFinanceContext } from '@/contexts/FinanceContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useConfetti } from '@/hooks/useConfetti';
import { 
  Target, 
  PiggyBank, 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Check,
  Trash2,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function SavingsPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const {
    savingsGoals,
    piggyBank,
    piggyBankTransactions,
    formatCurrency,
    addSavingsGoal,
    addToSavingsGoal,
    deleteSavingsGoal,
    depositToPiggyBank,
    withdrawFromPiggyBank,
    isLoading,
  } = useFinanceContext();

  const { fireSuccess, fireGoalComplete } = useConfetti();

  const [activeTab, setActiveTab] = useState<'goals' | 'piggy'>('goals');
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showPiggyModal, setShowPiggyModal] = useState(false);
  const [showAddToGoalModal, setShowAddToGoalModal] = useState<string | null>(null);

  // Wrapper functions with celebration
  const handleAddToGoal = async (goalId: string, amount: number) => {
    const goal = savingsGoals.find(g => g.id === goalId);
    if (!goal) return;
    
    const willComplete = (Number(goal.current_amount) + amount) >= Number(goal.target_amount);
    await addToSavingsGoal(goalId, amount);
    
    if (willComplete) {
      fireGoalComplete();
    } else {
      fireSuccess();
    }
  };

  const handleDeposit = async (amount: number, description?: string) => {
    await depositToPiggyBank(amount, description);
    fireSuccess();
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background pb-24 safe-top flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <PiggyBank size={64} className="mx-auto text-muted-foreground" />
          <h2 className="text-xl font-semibold">Faça login para acessar</h2>
          <p className="text-muted-foreground">
            Crie uma conta para gerenciar suas metas e cofrinho.
          </p>
          <button
            onClick={() => navigate('/auth')}
            className="px-6 py-3 rounded-xl gradient-balance text-white font-medium touch-scale"
          >
            Entrar ou criar conta
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-24 safe-top">
        <header className="px-4 pt-6 pb-4">
          <h1 className="text-2xl font-bold">Poupança</h1>
        </header>
        <main className="px-4">
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="card-finance animate-pulse">
                <div className="h-20 bg-secondary rounded-xl" />
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  const activeGoals = savingsGoals.filter(g => !g.is_completed);
  const completedGoals = savingsGoals.filter(g => g.is_completed);

  return (
    <div className="min-h-screen bg-background pb-24 safe-top">
      {/* Header */}
      <header className="px-4 pt-6 pb-4">
        <h1 className="text-2xl font-bold">Poupança</h1>
        <p className="text-muted-foreground text-sm">Gerencie suas metas e cofrinho</p>
      </header>

      <main className="px-4 space-y-6">
        {/* Tabs */}
        <div className="flex gap-2 p-1 bg-secondary rounded-xl">
          <button
            onClick={() => setActiveTab('goals')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-all',
              activeTab === 'goals' 
                ? 'bg-background shadow-md text-foreground' 
                : 'text-muted-foreground'
            )}
          >
            <Target size={18} />
            Metas
          </button>
          <button
            onClick={() => setActiveTab('piggy')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-all',
              activeTab === 'piggy' 
                ? 'bg-background shadow-md text-foreground' 
                : 'text-muted-foreground'
            )}
          >
            <PiggyBank size={18} />
            Cofrinho
          </button>
        </div>

        {activeTab === 'goals' ? (
          <div className="space-y-4">
            {/* Add Goal Button */}
            <button
              onClick={() => setShowGoalModal(true)}
              className="w-full card-finance flex items-center justify-center gap-2 py-4 border-2 border-dashed border-muted-foreground/30 hover:border-accent transition-all touch-scale"
            >
              <Plus size={20} className="text-accent" />
              <span className="font-medium">Nova Meta</span>
            </button>

            {/* Active Goals */}
            {activeGoals.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">Em andamento</h3>
                {activeGoals.map(goal => {
                  const progress = (Number(goal.current_amount) / Number(goal.target_amount)) * 100;
                  return (
                    <div key={goal.id} className="card-finance">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-12 h-12 rounded-xl flex items-center justify-center"
                            style={{ backgroundColor: `${goal.color}20` }}
                          >
                            <Target size={24} style={{ color: goal.color }} />
                          </div>
                          <div>
                            <p className="font-semibold">{goal.name}</p>
                            {goal.deadline && (
                              <p className="text-xs text-muted-foreground">
                                até {format(parseISO(goal.deadline), "d 'de' MMMM", { locale: ptBR })}
                              </p>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => deleteSavingsGoal(goal.id)}
                          className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Progresso</span>
                          <span className="font-mono font-medium">{progress.toFixed(0)}%</span>
                        </div>
                        <div className="h-3 bg-secondary rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-500"
                            style={{ 
                              width: `${Math.min(progress, 100)}%`,
                              backgroundColor: goal.color 
                            }}
                          />
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="font-mono text-muted-foreground">
                            {formatCurrency(Number(goal.current_amount))}
                          </span>
                          <span className="font-mono font-semibold">
                            {formatCurrency(Number(goal.target_amount))}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => setShowAddToGoalModal(goal.id)}
                        className="w-full mt-4 py-2 rounded-lg bg-secondary text-sm font-medium hover:bg-secondary/80 transition-all touch-scale"
                      >
                        + Adicionar valor
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Completed Goals */}
            {completedGoals.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">Concluídas 🎉</h3>
                {completedGoals.map(goal => (
                  <div key={goal.id} className="card-finance opacity-70">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
                          <Check size={20} className="text-success" />
                        </div>
                        <div>
                          <p className="font-semibold">{goal.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(Number(goal.target_amount))}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => deleteSavingsGoal(goal.id)}
                        className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeGoals.length === 0 && completedGoals.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Target size={48} className="mx-auto mb-3 opacity-50" />
                <p>Nenhuma meta criada ainda</p>
                <p className="text-sm">Crie sua primeira meta de economia!</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Piggy Bank Balance */}
            <div className="card-finance gradient-balance p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <PiggyBank size={24} className="text-white/80" />
                  <span className="text-white/80 text-sm font-medium">Cofrinho</span>
                </div>
                <p className="font-mono text-4xl font-bold text-white tracking-tight">
                  {formatCurrency(Number(piggyBank?.balance || 0))}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowPiggyModal(true)}
                className="card-finance flex items-center justify-center gap-2 py-4 bg-success/10 hover:bg-success/20 transition-all touch-scale"
              >
                <ArrowDownLeft size={20} className="text-success" />
                <span className="font-medium text-success">Depositar</span>
              </button>
              <button
                onClick={() => {
                  if (Number(piggyBank?.balance || 0) > 0) {
                    setShowPiggyModal(true);
                  }
                }}
                disabled={Number(piggyBank?.balance || 0) === 0}
                className={cn(
                  "card-finance flex items-center justify-center gap-2 py-4 transition-all touch-scale",
                  Number(piggyBank?.balance || 0) > 0
                    ? "bg-destructive/10 hover:bg-destructive/20"
                    : "opacity-50 cursor-not-allowed"
                )}
              >
                <ArrowUpRight size={20} className="text-destructive" />
                <span className="font-medium text-destructive">Retirar</span>
              </button>
            </div>

            {/* History */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">Histórico</h3>
              {piggyBankTransactions.length > 0 ? (
                <div className="space-y-2">
                  {piggyBankTransactions.slice(0, 10).map(tx => (
                    <div key={tx.id} className="flex items-center justify-between p-3 rounded-xl bg-secondary/50">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center',
                          tx.type === 'deposit' ? 'bg-success/20' : 'bg-destructive/20'
                        )}>
                          {tx.type === 'deposit' ? (
                            <ArrowDownLeft size={16} className="text-success" />
                          ) : (
                            <ArrowUpRight size={16} className="text-destructive" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {tx.type === 'deposit' ? 'Depósito' : 'Retirada'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(parseISO(tx.created_at), "d 'de' MMM, HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                      <span className={cn(
                        'font-mono font-semibold',
                        tx.type === 'deposit' ? 'text-success' : 'text-destructive'
                      )}>
                        {tx.type === 'deposit' ? '+' : ''}{formatCurrency(Number(tx.amount))}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <p className="text-sm">Nenhuma movimentação ainda</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* New Goal Modal */}
      <NewGoalModal 
        isOpen={showGoalModal} 
        onClose={() => setShowGoalModal(false)}
        onSubmit={addSavingsGoal}
      />

      {/* Add to Goal Modal */}
      <AddToGoalModal
        isOpen={!!showAddToGoalModal}
        goalId={showAddToGoalModal}
        onClose={() => setShowAddToGoalModal(null)}
        onSubmit={handleAddToGoal}
        formatCurrency={formatCurrency}
      />

      {/* Piggy Bank Modal */}
      <PiggyBankModal
        isOpen={showPiggyModal}
        onClose={() => setShowPiggyModal(false)}
        onDeposit={handleDeposit}
        onWithdraw={withdrawFromPiggyBank}
        currentBalance={Number(piggyBank?.balance || 0)}
        formatCurrency={formatCurrency}
      />
    </div>
  );
}

// New Goal Modal Component
function NewGoalModal({ 
  isOpen, 
  onClose, 
  onSubmit 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSubmit: (goal: { name: string; target_amount: number; deadline?: string }) => Promise<any>;
}) {
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name || !targetAmount || isSubmitting) return;

    setIsSubmitting(true);
    await onSubmit({
      name,
      target_amount: parseFloat(targetAmount),
      deadline: deadline || undefined,
    });
    
    setName('');
    setTargetAmount('');
    setDeadline('');
    setIsSubmitting(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl animate-slide-up max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">Nova Meta</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-secondary">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm text-muted-foreground mb-2">Nome da meta</label>
            <input
              type="text"
              placeholder="Ex: Viagem para Europa"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-finance"
            />
          </div>

          <div>
            <label className="block text-sm text-muted-foreground mb-2">Valor alvo</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
              <input
                type="number"
                inputMode="decimal"
                placeholder="0,00"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                className="input-finance pl-12"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-muted-foreground mb-2">Prazo (opcional)</label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="input-finance"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={!name || !targetAmount || isSubmitting}
            className={cn(
              'w-full py-4 rounded-xl font-semibold text-white transition-all touch-scale',
              name && targetAmount && !isSubmitting
                ? 'gradient-income shadow-glow-income'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            )}
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
            ) : (
              'Criar Meta'
            )}
          </button>
        </div>
        <div className="h-8" />
      </div>
    </div>
  );
}

// Add to Goal Modal Component
function AddToGoalModal({
  isOpen,
  goalId,
  onClose,
  onSubmit,
  formatCurrency,
}: {
  isOpen: boolean;
  goalId: string | null;
  onClose: () => void;
  onSubmit: (id: string, amount: number) => Promise<void>;
  formatCurrency: (amount: number) => string;
}) {
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!amount || !goalId || isSubmitting) return;

    setIsSubmitting(true);
    await onSubmit(goalId, parseFloat(amount));
    setAmount('');
    setIsSubmitting(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl animate-slide-up">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">Adicionar à Meta</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-secondary">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm text-muted-foreground mb-2">Valor</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
              <input
                type="number"
                inputMode="decimal"
                placeholder="0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="input-finance pl-12"
              />
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!amount || isSubmitting}
            className={cn(
              'w-full py-4 rounded-xl font-semibold text-white transition-all touch-scale',
              amount && !isSubmitting
                ? 'gradient-income shadow-glow-income'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            )}
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
            ) : (
              'Adicionar'
            )}
          </button>
        </div>
        <div className="h-8" />
      </div>
    </div>
  );
}

// Piggy Bank Modal Component
function PiggyBankModal({
  isOpen,
  onClose,
  onDeposit,
  onWithdraw,
  currentBalance,
  formatCurrency,
}: {
  isOpen: boolean;
  onClose: () => void;
  onDeposit: (amount: number, description?: string) => Promise<void>;
  onWithdraw: (amount: number, description?: string) => Promise<void>;
  currentBalance: number;
  formatCurrency: (amount: number) => string;
}) {
  const [type, setType] = useState<'deposit' | 'withdraw'>('deposit');
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!amount || isSubmitting) return;

    setIsSubmitting(true);
    if (type === 'deposit') {
      await onDeposit(parseFloat(amount));
    } else {
      await onWithdraw(parseFloat(amount));
    }
    setAmount('');
    setIsSubmitting(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl animate-slide-up">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">Cofrinho</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-secondary">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4 space-y-4">
          <p className="text-center text-sm text-muted-foreground">
            Saldo atual: <span className="font-mono font-semibold text-foreground">{formatCurrency(currentBalance)}</span>
          </p>

          {/* Type Toggle */}
          <div className="flex gap-2 p-1 bg-secondary rounded-xl">
            <button
              onClick={() => setType('deposit')}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-all',
                type === 'deposit' 
                  ? 'gradient-income text-white' 
                  : 'text-muted-foreground'
              )}
            >
              <ArrowDownLeft size={18} />
              Depositar
            </button>
            <button
              onClick={() => setType('withdraw')}
              disabled={currentBalance === 0}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-all',
                type === 'withdraw' 
                  ? 'gradient-expense text-white' 
                  : 'text-muted-foreground',
                currentBalance === 0 && 'opacity-50 cursor-not-allowed'
              )}
            >
              <ArrowUpRight size={18} />
              Retirar
            </button>
          </div>

          <div>
            <label className="block text-sm text-muted-foreground mb-2">Valor</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
              <input
                type="number"
                inputMode="decimal"
                placeholder="0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                max={type === 'withdraw' ? currentBalance : undefined}
                className="input-finance pl-12"
              />
            </div>
            {type === 'withdraw' && (
              <p className="text-xs text-muted-foreground mt-1">
                Máximo: {formatCurrency(currentBalance)}
              </p>
            )}
          </div>

          <button
            onClick={handleSubmit}
            disabled={!amount || isSubmitting || (type === 'withdraw' && parseFloat(amount) > currentBalance)}
            className={cn(
              'w-full py-4 rounded-xl font-semibold text-white transition-all touch-scale',
              amount && !isSubmitting && !(type === 'withdraw' && parseFloat(amount) > currentBalance)
                ? type === 'deposit' ? 'gradient-income shadow-glow-income' : 'gradient-expense shadow-glow-expense'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            )}
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
            ) : (
              type === 'deposit' ? 'Depositar' : 'Retirar'
            )}
          </button>
        </div>
        <div className="h-8" />
      </div>
    </div>
  );
}
