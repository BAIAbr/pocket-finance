import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useFamilyContext } from '@/contexts/FamilyContext';
import { toast } from 'sonner';

export interface FinancialGoal {
  id: string;
  user_id: string;
  family_id: string | null;
  title: string;
  goal_type: string;
  icon: string;
  color: string;
  target_amount: number;
  initial_amount: number;
  monthly_contribution: number;
  target_date: string | null;
  cdi_percentage: number;
  custom_annual_rate: number | null;
  category_id: string | null;
  piggy_bank_id: string | null;
  is_primary: boolean;
  is_completed: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type FinancialGoalInput = Omit<FinancialGoal, 'id' | 'user_id' | 'created_at' | 'updated_at'>;

export function useFinancialGoals() {
  const { user } = useAuth();
  const { viewContext, family } = useFamilyContext();
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchGoals = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('financial_goals')
        .select('*')
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      setGoals((data ?? []) as FinancialGoal[]);
    } catch (e: any) {
      console.error('fetchGoals error', e);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const scopedGoals = goals.filter(g =>
    viewContext === 'family' && family
      ? g.family_id === family.id
      : g.family_id === null && g.user_id === user?.id
  );

  const primaryGoal = scopedGoals.find(g => g.is_primary && !g.is_completed) ?? scopedGoals.find(g => !g.is_completed) ?? null;

  const createGoal = useCallback(async (input: Partial<FinancialGoalInput> & { title: string; target_amount: number }) => {
    if (!user) return null;
    const familyId = viewContext === 'family' && family ? family.id : null;
    const payload = {
      user_id: user.id,
      family_id: familyId,
      title: input.title,
      goal_type: input.goal_type ?? 'custom',
      icon: input.icon ?? 'Target',
      color: input.color ?? '#FF6A00',
      target_amount: input.target_amount,
      initial_amount: input.initial_amount ?? 0,
      monthly_contribution: input.monthly_contribution ?? 0,
      target_date: input.target_date ?? null,
      cdi_percentage: input.cdi_percentage ?? 100,
      custom_annual_rate: input.custom_annual_rate ?? null,
      category_id: input.category_id ?? null,
      piggy_bank_id: input.piggy_bank_id ?? null,
      is_primary: input.is_primary ?? false,
      is_completed: false,
      notes: input.notes ?? null,
    };
    const { data, error } = await supabase.from('financial_goals').insert(payload).select().single();
    if (error) {
      toast.error('Erro ao criar objetivo');
      console.error(error);
      return null;
    }
    toast.success('Objetivo criado!');
    await fetchGoals();
    return data as FinancialGoal;
  }, [user, viewContext, family, fetchGoals]);

  const updateGoal = useCallback(async (id: string, patch: Partial<FinancialGoalInput>) => {
    const { error } = await supabase.from('financial_goals').update(patch).eq('id', id);
    if (error) {
      toast.error('Erro ao atualizar objetivo');
      return false;
    }
    await fetchGoals();
    return true;
  }, [fetchGoals]);

  const deleteGoal = useCallback(async (id: string) => {
    const { error } = await supabase.from('financial_goals').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao remover objetivo');
      return false;
    }
    toast.success('Objetivo removido');
    await fetchGoals();
    return true;
  }, [fetchGoals]);

  const setPrimary = useCallback(async (id: string) => {
    return updateGoal(id, { is_primary: true });
  }, [updateGoal]);

  return {
    goals: scopedGoals,
    primaryGoal,
    isLoading,
    createGoal,
    updateGoal,
    deleteGoal,
    setPrimary,
    refresh: fetchGoals,
  };
}
