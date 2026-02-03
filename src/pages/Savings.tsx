import { useState, useEffect } from 'react';
import { useFinanceContext } from '@/contexts/FinanceContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useConfetti } from '@/hooks/useConfetti';
import { useCdiYield, cdiPercentageToAnnualRate, annualRateToCdiPercentage, estimateFutureBalance } from '@/hooks/useCdiYield';
import { YieldChart } from '@/components/YieldChart';
import { ConsolidatedYieldChart } from '@/components/ConsolidatedYieldChart';
import { Slider } from '@/components/ui/slider';
import { 
  PiggyBank, 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Check,
  Trash2,
  X,
  TrendingUp,
  Wallet,
  Settings2,
  Info,
  Calendar,
  Edit3,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Color options for piggy banks
const COLOR_OPTIONS = [
  '#10B981', // Emerald
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#EC4899', // Pink
  '#14B8A6', // Teal
  '#F97316', // Orange
];

export default function SavingsPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const {
    piggyBanks,
    piggyBankTransactions,
    formatCurrency,
    createPiggyBank,
    updatePiggyBank,
    updatePiggyBankCdiRate,
    depositToPiggyBank,
    withdrawFromPiggyBank,
    deletePiggyBank,
    deletePiggyBankTransaction,
    isLoading,
  } = useFinanceContext();

  const { fireSuccess, fireGoalComplete } = useConfetti();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPiggyId, setSelectedPiggyId] = useState<string | null>(null);
  const [showTransactionModal, setShowTransactionModal] = useState<{ piggyId: string; type: 'deposit' | 'withdraw' } | null>(null);
  const [showEditModal, setShowEditModal] = useState<string | null>(null);

  const handleDeposit = async (piggyId: string, amount: number, description?: string) => {
    const piggy = piggyBanks.find(p => p.id === piggyId);
    if (!piggy) return;
    
    const targetAmount = Number(piggy.target_amount) || 0;
    const currentBalance = Number(piggy.balance) || 0;
    const willComplete = targetAmount > 0 && (currentBalance + amount) >= targetAmount;
    
    await depositToPiggyBank(piggyId, amount, description);
    
    if (willComplete) {
      fireGoalComplete();
    } else {
      fireSuccess();
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background pb-24 safe-top flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <PiggyBank size={64} className="mx-auto text-muted-foreground" />
          <h2 className="text-xl font-semibold">Faça login para acessar</h2>
          <p className="text-muted-foreground">
            Crie uma conta para gerenciar seus cofrinhos.
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
          <h1 className="text-2xl font-bold">Cofrinhos</h1>
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

  const activePiggyBanks = piggyBanks.filter(p => !p.is_completed);
  const completedPiggyBanks = piggyBanks.filter(p => p.is_completed);

  return (
    <div className="min-h-screen bg-background pb-24 safe-top">
      {/* Header */}
      <header className="px-4 pt-6 pb-4">
        <h1 className="text-2xl font-bold">Cofrinhos</h1>
        <p className="text-muted-foreground text-sm">Seus objetivos financeiros com rendimento CDI</p>
      </header>

      <main className="px-4 space-y-4">
        {/* Consolidated Chart */}
        <ConsolidatedYieldChart 
          piggyBanks={piggyBanks.map(p => ({
            id: p.id,
            name: p.name,
            balance: Number(p.balance),
            principal_amount: Number(p.principal_amount),
            cdi_rate_annual: Number(p.cdi_rate_annual),
            yield_start_date: p.yield_start_date,
            created_at: p.created_at,
            color: p.color,
          }))}
          formatCurrency={formatCurrency}
        />

        {/* Add Piggy Bank Button */}
        <button
          onClick={() => setShowCreateModal(true)}
          className="w-full card-finance flex items-center justify-center gap-2 py-4 border-2 border-dashed border-muted-foreground/30 hover:border-accent transition-all touch-scale"
        >
          <Plus size={20} className="text-accent" />
          <span className="font-medium">Novo Cofrinho</span>
        </button>

        {/* Active Piggy Banks */}
        {activePiggyBanks.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Em andamento</h3>
            {activePiggyBanks.map(piggy => (
              <PiggyBankCard
                key={piggy.id}
                piggy={piggy}
                formatCurrency={formatCurrency}
                isExpanded={selectedPiggyId === piggy.id}
                onToggleExpand={() => setSelectedPiggyId(selectedPiggyId === piggy.id ? null : piggy.id)}
                onDeposit={() => setShowTransactionModal({ piggyId: piggy.id, type: 'deposit' })}
                onWithdraw={() => setShowTransactionModal({ piggyId: piggy.id, type: 'withdraw' })}
                onEdit={() => setShowEditModal(piggy.id)}
                onDelete={() => deletePiggyBank(piggy.id)}
                transactions={piggyBankTransactions.filter(t => t.piggy_bank_id === piggy.id)}
                onDeleteTransaction={deletePiggyBankTransaction}
              />
            ))}
          </div>
        )}

        {/* Completed Piggy Banks */}
        {completedPiggyBanks.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Concluídos 🎉</h3>
            {completedPiggyBanks.map(piggy => (
              <div key={piggy.id} className="card-finance opacity-70">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: `${piggy.color}20` }}
                    >
                      <Check size={20} style={{ color: piggy.color }} />
                    </div>
                    <div>
                      <p className="font-semibold">{piggy.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(Number(piggy.balance))}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => deletePiggyBank(piggy.id)}
                    className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activePiggyBanks.length === 0 && completedPiggyBanks.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <PiggyBank size={48} className="mx-auto mb-3 opacity-50" />
            <p>Nenhum cofrinho criado ainda</p>
            <p className="text-sm">Crie seu primeiro cofrinho!</p>
          </div>
        )}
      </main>

      {/* Create Modal */}
      <CreatePiggyBankModal 
        isOpen={showCreateModal} 
        onClose={() => setShowCreateModal(false)}
        onSubmit={createPiggyBank}
      />

      {/* Edit Modal */}
      <EditPiggyBankModal
        isOpen={!!showEditModal}
        piggy={piggyBanks.find(p => p.id === showEditModal) || null}
        onClose={() => setShowEditModal(null)}
        onSave={(id, updates) => {
          updatePiggyBank(id, updates);
          if (updates.cdi_rate_annual !== undefined) {
            updatePiggyBankCdiRate(id, updates.cdi_rate_annual);
          }
          setShowEditModal(null);
        }}
      />

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={!!showTransactionModal}
        type={showTransactionModal?.type || 'deposit'}
        piggy={piggyBanks.find(p => p.id === showTransactionModal?.piggyId) || null}
        onClose={() => setShowTransactionModal(null)}
        onDeposit={handleDeposit}
        onWithdraw={withdrawFromPiggyBank}
        formatCurrency={formatCurrency}
      />
    </div>
  );
}

