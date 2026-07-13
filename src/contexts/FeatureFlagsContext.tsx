import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface FeatureFlag {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string;
  icon: string | null;
  active: boolean;
}

export interface PlanFeatureRow {
  id: string;
  plan_id: string;
  feature_id: string;
  enabled: boolean;
}

export interface PlanLimitRow {
  id: string;
  plan_id: string;
  key: string;
  value: number;
  description: string | null;
}

export interface PlanRow {
  id: string;
  code: string;
  name: string;
}

interface FeatureFlagsContextValue {
  loading: boolean;
  planCode: string;
  flags: FeatureFlag[];
  plans: PlanRow[];
  planFeatures: PlanFeatureRow[];
  planLimits: PlanLimitRow[];
  hasFeature: (slug: string) => boolean;
  getLimit: (key: string) => number;
  remainingLimit: (key: string, used: number) => number;
  canUse: (key: string, used: number) => boolean;
  refresh: () => Promise<void>;
}

const FeatureFlagsContext = createContext<FeatureFlagsContextValue>({
  loading: true,
  planCode: 'free',
  flags: [],
  plans: [],
  planFeatures: [],
  planLimits: [],
  hasFeature: () => false,
  getLimit: () => 0,
  remainingLimit: () => 0,
  canUse: () => false,
  refresh: async () => {},
});

export function FeatureFlagsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [planCode, setPlanCode] = useState<string>('free');
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [planFeatures, setPlanFeatures] = useState<PlanFeatureRow[]>([]);
  const [planLimits, setPlanLimits] = useState<PlanLimitRow[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const [flagsRes, plansRes, pfRes, plRes] = await Promise.all([
      supabase.from('feature_flags').select('*').order('category').order('name'),
      supabase.from('subscription_plans').select('id, code, name').eq('is_active', true),
      supabase.from('plan_features').select('*'),
      supabase.from('plan_limits').select('*'),
    ]);
    setFlags((flagsRes.data as FeatureFlag[]) ?? []);
    setPlans((plansRes.data as PlanRow[]) ?? []);
    setPlanFeatures((pfRes.data as PlanFeatureRow[]) ?? []);
    setPlanLimits((plRes.data as PlanLimitRow[]) ?? []);

    if (user?.id) {
      const { data } = await supabase.rpc('user_plan_code', { _user_id: user.id });
      setPlanCode((data as string) ?? 'free');
    } else {
      setPlanCode('free');
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  // Realtime: invalidate cache when admin changes flags/plans/limits or user's subscription
  useEffect(() => {
    const channel = supabase
      .channel('feature-flags-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'feature_flags' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'plan_features' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'plan_limits' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_subscriptions' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  const currentPlanId = useMemo(
    () => plans.find(p => p.code === planCode)?.id,
    [plans, planCode]
  );

  const activeSlugSet = useMemo(() => {
    if (!currentPlanId) return new Set<string>();
    const flagById = new Map(flags.map(f => [f.id, f]));
    const enabledFeatureIds = planFeatures
      .filter(pf => pf.plan_id === currentPlanId && pf.enabled)
      .map(pf => pf.feature_id);
    const slugs = enabledFeatureIds
      .map(id => flagById.get(id))
      .filter((f): f is FeatureFlag => !!f && f.active)
      .map(f => f.slug);
    return new Set(slugs);
  }, [currentPlanId, flags, planFeatures]);

  const limitsMap = useMemo(() => {
    const m = new Map<string, number>();
    if (!currentPlanId) return m;
    for (const l of planLimits) {
      if (l.plan_id === currentPlanId) m.set(l.key, l.value);
    }
    return m;
  }, [currentPlanId, planLimits]);

  const hasFeature = useCallback((slug: string) => activeSlugSet.has(slug), [activeSlugSet]);
  const getLimit = useCallback((key: string) => limitsMap.get(key) ?? 0, [limitsMap]);
  const remainingLimit = useCallback((key: string, used: number) => {
    const v = getLimit(key);
    if (v === -1) return Infinity;
    return Math.max(0, v - used);
  }, [getLimit]);
  const canUse = useCallback((key: string, used: number) => {
    const v = getLimit(key);
    if (v === -1) return true;
    return used < v;
  }, [getLimit]);

  const value: FeatureFlagsContextValue = {
    loading,
    planCode,
    flags,
    plans,
    planFeatures,
    planLimits,
    hasFeature,
    getLimit,
    remainingLimit,
    canUse,
    refresh: load,
  };

  return <FeatureFlagsContext.Provider value={value}>{children}</FeatureFlagsContext.Provider>;
}

export function useFeatureFlags() {
  return useContext(FeatureFlagsContext);
}
