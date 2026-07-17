import { useCallback, useEffect, useMemo, useState } from 'react';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { useEffectiveFinance } from '@/hooks/useEffectiveFinance';
import { useRecurring } from '@/hooks/useRecurring';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/contexts/AuthContext';
import { useCreditCards } from '@/hooks/useCreditCards';

export type NotificationType =
  | 'bill_due'
  | 'goal_deadline'
  | 'piggy_completed'
  | 'pix_expiring'
  | 'card_limit'
  | 'card_invoice'
  | 'insight'
  | 'system';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  description?: string;
  href?: string;
  timestamp: string; // ISO
  priority: 'low' | 'medium' | 'high';
}

const READ_KEY = 'finango.notifications.read.v1';

function loadRead(): Set<string> {
  try {
    const raw = localStorage.getItem(READ_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function saveRead(set: Set<string>) {
  try {
    localStorage.setItem(READ_KEY, JSON.stringify(Array.from(set)));
  } catch { /* noop */ }
}

/**
 * Derives in-app notifications from existing data (no extra network calls).
 * Includes upcoming bills, goal deadlines, completed piggy banks, and PIX renewal.
 */
export function useNotifications() {
  const { piggyBanks } = useEffectiveFinance() as any;
  const { items: recurring } = useRecurring() as any;
  const { user } = useAuth();
  const { subscription } = useSubscription(user?.id) as any;
  const [readIds, setReadIds] = useState<Set<string>>(() => loadRead());

  const notifications = useMemo<AppNotification[]>(() => {
    const list: AppNotification[] = [];
    const now = new Date();
    const today = now.toISOString();

    // Recurring bills due in next 7 days
    (recurring || []).forEach((r: any) => {
      if (!r?.is_active || !r?.next_due_date) return;
      try {
        const due = parseISO(r.next_due_date);
        const days = differenceInCalendarDays(due, now);
        if (days < -1 || days > 7) return;
        const late = days < 0;
        list.push({
          id: `bill-${r.id}-${r.next_due_date}`,
          type: 'bill_due',
          title: late
            ? `Conta atrasada: ${r.name}`
            : days === 0
              ? `Vence hoje: ${r.name}`
              : `Vence em ${days}d: ${r.name}`,
          description: r.amount
            ? `R$ ${Number(r.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
            : undefined,
          href: '/recurring',
          timestamp: due.toISOString(),
          priority: late || days <= 1 ? 'high' : days <= 3 ? 'medium' : 'low',
        });
      } catch { /* noop */ }
    });

    // Piggy banks: completed or near completion
    (piggyBanks || []).forEach((p: any) => {
      const goal = Number(p?.goal_amount || p?.target_amount || 0);
      const current = Number(p?.current_amount || 0);
      if (!goal || goal <= 0) return;
      const pct = current / goal;
      if (pct >= 1) {
        list.push({
          id: `piggy-done-${p.id}`,
          type: 'piggy_completed',
          title: `Meta concluída: ${p.name}`,
          description: 'Você atingiu 100% do valor planejado.',
          href: '/savings',
          timestamp: p.updated_at || today,
          priority: 'medium',
        });
      } else if (pct >= 0.9) {
        list.push({
          id: `piggy-near-${p.id}`,
          type: 'goal_deadline',
          title: `Quase lá em ${p.name}`,
          description: `${Math.round(pct * 100)}% da meta atingida.`,
          href: '/savings',
          timestamp: p.updated_at || today,
          priority: 'low',
        });
      }
      // Deadline approaching
      if (p?.target_date) {
        try {
          const d = parseISO(p.target_date);
          const days = differenceInCalendarDays(d, now);
          if (days >= 0 && days <= 14 && pct < 1) {
            list.push({
              id: `piggy-deadline-${p.id}`,
              type: 'goal_deadline',
              title: `${p.name}: ${days === 0 ? 'prazo hoje' : `${days}d restantes`}`,
              description: `${Math.round(pct * 100)}% concluído.`,
              href: '/savings',
              timestamp: d.toISOString(),
              priority: days <= 3 ? 'high' : 'medium',
            });
          }
        } catch { /* noop */ }
      }
    });

    // PIX expiration warning
    const pixExp = subscription?.pix_expires_at || subscription?.expires_at;
    if (subscription?.status === 'active' && pixExp) {
      try {
        const d = parseISO(pixExp);
        const days = differenceInCalendarDays(d, now);
        if (days >= 0 && days <= 3) {
          list.push({
            id: `pix-exp-${pixExp}`,
            type: 'pix_expiring',
            title: days === 0 ? 'Seu Premium expira hoje' : `Premium expira em ${days}d`,
            description: 'Renove via PIX para manter os benefícios.',
            href: '/plans',
            timestamp: d.toISOString(),
            priority: 'high',
          });
        }
      } catch { /* noop */ }
    }

    // Sort: high → medium → low, then most recent
    const order = { high: 0, medium: 1, low: 2 } as const;
    list.sort((a, b) => {
      const p = order[a.priority] - order[b.priority];
      if (p !== 0) return p;
      return (b.timestamp || '').localeCompare(a.timestamp || '');
    });

    return list;
  }, [recurring, piggyBanks, subscription]);

  const unreadCount = useMemo(
    () => notifications.filter(n => !readIds.has(n.id)).length,
    [notifications, readIds]
  );

  const markAsRead = useCallback((id: string) => {
    setReadIds(prev => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      saveRead(next);
      return next;
    });
  }, []);

  const markAllAsRead = useCallback(() => {
    setReadIds(prev => {
      const next = new Set(prev);
      notifications.forEach(n => next.add(n.id));
      saveRead(next);
      return next;
    });
  }, [notifications]);

  // Prune read IDs no longer present
  useEffect(() => {
    if (!readIds.size) return;
    const alive = new Set(notifications.map(n => n.id));
    let changed = false;
    const next = new Set<string>();
    readIds.forEach(id => {
      if (alive.has(id)) next.add(id);
      else changed = true;
    });
    if (changed) {
      setReadIds(next);
      saveRead(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifications]);

  return {
    notifications,
    unreadCount,
    isRead: (id: string) => readIds.has(id),
    markAsRead,
    markAllAsRead,
  };
}