// Piggy Bank Card Component
interface PiggyBankCardProps {
  piggy: {
    id: string;
    name: string;
    balance: number;
    principal_amount: number;
    target_amount: number | null;
    color: string;
    icon: string;
    cdi_rate_annual: number;
    yield_start_date: string | null;
    created_at: string;
  };
  formatCurrency: (amount: number) => string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onDeposit: () => void;
  onWithdraw: () => void;
  onEdit: () => void;
  onDelete: () => void;
  transactions: Array<{
    id: string;
    type: 'deposit' | 'withdraw';
    amount: number;
    created_at: string;
  }>;
  onDeleteTransaction: (id: string) => void;
}

function PiggyBankCard({
  piggy,
  formatCurrency,
  isExpanded,
  onToggleExpand,
  onDeposit,
  onWithdraw,
  onEdit,
  onDelete,
  transactions,
  onDeleteTransaction
}: PiggyBankCardProps) {
  const principal = Number(piggy.principal_amount) || 0;
  const startDate = piggy.yield_start_date || piggy.created_at;
  const annualRate = Number(piggy.cdi_rate_annual) || 14.15;
  const targetAmount = Number(piggy.target_amount) || 0;
  
  const yieldCalc = useCdiYield(principal, startDate, annualRate);
  
  // Calculate progress if has target
  const hasTarget = targetAmount > 0;
  const progressWithYield = hasTarget ? (yieldCalc.updatedBalance / targetAmount) * 100 : 0;
  const progressWithoutYield = hasTarget ? (principal / targetAmount) * 100 : 0;
  
  // Calculate projections
  const balance6Months = estimateFutureBalance(yieldCalc.updatedBalance, annualRate, 180);
  const balance12Months = estimateFutureBalance(yieldCalc.updatedBalance, annualRate, 365);
  
  return (
    <div className="card-finance">
      {/* Header */}
      <div 
        className="flex items-start justify-between cursor-pointer"
        onClick={onToggleExpand}
      >
        <div className="flex items-center gap-3">
          <div 
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${piggy.color}20` }}
          >
            <PiggyBank size={24} style={{ color: piggy.color }} />
          </div>
          <div>
            <p className="font-semibold">{piggy.name}</p>
            <p className="font-mono text-lg font-bold text-foreground">
              {formatCurrency(yieldCalc.updatedBalance)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="p-2 text-muted-foreground hover:text-accent transition-colors"
          >
            <Edit3 size={16} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-2 text-muted-foreground hover:text-destructive transition-colors"
          >
            <Trash2 size={16} />
          </button>
          {isExpanded ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
        </div>
      </div>
      
      {/* Progress bar if has target */}
      {hasTarget && (
        <div className="mt-3 space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Progresso</span>
            <span className="font-mono">{Math.min(progressWithYield, 100).toFixed(0)}% de {formatCurrency(targetAmount)}</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden relative">
            <div 
              className="h-full rounded-full transition-all duration-500 absolute left-0 top-0"
              style={{ 
                width: `${Math.min(progressWithoutYield, 100)}%`,
                backgroundColor: piggy.color 
              }}
            />
            {yieldCalc.totalYield > 0.01 && (
              <div 
                className="h-full rounded-r-full transition-all duration-500 absolute top-0 opacity-50"
                style={{ 
                  left: `${Math.min(progressWithoutYield, 100)}%`,
                  width: `${Math.min(progressWithYield - progressWithoutYield, 100 - progressWithoutYield)}%`,
                  backgroundColor: piggy.color 
                }}
              />
            )}
          </div>
        </div>
      )}
      
      {/* Yield info badge */}
      <div className="flex items-center justify-between mt-3 py-1.5 px-3 bg-income/10 rounded-lg">
        <div className="flex items-center gap-2">
          <TrendingUp size={12} className="text-income" />
          <span className="text-xs text-income font-medium">
            +{formatCurrency(yieldCalc.totalYield)} rendido
          </span>
        </div>
        <span className="text-xs text-income">
          {annualRateToCdiPercentage(annualRate).toFixed(0)}% CDI
        </span>
      </div>
      
      {/* Expanded content */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-border space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-secondary/50 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <Wallet size={14} className="text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Aportado</span>
              </div>
              <p className="font-mono font-semibold">{formatCurrency(principal)}</p>
            </div>
            <div className="bg-secondary/50 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <Calendar size={14} className="text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Dias</span>
              </div>
              <p className="font-mono font-semibold">{yieldCalc.daysInvested}</p>
            </div>
          </div>
          
          {/* Projections */}
          {yieldCalc.updatedBalance > 0 && (
            <div className="bg-accent/10 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={16} className="text-accent" />
                <span className="text-sm font-medium text-accent">Projeção de Rendimentos</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Em 6 meses</p>
                  <p className="font-mono font-semibold text-foreground">{formatCurrency(balance6Months)}</p>
                  <p className="text-xs text-income">+{formatCurrency(balance6Months - yieldCalc.updatedBalance)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Em 12 meses</p>
                  <p className="font-mono font-semibold text-foreground">{formatCurrency(balance12Months)}</p>
                  <p className="text-xs text-income">+{formatCurrency(balance12Months - yieldCalc.updatedBalance)}</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Actions */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onDeposit}
              className="flex items-center justify-center gap-2 py-3 rounded-xl bg-success/10 hover:bg-success/20 transition-all touch-scale"
            >
              <ArrowDownLeft size={18} className="text-success" />
              <span className="font-medium text-success text-sm">Depositar</span>
            </button>
            <button
              onClick={onWithdraw}
              disabled={yieldCalc.updatedBalance === 0}
              className={cn(
                "flex items-center justify-center gap-2 py-3 rounded-xl transition-all touch-scale",
                yieldCalc.updatedBalance > 0
                  ? "bg-destructive/10 hover:bg-destructive/20"
                  : "opacity-50 cursor-not-allowed bg-secondary"
              )}
            >
              <ArrowUpRight size={18} className="text-destructive" />
              <span className="font-medium text-destructive text-sm">Retirar</span>
            </button>
          </div>
          
          {/* Yield Chart */}
          {principal > 0 && (
            <YieldChart 
              principal={principal}
              startDate={startDate}
              annualRate={annualRate}
              formatCurrency={formatCurrency}
            />
          )}
          
          {/* Recent transactions */}
          {transactions.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-muted-foreground">Últimas movimentações</h4>
              {transactions.slice(0, 5).map(tx => (
                <div key={tx.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/30">
                  <div className="flex items-center gap-2">
                    {tx.type === 'deposit' ? (
                      <ArrowDownLeft size={14} className="text-success" />
                    ) : (
                      <ArrowUpRight size={14} className="text-destructive" />
                    )}
                    <span className="text-xs text-muted-foreground">
                      {format(parseISO(tx.created_at), "d/MM", { locale: ptBR })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'font-mono text-sm font-medium',
                      tx.type === 'deposit' ? 'text-success' : 'text-destructive'
                    )}>
                      {tx.type === 'deposit' ? '+' : '-'}{formatCurrency(Number(tx.amount))}
                    </span>
                    <button
                      onClick={() => onDeleteTransaction(tx.id)}
                      className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Create Piggy Bank Modal
function CreatePiggyBankModal({ 
  isOpen, 
  onClose, 
  onSubmit 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSubmit: (data: { name: string; target_amount?: number | null; cdi_rate_annual?: number; color?: string }) => Promise<any>;
}) {
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [cdiPercentage, setCdiPercentage] = useState(100);
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setName('');
    setTargetAmount('');
    setCdiPercentage(100);
    setSelectedColor(COLOR_OPTIONS[0]);
  };

  const handleSubmit = async () => {
    if (!name.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        target_amount: targetAmount ? parseFloat(targetAmount) : null,
        cdi_rate_annual: cdiPercentageToAnnualRate(cdiPercentage),
        color: selectedColor,
      });
      
      resetForm();
      onClose();
    } catch (error) {
      console.error('Error creating piggy bank:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      <div className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl animate-slide-up max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card z-10">
          <h2 className="text-lg font-semibold">Novo Cofrinho</h2>
          <button onClick={handleClose} className="p-2 rounded-full hover:bg-secondary">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm text-muted-foreground mb-2">Nome do cofrinho</label>
            <input
              type="text"
              placeholder="Ex: Viagem, Reserva de emergência"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-finance"
              maxLength={50}
            />
          </div>

          <div>
            <label className="block text-sm text-muted-foreground mb-2">Cor</label>
            <div className="flex gap-2 flex-wrap">
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={cn(
                    "w-10 h-10 rounded-xl transition-all touch-scale",
                    selectedColor === color && "ring-2 ring-offset-2 ring-offset-background ring-accent"
                  )}
                  style={{ backgroundColor: color }}
                >
                  {selectedColor === color && (
                    <Check size={16} className="text-white mx-auto" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-muted-foreground mb-2">Meta (opcional)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
              <input
                type="number"
                inputMode="decimal"
                placeholder="0,00"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                className="input-finance pl-12"
                min="0"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Deixe vazio para um cofrinho sem meta</p>
          </div>

          <div>
            <label className="block text-sm text-muted-foreground mb-2">% do CDI do seu banco</label>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Percentual</span>
                <span className="font-mono font-semibold text-accent">{cdiPercentage}% do CDI</span>
              </div>
              <Slider
                value={[cdiPercentage]}
                onValueChange={(value) => setCdiPercentage(value[0])}
                min={80}
                max={130}
                step={1}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>80%</span>
                <span>100%</span>
                <span>130%</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!name.trim() || isSubmitting}
            className={cn(
              'w-full py-4 rounded-xl font-semibold text-white transition-all touch-scale',
              name.trim() && !isSubmitting
                ? 'gradient-income shadow-glow-income'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            )}
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
            ) : (
              'Criar Cofrinho'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Edit Piggy Bank Modal
function EditPiggyBankModal({ 
  isOpen, 
  piggy,
  onClose, 
  onSave
}: { 
  isOpen: boolean;
  piggy: { id: string; name: string; target_amount: number | null; cdi_rate_annual: number; color: string } | null;
  onClose: () => void;
  onSave: (id: string, updates: { name?: string; target_amount?: number | null; cdi_rate_annual?: number; color?: string }) => void;
}) {
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [cdiPercentage, setCdiPercentage] = useState(100);
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]);

  // Initialize form when piggy changes
  useEffect(() => {
    if (piggy) {
      setName(piggy.name);
      setTargetAmount(piggy.target_amount ? String(piggy.target_amount) : '');
      setCdiPercentage(Math.round(annualRateToCdiPercentage(Number(piggy.cdi_rate_annual) || 14.15)));
      setSelectedColor(piggy.color || COLOR_OPTIONS[0]);
    }
  }, [piggy]);

  if (!isOpen || !piggy) return null;

  const handleSave = () => {
    if (!name.trim()) return;
    
    onSave(piggy.id, {
      name: name.trim(),
      target_amount: targetAmount ? parseFloat(targetAmount) : null,
      cdi_rate_annual: cdiPercentageToAnnualRate(cdiPercentage),
      color: selectedColor,
    });
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl animate-slide-up max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card z-10">
          <h2 className="text-lg font-semibold">Editar Cofrinho</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-secondary">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm text-muted-foreground mb-2">Nome do cofrinho</label>
            <input
              type="text"
              placeholder="Ex: Viagem, Reserva de emergência"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-finance"
              maxLength={50}
            />
          </div>

          <div>
            <label className="block text-sm text-muted-foreground mb-2">Cor</label>
            <div className="flex gap-2 flex-wrap">
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={cn(
                    "w-10 h-10 rounded-xl transition-all touch-scale",
                    selectedColor === color && "ring-2 ring-offset-2 ring-offset-background ring-accent"
                  )}
                  style={{ backgroundColor: color }}
                >
                  {selectedColor === color && (
                    <Check size={16} className="text-white mx-auto" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-muted-foreground mb-2">Meta (opcional)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
              <input
                type="number"
                inputMode="decimal"
                placeholder="0,00"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                className="input-finance pl-12"
                min="0"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-muted-foreground mb-2">% do CDI do seu banco</label>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Percentual</span>
                <span className="font-mono font-semibold text-accent">{cdiPercentage}% do CDI</span>
              </div>
              <Slider
                value={[cdiPercentage]}
                onValueChange={(value) => setCdiPercentage(value[0])}
                min={80}
                max={130}
                step={1}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>80%</span>
                <span>100%</span>
                <span>130%</span>
              </div>
            </div>
            <div className="flex items-start gap-2 mt-2 p-2 bg-accent/10 rounded-lg">
              <Info size={14} className="text-accent mt-0.5" />
              <p className="text-xs text-accent">
                A maioria dos bancos paga entre 100% e 110% do CDI. Alguns bancos digitais pagam até 120%.
              </p>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className={cn(
              'w-full py-4 rounded-xl font-semibold text-white transition-all touch-scale',
              name.trim()
                ? 'gradient-income shadow-glow-income'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            )}
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

// Transaction Modal
function TransactionModal({ 
  isOpen, 
  type,
  piggy,
  onClose, 
  onDeposit,
  onWithdraw,
  formatCurrency
}: { 
  isOpen: boolean;
  type: 'deposit' | 'withdraw';
  piggy: { id: string; name: string; balance: number; principal_amount: number } | null;
  onClose: () => void;
  onDeposit: (piggyId: string, amount: number, description?: string) => Promise<void>;
  onWithdraw: (piggyId: string, amount: number, description?: string) => Promise<void>;
  formatCurrency: (amount: number) => string;
}) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setAmount('');
    setDescription('');
  };

  const handleSubmit = async () => {
    if (!amount || !piggy || isSubmitting) return;

    const numAmount = parseFloat(amount);
    if (numAmount <= 0) return;
    
    if (type === 'withdraw' && numAmount > Number(piggy.balance)) {
      return;
    }

    setIsSubmitting(true);
    try {
      if (type === 'deposit') {
        await onDeposit(piggy.id, numAmount, description.trim() || undefined);
      } else {
        await onWithdraw(piggy.id, numAmount, description.trim() || undefined);
      }
      
      resetForm();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen || !piggy) return null;

  const currentBalance = Number(piggy.balance);
  const isWithdraw = type === 'withdraw';
  const numAmount = parseFloat(amount) || 0;
  const exceedsBalance = isWithdraw && numAmount > currentBalance;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      <div className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl animate-slide-up">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">
            {isWithdraw ? 'Retirar de' : 'Depositar em'} {piggy.name}
          </h2>
          <button onClick={handleClose} className="p-2 rounded-full hover:bg-secondary">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4 space-y-4">
          {isWithdraw && (
            <div className="flex justify-between text-sm p-3 bg-secondary/50 rounded-lg">
              <span className="text-muted-foreground">Saldo disponível</span>
              <span className="font-mono font-semibold">{formatCurrency(currentBalance)}</span>
            </div>
          )}

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
                className={cn("input-finance pl-12", exceedsBalance && "border-destructive")}
                min="0"
              />
            </div>
            {exceedsBalance && (
              <p className="text-xs text-destructive mt-1">Valor maior que o saldo disponível</p>
            )}
          </div>

          <div>
            <label className="block text-sm text-muted-foreground mb-2">Descrição (opcional)</label>
            <input
              type="text"
              placeholder="Ex: Salário, Bônus"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-finance"
              maxLength={100}
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={!amount || numAmount <= 0 || exceedsBalance || isSubmitting}
            className={cn(
              'w-full py-4 rounded-xl font-semibold text-white transition-all touch-scale',
              amount && numAmount > 0 && !exceedsBalance && !isSubmitting
                ? isWithdraw ? 'bg-destructive' : 'gradient-income shadow-glow-income'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            )}
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
            ) : (
              isWithdraw ? 'Retirar' : 'Depositar'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
