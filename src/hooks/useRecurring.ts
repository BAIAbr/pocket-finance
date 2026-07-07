import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useFamilyContext } from '@/contexts/FamilyContext';
import { useFinanceContext } from '@/contexts/FinanceContext';
import { addDays, addMonths, addWeeks, addYears, format, parseISO } from 'date-fns';
import { toast } from 'sonner';

export type Frequency = 'weekly' | 'monthly' | 'yearly';

export interface RecurringTransaction {
  id: string;
  user_id: string;
  family_id: string | null;
  name: string;
  amount: number;
  type: 'income' | 'expense';
  category_id: string | null;
  frequency: Frequency;
  day_of_month: number | null;
  next_due_date: string; // YYYY-MM-DD
  is_active: boolean;
  notes: string | null;
  color: string | null;
  icon: string | null;
  last_paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecurringInput {
  name: string;
  amount: number;
  type: 'income' | 'expense';
  category_id: string | null;
  frequency: Frequency;
  day_of_month?: number | null;
  next_due_date: string;
  is_active?: boolean;
  notes?: string | null;
  color?: string | null;
  icon?: string | null;
  family_id?: string | null;
}

export function advanceDate(dateStr: string, frequency: Frequency): string {
  const d = parseISO(dateStr);
  let next: Date;
  if (frequency === 'weekly') next = addWeeks(d, 1);
  else if (frequency === 'yearly') next = addYears(d, 1);
  else next = addMonths(d, 1);
  return format(next, 'yyyy-MM-dd');
}

export function useRecurring() {
  const { user } = useAuth();
  const { family, viewContext } = useFamilyContext();
  const { addTransaction } = useFinanceContext();
  const [items, setItems] = useState<RecurringTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) {
      setItems([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const { data, error } = await (supabase as any)
      .from('recurring_transactions')
      .select('*')
      .order('next_due_date', { ascending: true });
    if (!error && data) setItems(data as RecurringTransaction[]);
    setIsLoading(false);
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const create = useCallback(async (input: RecurringInput) => {
    if (!user?.id) return null;
    const payload = {
      user_id: user.id,
      family_id: input.family_id ?? (viewContext === 'family' && family ? family.id : null),
      name: input.name,
      amount: input.amount,
      type: input.type,
      category_id: input.category_id,
      frequency: input.frequency,
      day_of_month: input.day_of_month ?? null,
      next_due_date: input.next_due_date,
      is_active: input.is_active ?? true,
      notes: input.notes ?? null,
      color: input.color ?? null,
      icon: input.icon ?? null,
    };
    const { data, error } = await (supabase as any)
      .from('recurring_transactions')
      .insert(payload)
      .select()
      .single();
    if (error) { toast.error('Erro ao criar recorrência'); return null; }
    setItems(prev => [...prev, data as RecurringTransaction].sort((a, b) => a.next_due_date.localeCompare(b.next_due_date)));
    toast.success('Recorrência criada');
    return data as RecurringTransaction;
  }, [user?.id, family, viewContext]);

  const update = useCallback(async (id: string, updates: Partial<RecurringInput>) => {
    const { data, error } = await (supabase as any)
      .from('recurring_transactions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) { toast.error('Erro ao atualizar'); return null; }
    setItems(prev => prev.map(i => i.id === id ? (data as RecurringTransaction) : i));
    return data as RecurringTransaction;
  }, []);

  const remove = useCallback(async (id: string) => {
    const { error } = await (supabase as any).from('recurring_transactions').delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir'); return false; }
    setItems(prev => prev.filter(i => i.id !== id));
    toast.success('Recorrência excluída');
    return true;
  }, []);

  const togglePause = useCallback(async (item: RecurringTransaction) => {
    return update(item.id, { is_active: !item.is_active });
  }, [update]);

  /**
   * Pay a recurring item now:
   * - creates a real transaction from its data
   * - advances next_due_date one period
   * - stamps last_paid_at
   */
  const payNow = useCallback(async (item: RecurringTransaction) => {
    if (!item.category_id) {
      toast.error('Defina uma categoria antes de pagar');
      return false;
    }
    const tx = await addTransaction({
      type: item.type,
      amount: Number(item.amount),
      category_id: item.category_id,
      description: item.name,
      date: format(new Date(), 'yyyy-MM-dd'),
    });
    if (!tx) return false;

    const nextDate = advanceDate(item.next_due_date, item.frequency);
    const updated = await update(item.id, { next_due_date: nextDate } as any);
    if (updated) {
      // also stamp last_paid_at (not in Input type)
      await (supabase as any)
        .from('recurring_transactions')
        .update({ last_paid_at: new Date().toISOString() })
        .eq('id', item.id);
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, next_due_date: nextDate, last_paid_at: new Date().toISOString() } : i));
    }
    toast.success(`${item.name} registrado como pago`);
    return true;
  }, [addTransaction, update]);

  return { items, isLoading, create, update, remove, togglePause, payNow, reload: load };
}

export function daysUntil(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const d = parseISO(dateStr);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}
