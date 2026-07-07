import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SubscriptionPlan {
  id: string;
  code: string;
  name: string;
  description: string | null;
  price_monthly: number;
  features: string[];
  is_highlighted: boolean;
  sort_order: number;
  is_active: boolean;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  plan_code: string;
  status: string;
  started_at: string;
  expires_at: string | null;
}

export function useSubscription(userId: string | undefined) {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);

  const loadPlans = useCallback(async () => {
    const { data } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    if (data) {
      setPlans(
        data.map((p: any) => ({
          ...p,
          features: Array.isArray(p.features) ? p.features : [],
        }))
      );
    }
  }, []);

  const loadSubscription = useCallback(async () => {
    if (!userId) {
      setSubscription(null);
      return;
    }
    const { data } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    setSubscription((data as UserSubscription) ?? null);
  }, [userId]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadPlans(), loadSubscription()]);
      setLoading(false);
    })();
  }, [loadPlans, loadSubscription]);

  const selectPlan = async (planCode: string) => {
    if (!userId) throw new Error('Não autenticado');
    const { error } = await supabase
      .from('user_subscriptions')
      .upsert(
        { user_id: userId, plan_code: planCode, status: 'active', started_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );
    if (error) throw error;
    await loadSubscription();
  };

  const currentPlanCode = subscription?.plan_code ?? 'free';

  return { plans, subscription, currentPlanCode, loading, selectPlan, reload: loadSubscription };
}
