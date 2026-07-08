import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PlanFeatureItem {
  label: string;
  enabled: boolean;
}

export interface SubscriptionPlan {
  id: string;
  code: string;
  name: string;
  description: string | null;
  price_monthly: number;
  features: PlanFeatureItem[];
  is_highlighted: boolean;
  sort_order: number;
  is_active: boolean;
}

export function normalizeFeatures(raw: any): PlanFeatureItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((f: any) => {
    if (typeof f === 'string') return { label: f, enabled: true };
    if (f && typeof f === 'object') return { label: String(f.label ?? ''), enabled: f.enabled !== false };
    return { label: String(f ?? ''), enabled: true };
  }).filter(f => f.label.length > 0);
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
          features: normalizeFeatures(p.features),
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
    if (planCode !== 'free') {
      throw new Error('Planos pagos exigem verificação de pagamento ou código VIP.');
    }
    const { data, error } = await supabase.functions.invoke('select-plan', { body: { plan_code: planCode } });
    if (error) throw error;
    if ((data as any)?.error) throw new Error((data as any).message ?? (data as any).error);
    await loadSubscription();
  };

  const currentPlanCode = subscription?.plan_code ?? 'free';

  return { plans, subscription, currentPlanCode, loading, selectPlan, reload: loadSubscription };
}
