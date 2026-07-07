import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { getCapabilities, PlanFeature } from '@/lib/planCapabilities';

export function usePlanAccess() {
  const { user } = useAuth();
  const { currentPlanCode, loading } = useSubscription(user?.id);

  const caps = useMemo(() => getCapabilities(currentPlanCode), [currentPlanCode]);

  return {
    loading,
    planCode: currentPlanCode,
    capabilities: caps,
    has: (feature: PlanFeature) => caps.features[feature] === true,
    maxPiggyBanks: caps.maxPiggyBanks,
    canCreatePiggyBank: (currentCount: number) =>
      caps.maxPiggyBanks === -1 || currentCount < caps.maxPiggyBanks,
  };
}
