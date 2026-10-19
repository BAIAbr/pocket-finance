import { describe, expect, it } from 'vitest';
import { isRecentMoneyDate, isUpcomingMoneyDue, moneyDueState, openMoneyInvoice, moneyEmptyKind, moneyQueryError } from './moneyPresentation';

describe('Money presentation rules', () => {
  it('includes today through seven days ahead, and excludes overdue or later dates', () => {
    expect([-1, 0, 7, 8].map(isUpcomingMoneyDue)).toEqual([false, true, true, false]);
  });

  it('keeps the recent list retrospective with inclusive local calendar days', () => {
    const now = new Date(2026, 9, 19, 12);
    expect(['2026-10-12', '2026-10-13', '2026-10-19', '2026-10-20', '2026-10-27']
      .map(date => isRecentMoneyDate(date, now))).toEqual([false, true, true, false, false]);
  });

  it('distinguishes overdue, near due and future pending dates', () => {
    expect([-1, 0, 7, 8].map(moneyDueState)).toEqual(['overdue', 'soon', 'soon', 'future']);
  });

  it('never selects a paid invoice as the current open invoice', () => {
    expect(openMoneyInvoice([{ status: 'paid' }, { status: 'paid' }])).toBeUndefined();
    expect(openMoneyInvoice([{ status: 'paid' }, { status: 'overdue' }, { status: 'open' }])?.status).toBe('overdue');
  });

  it('distinguishes no history from no transactions in the selected period', () => {
    expect(moneyEmptyKind(0)).toBe('no-history');
    expect(moneyEmptyKind(1)).toBe('outside-period');
  });

  it('distinguishes a failed read from successful empty reads', () => {
    expect(moneyQueryError({ error: null }, { error: null })).toBeNull();
    expect(moneyQueryError({ error: null }, { error: { message: 'read failed' } })).not.toBeNull();
  });
});