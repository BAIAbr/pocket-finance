import { BalanceCard } from '@/components/BalanceCard';
import { TransactionList } from '@/components/TransactionList';
import { MiniChart } from '@/components/MiniChart';
import { QuickActionsFab } from '@/components/QuickActionsFab';
import { WeeklySummaryCard } from '@/components/WeeklySummaryCard';
import { FamilyDashboard } from '@/components/FamilyDashboard';
import { QuickPiggyDeposit } from '@/components/QuickPiggyDeposit';
import { UpcomingEventsCard } from '@/components/UpcomingEventsCard';
import { MonthlySummaryCard } from '@/components/MonthlySummaryCard';
import { FinancialFeedCard } from '@/components/FinancialFeedCard';
import { YearOverYearCard } from '@/components/YearOverYearCard';
import { PlanningSummaryCard } from '@/components/planning/PlanningSummaryCard';
import { InvestmentsSummaryCard } from '@/components/investments/InvestmentsSummaryCard';
import { ChangelogHighlight } from '@/components/ChangelogHighlight';
import { SmartInsightsSection } from '@/components/SmartInsightsSection';
import { PixExpirationBanner } from '@/components/PixExpirationBanner';
import CreditCardsDashboardCard from '@/components/CreditCardsDashboardCard';
import { useEffectiveFinance } from '@/hooks/useEffectiveFinance';
import { useAuth } from '@/contexts/AuthContext';
import { useStreak } from '@/hooks/useStreak';
import { useWeeklySummary } from '@/hooks/useWeeklySummary';
import { useUserPreferences } from '@/contexts/UserPreferencesContext';

export default function Dashboard() {
  const { transactions, currentMonthStats, categories, isFamily, piggyBanks, formatCurrency, _personalFinance } = useEffectiveFinance();
  const { user } = useAuth();
  const { currentStreak } = useStreak(user?.id ?? null);
  const weeklySummary = useWeeklySummary(transactions as any, categories as any, 0);
  const { dashboardLayout } = useUserPreferences();
  const isHidden = (id: string) => dashboardLayout.hidden.includes(id);

  return (
    <div className="min-h-screen bg-background pb-28 lg:pb-8 safe-top">
      <header className="px-4 lg:px-8 pt-6 pb-4 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
        <div className="relative">
          <p className="text-muted-foreground text-sm font-medium">
            {isFamily ? 'Resumo familiar' : 'Resumo financeiro'}
          </p>
          <h1 className="text-2xl lg:text-3xl font-bold capitalize bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
            {currentMonthStats.month}
          </h1>
        </div>
      </header>

      <main className="px-4 lg:px-8 space-y-5">
        {/* Aviso de expiração PIX (Premium prestes a expirar / expirado) */}
        <PixExpirationBanner />

        {/* Novidades destacadas */}
        <ChangelogHighlight />

        {/* Assistente inteligente: saudação personalizada + insights da semana */}
        {!isHidden('smartInsights') && <SmartInsightsSection />}


        {/* Balance is always highlighted at the top */}
        {!isHidden('balance') && (
          <div className="animate-fade-in">
            <BalanceCard />
          </div>
        )}

        {/* Family goals in family mode (full width) */}
        {isFamily && <FamilyDashboard />}

        {/* Desktop: two balanced columns. Mobile: single stack (unchanged order) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
          {/* LEFT column */}
          <div className="space-y-5">
            {!isHidden('chart') && (
              <div className="animate-fade-in stagger-1"><MiniChart /></div>
            )}

            {!isHidden('quickDeposit') && (piggyBanks as any[]).filter((p: any) => !p.is_completed).length > 0 && (
              <div className="animate-fade-in stagger-2">
                <QuickPiggyDeposit
                  piggyBanks={(piggyBanks as any[]).filter((p: any) => !p.is_completed)}
                  formatCurrency={formatCurrency}
                  onDeposit={_personalFinance.depositToPiggyBank}
                />
              </div>
            )}

            {!isHidden('monthlySummary') && (
              <div className="animate-fade-in stagger-2">
                <MonthlySummaryCard />
              </div>
            )}

            {!isHidden('upcomingEvents') && !isFamily && (
              <div className="animate-fade-in stagger-2">
                <UpcomingEventsCard />
              </div>
            )}

            {!isHidden('financialFeed') && (
              <div className="animate-fade-in stagger-3">
                <FinancialFeedCard />
              </div>
            )}
          </div>

          {/* RIGHT column */}
          <div className="space-y-5">
            {!isHidden('weeklySummary') && (
              <div className="animate-fade-in stagger-2">
                <WeeklySummaryCard
                  totalSpent={weeklySummary.totalSpent}
                  variationPercent={weeklySummary.variationPercent}
                  topCategory={weeklySummary.topCategory}
                  currentStreak={isFamily ? 0 : currentStreak}
                  isVisible={weeklySummary.isVisible}
                />
              </div>
            )}

            {!isHidden('yearOverYear') && (
              <div className="animate-fade-in stagger-2">
                <YearOverYearCard />
              </div>
            )}

            {!isHidden('planning') && (
              <div className="animate-fade-in stagger-2">
                <PlanningSummaryCard />
              </div>
            )}

            {!isHidden('investments') && (
              <div className="animate-fade-in stagger-2">
                <InvestmentsSummaryCard />
              </div>
            )}

            {!isHidden('transactions') && (
              <div className="animate-fade-in stagger-2">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-lg">
                    {isFamily ? 'Transações Compartilhadas' : 'Últimas Transações'}
                  </h2>
                  <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-full">Últimos 7 dias</span>
                </div>
                <TransactionList compact />
              </div>
            )}
          </div>
        </div>
      </main>


      <QuickActionsFab />
    </div>
  );
}
