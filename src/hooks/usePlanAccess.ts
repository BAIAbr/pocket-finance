import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { useSimulatedPlan } from '@/hooks/useSimulatedPlan';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { getCapabilities, PlanFeature } from '@/lib/planCapabilities';

export function usePlanAccess() {
  const { user } = useAuth();
  const { currentPlanCode, loading } = useSubscription(user?.id);
  const { simulatedPlan } = useSimulatedPlan();
  const { isAdmin } = useAdminCheck(user?.id);

  // Simulação só vale se o usuário for admin (evita usuário comum burlar via console)
  const effectivePlan = isAdmin && simulatedPlan ? simulatedPlan : currentPlanCode;
  const isSimulating = !!(isAdmin && simulatedPlan && simulatedPlan !== currentPlanCode);

  const caps = useMemo(() => getCapabilities(effectivePlan), [effectivePlan]);

  return {
    loading,
    planCode: effectivePlan,
    realPlanCode: currentPlanCode,
    isSimulating,
    capabilities: caps,
    has: (feature: PlanFeature) => caps.features[feature] === true,
    maxPiggyBanks: caps.maxPiggyBanks,
    canCreatePiggyBank: (currentCount: number) =>
      caps.maxPiggyBanks === -1 || currentCount < caps.maxPiggyBanks,
  };
}
