import { useState } from 'react';
import { BalanceCard } from '@/components/BalanceCard';
import { TransactionList } from '@/components/TransactionList';
import { MiniChart } from '@/components/MiniChart';
import { FloatingActionButton } from '@/components/FloatingActionButton';
import { AddTransactionModal } from '@/components/AddTransactionModal';
import { useFinanceContext } from '@/contexts/FinanceContext';

export default function Dashboard() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { currentMonthStats } = useFinanceContext();

  return (
    <div className="min-h-screen bg-background pb-24 safe-top">
      {/* Header */}
      <header className="px-4 pt-6 pb-4">
        <p className="text-muted-foreground text-sm">Olá! 👋</p>
        <h1 className="text-2xl font-bold capitalize">{currentMonthStats.month}</h1>
      </header>

      {/* Main Content */}
      <main className="px-4 space-y-6">
        {/* Balance Card */}
        <div className="animate-fade-in">
          <BalanceCard />
        </div>

        {/* Chart */}
        <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <MiniChart />
        </div>

        {/* Recent Transactions */}
        <div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Últimas Transações</h2>
          </div>
          <TransactionList />
        </div>
      </main>

      {/* FAB */}
      <FloatingActionButton onClick={() => setIsModalOpen(true)} />

      {/* Modal */}
      <AddTransactionModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
}
