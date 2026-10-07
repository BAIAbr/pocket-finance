import { QuickActionsFab } from '@/components/QuickActionsFab';
import { ChangelogHighlight } from '@/components/ChangelogHighlight';
import { PixExpirationBanner } from '@/components/PixExpirationBanner';
import { ExecutiveOverview } from '@/components/dashboard/ExecutiveOverview';
import { FoxHighlightCard, FinancialEvolutionCard, UpcomingCommitmentsCard } from '@/components/dashboard/HomeSections';
import { useEffectiveFinance } from '@/hooks/useEffectiveFinance';
import { useUserPreferences } from '@/contexts/UserPreferencesContext';

/**
 * Home = resumo executivo. Módulos detalhados (depósito rápido, resumo do mês,
 * investimentos, cartões, feed) continuam disponíveis em suas próprias páginas.
 */
export default function Dashboard() {
  const { currentMonthStats } = useEffectiveFinance();
  const { dashboardLayout } = useUserPreferences();
  const isHidden = (id: string) => dashboardLayout.hidden.includes(id);

  return (
    <div className="min-h-screen bg-background pb-28 lg:pb-10 safe-top">
      <header className="px-4 lg:px-8 pt-6 pb-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-primary">Resumo financeiro</p>
        <h1 className="mt-1 text-2xl lg:text-3xl font-semibold tracking-tight capitalize">{currentMonthStats.month}</h1>
      </header>

      <main className="px-4 lg:px-8 space-y-5 lg:space-y-6">
        <PixExpirationBanner />
        <ChangelogHighlight />

        {!isHidden('balance') && <div className="animate-fade-in"><ExecutiveOverview /></div>}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 lg:gap-6 items-start">
          {!isHidden('smartInsights') && <div className="lg:col-span-2 animate-fade-in stagger-1"><FoxHighlightCard /></div>}
          {!isHidden('chart') && <div className="lg:col-span-3 animate-fade-in stagger-2"><FinancialEvolutionCard /></div>}
        </div>

        {!isHidden('upcomingEvents') && <div className="animate-fade-in stagger-2"><UpcomingCommitmentsCard /></div>}
      </main>

      <QuickActionsFab />
    </div>
  );
}
