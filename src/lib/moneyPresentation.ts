import { endOfDay, isWithinInterval, parseISO, startOfDay, subDays } from 'date-fns';

// The recent list is retrospective; upcoming recurring bills use a separate window.
export function isRecentMoneyDate(date: string, now = new Date()): boolean {
  return isWithinInterval(parseISO(date), {
    start: subDays(startOfDay(now), 6),
    end: endOfDay(now),
  });
}

export function isUpcomingMoneyDue(days: number): boolean {
  return days >= 0 && days <= 7;
}

export function moneyDueState(days: number): 'overdue' | 'soon' | 'future' {
  if (days < 0) return 'overdue';
  return isUpcomingMoneyDue(days) ? 'soon' : 'future';
}

export function openMoneyInvoice<T extends { status: string }>(invoices: readonly T[]): T | undefined {
  return invoices.find(invoice => invoice.status !== 'paid');
}

export function moneyEmptyKind(total: number): 'no-history' | 'outside-period' {
  return total > 0 ? 'outside-period' : 'no-history';
}

export function moneyQueryError(...results: { error: unknown }[]): string | null {
  return results.some(result => result.error) ? 'Não foi possível carregar os dados.' : null;
}