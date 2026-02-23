import { useState, useEffect } from 'react';
import { BalanceCard } from '@/components/BalanceCard';
import { TransactionList } from '@/components/TransactionList';
import { MiniChart } from '@/components/MiniChart';
import { FloatingActionButton } from '@/components/FloatingActionButton';
import { AddTransactionModal } from '@/components/AddTransactionModal';
import { MissionHomeCard } from '@/components/MissionHomeCard';
import { WeeklyMissionsCard } from '@/components/WeeklyMissionsCard';
import { WeeklySummaryCard } from '@/components/WeeklySummaryCard';
import { FamilyDashboard } from '@/components/FamilyDashboard';
import { useFinanceContext } from '@/contexts/FinanceContext';
import { useMissionContext } from '@/contexts/MissionContext';
import { useFamilyContext } from '@/contexts/FamilyContext';
import { useAuth } from '@/contexts/AuthContext';
import { useStreak } from '@/hooks/useStreak';
import { useWeeklySummary } from '@/hooks/useWeeklySummary';
import { supabase } from '@/integrations/supabase/client';

export default function Dashboard() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { currentMonthStats, transactions, categories } = useFinanceContext();
  const { recentCompletions, markHomeShown, viewDetails, checkMissions, weeklyMissions, isLoadingWeekly, generateWeeklyMissions } = useMissionContext();
  const { viewContext } = useFamilyContext();
  const { user } = useAuth();
  const { currentStreak } = useStreak(user?.id ?? null);
  const weeklySummary = useWeeklySummary(transactions as any, categories as any, 0);

  useEffect(() => {
    if (!user?.id || !transactions) return;

    const fetchAndCheck = async () => {
      const incomeCount = (transactions as any[]).filter((t: any) => t.type === 'income').length;
      const expenseCount = (transactions as any[]).filter((t: any) => t.type === 'expense').length;

      const [goalsRes, piggyRes] = await Promise.all([
        supabase.from('savings_goals').select('id, is_completed').eq('user_id', user.id),
        supabase.from('piggy_bank').select('id').eq('user_id', user.id),
      ]);

      checkMissions({
        transactionCount: (transactions as any[]).length,
        incomeCount,
        expenseCount,
        streak: currentStreak,
        savingsGoalCount: goalsRes.data?.length ?? 0,
        completedGoalCount: goalsRes.data?.filter(g => g.is_completed).length ?? 0,
        piggyBankCount: piggyRes.data?.length ?? 0,
        monthlyBalance: currentMonthStats.balance,
      });
    };

    fetchAndCheck();
  }, [user?.id, transactions, currentStreak]);

  return (
    <div className="min-h-screen bg-background pb-28 lg:pb-8 safe-top">
      <header className="px-4 lg:px-8 pt-6 pb-4 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
        <div className="relative">
          <p className="text-muted-foreground text-sm font-medium">Resumo financeiro</p>
          <h1 className="text-2xl lg:text-3xl font-bold capitalize bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
            {currentMonthStats.month}
          </h1>
        </div>
      </header>

      <main className="px-4 lg:px-8 space-y-5">
        {viewContext === 'family' ? (
          <FamilyDashboard />
        ) : (
          <>
            <MissionHomeCard
              completions={recentCompletions}
              onViewDetails={viewDetails}
              onDismiss={markHomeShown}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="animate-fade-in"><BalanceCard /></div>
              <div className="animate-fade-in stagger-1"><MiniChart /></div>
            </div>

            {/* Weekly AI Missions */}
            <div className="animate-fade-in stagger-1">
              <WeeklyMissionsCard
                missions={weeklyMissions}
                isLoading={isLoadingWeekly}
                onGenerate={generateWeeklyMissions}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="animate-fade-in stagger-2">
                <WeeklySummaryCard
                  totalSpent={weeklySummary.totalSpent}
                  variationPercent={weeklySummary.variationPercent}
                  topCategory={weeklySummary.topCategory}
                  currentStreak={0}
                  isVisible={weeklySummary.isVisible}
                />
              </div>
              <div className="animate-fade-in stagger-2">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-lg">Últimas Transações</h2>
                  <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-full">Últimos 7 dias</span>
                </div>
                <TransactionList compact />
              </div>
            </div>
          </>
        )}
      </main>

      <FloatingActionButton onClick={() => setIsModalOpen(true)} />
      <AddTransactionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
