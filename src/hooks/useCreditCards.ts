import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { addMonths, format, parseISO } from 'date-fns';
import { toast } from 'sonner';

export interface CreditCard {
  id: string;
  user_id: string;
  name: string;
  bank: string | null;
  brand: string | null;
  color: string;
  last_digits: string | null;
  credit_limit: number;
  closing_day: number;
  due_day: number;
  default_category_id: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreditCardInvoice {
  id: string;
  card_id: string;
  user_id: string;
  reference_month: string;
  closing_date: string;
  due_date: string;
  total_amount: number;
  paid_amount: number;
  status: 'open' | 'closed' | 'paid' | 'partial' | 'overdue';
}

export interface CreditCardInstallment {
  id: string;
  purchase_id: string;
  card_id: string;
  invoice_id: string | null;
  user_id: string;
  installment_number: number;
  total_installments: number;
  amount: number;
  reference_month: string;
  status: 'open' | 'billed' | 'paid' | 'canceled';
}

export interface CreditCardPurchase {
  id: string;
  card_id: string;
  user_id: string;
  description: string;
  category_id: string | null;
  total_amount: number;
  purchase_date: string;
  installments_count: number;
  is_recurring: boolean;
  status: 'active' | 'canceled';
}

export interface CardUsage {
  card_id: string;
  credit_limit: number;
  used_amount: number;
  available_amount: number;
}

export interface CreditCardRecurring {
  id: string;
  user_id: string;
  card_id: string;
  description: string;
  category_id: string | null;
  amount: number;
  day_of_month: number;
  starts_on: string;
  ends_on: string | null;
  is_active: boolean;
  last_charged_month: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecurringInput {
  card_id: string;
  description: string;
  category_id?: string | null;
  amount: number;
  day_of_month: number;
  starts_on?: string;
  ends_on?: string | null;
  notes?: string | null;
  is_active?: boolean;
}

export interface CardFormInput {
  name: string;
  bank?: string | null;
  brand?: string | null;
  color?: string;
  last_digits?: string | null;
  credit_limit: number;
  closing_day: number;
  due_day: number;
  default_category_id?: string | null;
  notes?: string | null;
}

export interface PurchaseInput {
  card_id: string;
  description: string;
  category_id?: string | null;
  total_amount: number;
  purchase_date: string; // yyyy-mm-dd
  installments_count: number;
}

function splitAmount(total: number, n: number): number[] {
  const cents = Math.round(total * 100);
  const base = Math.floor(cents / n);
  const remainder = cents - base * n;
  const parts: number[] = [];
  for (let i = 0; i < n; i++) parts.push((base + (i === 0 ? remainder : 0)) / 100);
  return parts;
}

function computeReferenceMonth(purchaseDate: string, closingDay: number): string {
  const d = parseISO(purchaseDate);
  let y = d.getFullYear();
  let m = d.getMonth(); // 0-11
  if (d.getDate() > closingDay) {
    m += 1;
    if (m > 11) { m = 0; y += 1; }
  }
  return format(new Date(y, m, 1), 'yyyy-MM-dd');
}

export function useCreditCards() {
  const { user } = useAuth();
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [invoices, setInvoices] = useState<CreditCardInvoice[]>([]);
  const [installments, setInstallments] = useState<CreditCardInstallment[]>([]);
  const [purchases, setPurchases] = useState<CreditCardPurchase[]>([]);
  const [usage, setUsage] = useState<CardUsage[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    const [c, inv, ins, p, u] = await Promise.all([
      supabase.from('credit_cards').select('*').order('created_at'),
      supabase.from('credit_card_invoices').select('*').order('reference_month', { ascending: false }),
      supabase.from('credit_card_installments').select('*').order('reference_month'),
      supabase.from('credit_card_purchases').select('*').order('purchase_date', { ascending: false }),
      supabase.from('credit_card_usage').select('*'),
    ]);
    setCards((c.data as any) ?? []);
    setInvoices((inv.data as any) ?? []);
    setInstallments((ins.data as any) ?? []);
    setPurchases((p.data as any) ?? []);
    setUsage((u.data as any) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel('credit-cards-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'credit_cards' }, () => refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'credit_card_invoices' }, () => refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'credit_card_installments' }, () => refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'credit_card_purchases' }, () => refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'credit_card_payments' }, () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, refresh]);

  const createCard = useCallback(async (input: CardFormInput) => {
    if (!user) return;
    const { error } = await supabase.from('credit_cards').insert({
      user_id: user.id,
      name: input.name,
      bank: input.bank ?? null,
      brand: input.brand ?? null,
      color: input.color ?? '#7c3aed',
      last_digits: input.last_digits ?? null,
      credit_limit: input.credit_limit,
      closing_day: input.closing_day,
      due_day: input.due_day,
      default_category_id: input.default_category_id ?? null,
      notes: input.notes ?? null,
    } as any);
    if (error) { toast.error('Erro ao cadastrar cartão: ' + error.message); throw error; }
    toast.success('Cartão cadastrado');
    await refresh();
  }, [user, refresh]);

  const updateCard = useCallback(async (id: string, patch: Partial<CardFormInput>) => {
    const { error } = await supabase.from('credit_cards').update(patch as any).eq('id', id);
    if (error) { toast.error('Erro ao atualizar: ' + error.message); throw error; }
    await refresh();
  }, [refresh]);

  const deleteCard = useCallback(async (id: string) => {
    const { error } = await supabase.from('credit_cards').delete().eq('id', id);
    if (error) { toast.error('Erro ao remover: ' + error.message); throw error; }
    toast.success('Cartão removido');
    await refresh();
  }, [refresh]);

  const createPurchase = useCallback(async (input: PurchaseInput) => {
    if (!user) return;
    const card = cards.find(c => c.id === input.card_id);
    if (!card) { toast.error('Cartão não encontrado'); return; }

    const { data: purchase, error: pErr } = await supabase.from('credit_card_purchases').insert({
      user_id: user.id,
      card_id: input.card_id,
      description: input.description,
      category_id: input.category_id ?? card.default_category_id ?? null,
      total_amount: input.total_amount,
      purchase_date: input.purchase_date,
      installments_count: input.installments_count,
    } as any).select().single();
    if (pErr || !purchase) { toast.error('Erro: ' + pErr?.message); return; }

    const parts = splitAmount(input.total_amount, input.installments_count);
    const firstRef = computeReferenceMonth(input.purchase_date, card.closing_day);
    const firstRefDate = parseISO(firstRef);

    const rows: any[] = [];
    for (let i = 0; i < input.installments_count; i++) {
      const refMonth = format(addMonths(firstRefDate, i), 'yyyy-MM-dd');
      // ensure invoice exists via RPC
      const { data: invId, error: invErr } = await supabase.rpc('cc_ensure_invoice', {
        _card_id: input.card_id, _reference_month: refMonth,
      } as any);
      if (invErr) { toast.error('Erro na fatura: ' + invErr.message); return; }
      rows.push({
        user_id: user.id,
        purchase_id: (purchase as any).id,
        card_id: input.card_id,
        invoice_id: invId,
        installment_number: i + 1,
        total_installments: input.installments_count,
        amount: parts[i],
        reference_month: refMonth,
        status: 'open',
      });
    }
    const { error: iErr } = await supabase.from('credit_card_installments').insert(rows);
    if (iErr) { toast.error('Erro nas parcelas: ' + iErr.message); return; }
    toast.success('Compra registrada');
    await refresh();
  }, [user, cards, refresh]);

  const deletePurchase = useCallback(async (id: string) => {
    const { error } = await supabase.from('credit_card_purchases').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Compra removida');
    await refresh();
  }, [refresh]);

  const payInvoice = useCallback(async (invoiceId: string, cardId: string, amount: number, sourceAccount?: string) => {
    if (!user) return;
    const { error } = await supabase.from('credit_card_payments').insert({
      user_id: user.id,
      invoice_id: invoiceId,
      card_id: cardId,
      amount,
      payment_date: format(new Date(), 'yyyy-MM-dd'),
      source_account: sourceAccount ?? null,
    } as any);
    if (error) { toast.error('Erro: ' + error.message); return; }
    // Mark installments as paid if fully paid
    const inv = invoices.find(i => i.id === invoiceId);
    if (inv && inv.paid_amount + amount >= inv.total_amount) {
      await supabase.from('credit_card_installments')
        .update({ status: 'paid' } as any)
        .eq('invoice_id', invoiceId);
    }
    toast.success('Pagamento registrado');
    await refresh();
  }, [user, invoices, refresh]);

  // Helpers
  const getCardMetrics = useCallback((cardId: string) => {
    const card = cards.find(c => c.id === cardId);
    const u = usage.find(x => x.card_id === cardId);
    const limit = Number(card?.credit_limit ?? 0);
    const used = Number(u?.used_amount ?? 0);
    const available = Math.max(limit - used, 0);
    const percent = limit > 0 ? (used / limit) * 100 : 0;
    // Current invoice = latest with status not paid
    const cardInvoices = invoices
      .filter(i => i.card_id === cardId)
      .sort((a, b) => a.reference_month.localeCompare(b.reference_month));
    const currentInvoice = cardInvoices.find(i => i.status !== 'paid') ?? cardInvoices[cardInvoices.length - 1];
    return { card, limit, used, available, percent, currentInvoice, cardInvoices };
  }, [cards, usage, invoices]);

  const totals = useMemo(() => {
    const limit = cards.reduce((s, c) => s + Number(c.credit_limit), 0);
    const used = usage.reduce((s, u) => s + Number(u.used_amount), 0);
    return { limit, used, available: Math.max(limit - used, 0), percent: limit > 0 ? (used / limit) * 100 : 0 };
  }, [cards, usage]);

  return {
    cards, invoices, installments, purchases, usage, loading, totals,
    refresh, createCard, updateCard, deleteCard,
    createPurchase, deletePurchase, payInvoice, getCardMetrics,
  };
}
