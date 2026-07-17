import { useMemo } from 'react';
import { parseISO, subDays, isAfter } from 'date-fns';
import { useEffectiveFinance } from '@/hooks/useEffectiveFinance';

export type FeedEventType =
  | 'income'
  | 'expense'
  | 'piggy_deposit'
  | 'piggy_withdraw'
  | 'piggy_completed';

export interface FeedEvent {
  id: string;
  type: FeedEventType;
  title: string;
  subtitle?: string;
  amount: number;
  timestamp: string; // ISO
  icon: string;
  color: string;
}

/**
 * Unified chronological feed merging transactions and piggy bank events.
 * Read-only view over data already loaded via useEffectiveFinance — no
 * extra network calls.
 */
export function useFinancialFeed(days = 14, limit = 30) {
  const { transactions, piggyBankTransactions, piggyBanks, getCategoryById } = useEffectiveFinance() as any;

  return useMemo<FeedEvent[]>(() => {
    const cutoff = subDays(new Date(), days);
    const events: FeedEvent[] = [];

    (transactions as any[]).forEach(t => {
      let ts: Date;
      try { ts = parseISO(t.created_at ?? t.date); } catch { return; }
      if (!isAfter(ts, cutoff)) return;
      const cat = t.category_id ? getCategoryById(t.category_id) : null;
      events.push({
        id: `tx-${t.id}`,
        type: t.type === 'income' ? 'income' : 'expense',
        title: t.description || cat?.name || (t.type === 'income' ? 'Entrada' : 'Despesa'),
        subtitle: cat?.name,
        amount: Number(t.amount),
        timestamp: t.created_at ?? t.date,
        icon: cat?.icon || (t.type === 'income' ? 'ArrowUpRight' : 'ArrowDownRight'),
        color: cat?.color || (t.type === 'income' ? '#10B981' : '#EF4444'),
      });
    });

    const piggyMap = new Map<string, any>();
    (piggyBanks as any[]).forEach(p => piggyMap.set(p.id, p));

    (piggyBankTransactions as any[]).forEach(pt => {
      let ts: Date;
      try { ts = parseISO(pt.created_at); } catch { return; }
      if (!isAfter(ts, cutoff)) return;
      const pig = pt.piggy_bank_id ? piggyMap.get(pt.piggy_bank_id) : null;
      const isDeposit = pt.type === 'deposit';
      events.push({
        id: `pb-${pt.id}`,
        type: isDeposit ? 'piggy_deposit' : 'piggy_withdraw',
        title: isDeposit ? 'Depósito no Cofrinho' : 'Retirada do Cofrinho',
        subtitle: pig?.name || pt.description || undefined,
        amount: Number(pt.amount),
        timestamp: pt.created_at,
        icon: 'PiggyBank',
        color: pig?.color || (isDeposit ? '#8B5CF6' : '#F59E0B'),
      });
    });

    (piggyBanks as any[])
      .filter(p => p.is_completed && p.updated_at)
      .forEach(p => {
        let ts: Date;
        try { ts = parseISO(p.updated_at); } catch { return; }
        if (!isAfter(ts, cutoff)) return;
        events.push({
          id: `pb-done-${p.id}`,
          type: 'piggy_completed',
          title: 'Meta atingida!',
          subtitle: p.name,
          amount: Number(p.target_amount ?? p.balance ?? 0),
          timestamp: p.updated_at,
          icon: 'Trophy',
          color: p.color || '#F59E0B',
        });
      });

    events.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    return events.slice(0, limit);
  }, [transactions, piggyBankTransactions, piggyBanks, getCategoryById, days, limit]);
}
