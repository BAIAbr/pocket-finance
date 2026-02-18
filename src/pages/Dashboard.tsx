import { useState } from 'react';
import { BalanceCard } from '@/components/BalanceCard';
import { TransactionList } from '@/components/TransactionList';
import { MiniChart } from '@/components/MiniChart';
import { FloatingActionButton } from '@/components/FloatingActionButton';
import { AddTransactionModal } from '@/components/AddTransactionModal';

import { WeeklySummaryCard } from '@/components/WeeklySummaryCard';
import { useFinanceContext } from '@/contexts/FinanceContext';


import { useWeeklySummary } from '@/hooks/useWeeklySummary';

export default function Dashboard() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { currentMonthStats, transactions, categories } = useFinanceContext();
  const weeklySummary = useWeeklySummary(transactions as any, categories as any, 0);

  const handleOpenModal = () => setIsModalOpen(true);
  const handleCloseModal = () => setIsModalOpen(false);

  return (
    <div className="min-h-screen bg-background pb-28 lg:pb-8 safe-top">
      {/* Header with gradient background */}
      <header className="px-4 lg:px-8 pt-6 pb-4 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
        <div className="relative">
          <p className="text-muted-foreground text-sm font-medium">Resumo financeiro</p>
          <h1 className="text-2xl lg:text-3xl font-bold capitalize bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
            {currentMonthStats.month}
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 lg:px-8 space-y-5">
        {/* Desktop: 2-column grid / Mobile: stacked */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Balance Card */}
          <div className="animate-fade-in">
            <BalanceCard />
          </div>

          {/* Chart */}
          <div className="animate-fade-in stagger-1">
            <MiniChart />
          </div>
        </div>

        {/* Desktop: 2-column grid / Mobile: stacked */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Weekly Summary */}
          <div className="animate-fade-in stagger-2">
            <WeeklySummaryCard
              totalSpent={weeklySummary.totalSpent}
              variationPercent={weeklySummary.variationPercent}
              topCategory={weeklySummary.topCategory}
              currentStreak={0}
              isVisible={weeklySummary.isVisible}
            />
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
