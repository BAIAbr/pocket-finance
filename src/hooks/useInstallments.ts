import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useFamilyContext } from '@/contexts/FamilyContext';
import { useFinanceContext } from '@/contexts/FinanceContext';
import { addMonths, format, parseISO } from 'date-fns';
import { toast } from 'sonner';

export interface InstallmentPurchase {
  id: string;
  user_id: string;
  family_id: string | null;
  name: string;
  total_amount: number;
  installments_count: number;
  category_id: string | null;
  first_due_date: string;
  card_name: string | null;
  notes: string | null;
  impacts_balance: boolean;
  created_at: string;
  updated_at: string;
}

export interface InstallmentItem {
  id: string;
  purchase_id: string;
  user_id: string;
  installment_number: number;
  amount: number;
  due_date: string;
  is_paid: boolean;
  paid_at: string | null;
  transaction_id: string | null;
  impacts_balance: boolean;
}

export interface InstallmentPurchaseWithItems extends InstallmentPurchase {
  items: InstallmentItem[];
}

export interface InstallmentInput {
  name: string;
  total_amount: number;
  installments_count: number;
  category_id: string | null;
  first_due_date: string; // YYYY-MM-DD
  card_name?: string | null;
  notes?: string | null;
  family_id?: string | null;
  impacts_balance?: boolean;
}

/** Split total into N installments, distributing rounding remainder to the first parcel. */
function splitAmount(total: number, n: number): number[] {
  const cents = Math.round(total * 100);
  const base = Math.floor(cents / n);
  const remainder = cents - base * n;
  const parts: number[] = [];
  for (let i = 0; i < n; i++) parts.push((base + (i === 0 ? remainder : 0)) / 100);
  return parts;
}

export function useInstallments() {
  const { user } = useAuth();
  const { family, viewContext } = useFamilyContext();
  const { addTransaction } = useFinanceContext();
  const [purchases, setPurchases] = useState<InstallmentPurchaseWithItems[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) { setPurchases([]); setIsLoading(false); return; }
    setIsLoading(true);
    const { data: ps, error: pe } = await (supabase as any)
      .from('installment_purchases')
      .select('*')
      .order('created_at', { ascending: false });
    if (pe || !ps) { setPurchases([]); setIsLoading(false); return; }
    const ids = (ps as InstallmentPurchase[]).map(p => p.id);
    let items: InstallmentItem[] = [];
    if (ids.length) {
      const { data: its } = await (supabase as any)
        .from('installment_items')
        .select('*')
        .in('purchase_id', ids)
        .order('installment_number', { ascending: true });
      items = (its as InstallmentItem[]) || [];
    }
    setPurchases((ps as InstallmentPurchase[]).map(p => ({
      ...p,
      items: items.filter(i => i.purchase_id === p.id),
    })));
    setIsLoading(false);
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const create = useCallback(async (input: InstallmentInput) => {
    if (!user?.id) return null;
    const familyId = input.family_id ?? (viewContext === 'family' && family ? family.id : null);
    const { data: purchase, error } = await (supabase as any)
      .from('installment_purchases')
      .insert({
        user_id: user.id,
        family_id: familyId,
        name: input.name,
        total_amount: input.total_amount,
        installments_count: input.installments_count,
        category_id: input.category_id,
        first_due_date: input.first_due_date,
        card_name: input.card_name ?? null,
        notes: input.notes ?? null,
      })
      .select()
      .single();
    if (error || !purchase) { toast.error('Erro ao criar compra parcelada'); return null; }

    const parts = splitAmount(Number(input.total_amount), input.installments_count);
    const startDate = parseISO(input.first_due_date);
    const rows = parts.map((amt, idx) => ({
      purchase_id: (purchase as any).id,
      user_id: user.id,
      installment_number: idx + 1,
      amount: amt,
      due_date: format(addMonths(startDate, idx), 'yyyy-MM-dd'),
      is_paid: false,
    }));
    const { data: created, error: itemsErr } = await (supabase as any)
      .from('installment_items')
      .insert(rows)
      .select();
    if (itemsErr) {
      toast.error('Erro ao gerar parcelas');
      await (supabase as any).from('installment_purchases').delete().eq('id', (purchase as any).id);
      return null;
    }
    toast.success(`${input.installments_count}x parcelas geradas`);
    await load();
    return { ...(purchase as InstallmentPurchase), items: (created as InstallmentItem[]) || [] };
  }, [user?.id, family, viewContext, load]);

  const remove = useCallback(async (purchaseId: string) => {
    const { error } = await (supabase as any)
      .from('installment_purchases')
      .delete()
      .eq('id', purchaseId);
    if (error) { toast.error('Erro ao excluir'); return false; }
    setPurchases(prev => prev.filter(p => p.id !== purchaseId));
    toast.success('Compra parcelada excluída');
    return true;
  }, []);

  const markPaid = useCallback(async (purchase: InstallmentPurchase, item: InstallmentItem) => {
    if (item.is_paid) return true;
    if (!purchase.category_id) {
      toast.error('Defina uma categoria na compra antes de marcar como paga');
      return false;
    }
    const desc = `${purchase.name} (${item.installment_number}/${purchase.installments_count})`;
    const tx = await addTransaction({
      type: 'expense',
      amount: Number(item.amount),
      category_id: purchase.category_id,
      description: desc,
      date: format(new Date(), 'yyyy-MM-dd'),
    });
    if (!tx) return false;
    const { error } = await (supabase as any)
      .from('installment_items')
      .update({ is_paid: true, paid_at: new Date().toISOString(), transaction_id: (tx as any).id })
      .eq('id', item.id);
    if (error) { toast.error('Erro ao atualizar parcela'); return false; }
    setPurchases(prev => prev.map(p => p.id !== purchase.id ? p : {
      ...p,
      items: p.items.map(i => i.id === item.id ? { ...i, is_paid: true, paid_at: new Date().toISOString(), transaction_id: (tx as any).id } : i),
    }));
    toast.success(`Parcela ${item.installment_number} marcada como paga`);
    return true;
  }, [addTransaction]);

  const markUnpaid = useCallback(async (item: InstallmentItem) => {
    const { error } = await (supabase as any)
      .from('installment_items')
      .update({ is_paid: false, paid_at: null, transaction_id: null })
      .eq('id', item.id);
    if (error) { toast.error('Erro ao reverter'); return false; }
    setPurchases(prev => prev.map(p => ({
      ...p,
      items: p.items.map(i => i.id === item.id ? { ...i, is_paid: false, paid_at: null, transaction_id: null } : i),
    })));
    return true;
  }, []);

  return { purchases, isLoading, create, remove, markPaid, markUnpaid, reload: load };
}
