import { useState } from 'react';
import { BalanceCard } from '@/components/BalanceCard';
import { TransactionList } from '@/components/TransactionList';
import { MiniChart } from '@/components/MiniChart';
import { FloatingActionButton } from '@/components/FloatingActionButton';
import { AddTransactionModal } from '@/components/AddTransactionModal';
import { StreakBanner } from '@/components/StreakBanner';
import { WeeklySummaryCard } from '@/components/WeeklySummaryCard';
import { useFinanceContext } from '@/contexts/FinanceContext';
import { useAuth } from '@/contexts/AuthContext';
import { useStreak } from '@/hooks/useStreak';
import { useWeeklySummary } from '@/hooks/useWeeklySummary';

export default function Dashboard() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { currentMonthStats, transactions, categories } = useFinanceContext();
  const { user } = useAuth();
  const { currentStreak, hasRegisteredToday, updateStreak, isLoading: streakLoading } = useStreak(user?.id ?? null);
  const weeklySummary = useWeeklySummary(transactions as any, categories as any, currentStreak);

  // When user adds a transaction, also update streak
  const handleOpenModal = () => setIsModalOpen(true);
  const handleCloseModal = () => {
    setIsModalOpen(false);
    // Refresh streak after adding a transaction
    updateStreak();
  };

  return (
    <div className="min-h-screen bg-background pb-28 safe-top">
      {/* Header with gradient background */}
      <header className="px-4 pt-6 pb-4 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
        <div className="relative">
          <p className="text-muted-foreground text-sm font-medium">Resumo financeiro</p>
          <h1 className="text-2xl font-bold capitalize bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
            {currentMonthStats.month}
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 space-y-5">
        {/* Streak Banner */}
        {!streakLoading && (
          <div className="animate-fade-in">
            <StreakBanner
              currentStreak={currentStreak}
              hasRegisteredToday={hasRegisteredToday}
              onRegisterClick={handleOpenModal}
            />
          </div>
        )}

        {/* Weekly Summary */}
        <div className="animate-fade-in">
          <WeeklySummaryCard
            totalSpent={weeklySummary.totalSpent}
            variationPercent={weeklySummary.variationPercent}
            topCategory={weeklySummary.topCategory}
            currentStreak={currentStreak}
            isVisible={weeklySummary.isVisible}
          />
        </div>

        {/* Balance Card */}
        <div className="animate-fade-in">
          <BalanceCard />
        </div>

        {/* Chart */}
        <div className="animate-fade-in stagger-1">
          <MiniChart />
        </div>

        {/* Recent Transactions */}
        <div className="animate-fade-in stagger-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-lg">Últimas Transações</h2>
            <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-full">
              Este mês
            </span>
          </div>
          <TransactionList />
        </div>
      </main>

      {/* FAB */}
      <FloatingActionButton onClick={handleOpenModal} />

      {/* Modal */}
      <AddTransactionModal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
      />
    </div>
  );
}
