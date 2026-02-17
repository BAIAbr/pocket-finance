import { useMemo } from 'react';
import { Transaction } from '@/hooks/useSupabaseFinance';
import { parseISO, startOfDay, subDays, isWithinInterval, startOfMonth, endOfMonth } from 'date-fns';

export type FireLevel = 0 | 1 | 2 | 3;

export interface FireInfo {
  level: FireLevel;
  reasons: string[];
}

interface CategoryAvg {
  categoryId: string;
  avgAmount: number;
}

function getCategoryAverages(transactions: Transaction[]): Map<string, number> {
  const map = new Map<string, { total: number; count: number }>();
  transactions.forEach(t => {
    if (t.type !== 'expense' || !t.category_id) return;
    const existing = map.get(t.category_id) || { total: 0, count: 0 };
    map.set(t.category_id, { total: existing.total + Number(t.amount), count: existing.count + 1 });
  });
  const result = new Map<string, number>();
  map.forEach((v, k) => result.set(k, v.total / v.count));
  return result;
}

export function getTransactionFireInfo(
  transaction: Transaction,
  allTransactions: Transaction[],
  categoryAverages: Map<string, number>
): FireInfo {
  const reasons: string[] = [];
  const amount = Number(transaction.amount);

  if (transaction.type === 'expense' && transaction.category_id) {
    const avg = categoryAverages.get(transaction.category_id);
    if (avg && amount < avg * 0.8) {
      reasons.push('Gasto abaixo da média da categoria');
    }
  }

  // Check if day had positive balance
  const dayTransactions = allTransactions.filter(
    t => t.date === transaction.date
  );
  const dayIncome = dayTransactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const dayExpense = dayTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  if (dayIncome > dayExpense && dayIncome > 0) {
    reasons.push('Dia com saldo positivo');
  }

  // Check saving streak (3+ consecutive days with expenses below average)
  const transactionDate = parseISO(transaction.date);
  let savingDays = 0;
  for (let i = 0; i < 5; i++) {
    const checkDate = subDays(transactionDate, i);
    const dateStr = checkDate.toISOString().split('T')[0];
    const dayExp = allTransactions
      .filter(t => t.date === dateStr && t.type === 'expense')
      .reduce((s, t) => s + Number(t.amount), 0);
    const dayAvgExp = allTransactions
      .filter(t => t.type === 'expense')
      .reduce((s, t) => s + Number(t.amount), 0) / Math.max(1, new Set(allTransactions.filter(t => t.type === 'expense').map(t => t.date)).size);
    
    if (dayExp > 0 && dayExp < dayAvgExp) savingDays++;
    else break;
  }
  if (savingDays >= 3) {
    reasons.push('Sequência de dias economizando');
  }

  let level: FireLevel = 0;
  if (reasons.length >= 3) level = 3;
  else if (reasons.length === 2) level = 2;
  else if (reasons.length === 1) level = 1;

  return { level, reasons };
}

export function useDashboardFire(transactions: Transaction[]) {
  return useMemo(() => {
    if (transactions.length === 0) return { level: 0 as FireLevel, reasons: [] as string[] };

    const now = new Date();
    const currentMonth = transactions.filter(t => {
      const d = parseISO(t.date);
      return isWithinInterval(d, { start: startOfMonth(now), end: endOfMonth(now) });
    });

    const prevMonthStart = startOfMonth(subDays(startOfMonth(now), 1));
    const prevMonthEnd = endOfMonth(prevMonthStart);
    const prevMonth = transactions.filter(t => {
      const d = parseISO(t.date);
      return isWithinInterval(d, { start: prevMonthStart, end: prevMonthEnd });
    });

    const reasons: string[] = [];

    const curExpense = currentMonth.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
    const prevExpense = prevMonth.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);

    if (prevExpense > 0 && curExpense < prevExpense * 0.9) {
      reasons.push('Economia maior que mês anterior');
    }

    const curIncome = currentMonth.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
    if (curIncome > curExpense && currentMonth.length > 0) {
      reasons.push('Saldo positivo no mês');
    }

    // Category reduction
    const curCatMap = new Map<string, number>();
    const prevCatMap = new Map<string, number>();
    currentMonth.filter(t => t.type === 'expense').forEach(t => {
      if (t.category_id) curCatMap.set(t.category_id, (curCatMap.get(t.category_id) || 0) + Number(t.amount));
    });
    prevMonth.filter(t => t.type === 'expense').forEach(t => {
      if (t.category_id) prevCatMap.set(t.category_id, (prevCatMap.get(t.category_id) || 0) + Number(t.amount));
    });
    let reducedCategories = 0;
    curCatMap.forEach((val, key) => {
      const prev = prevCatMap.get(key);
      if (prev && val < prev * 0.8) reducedCategories++;
    });
    if (reducedCategories > 0) {
      reasons.push('Redução de gastos em categoria');
    }

    let level: FireLevel = 0;
    if (reasons.length >= 3) level = 3;
    else if (reasons.length === 2) level = 2;
    else if (reasons.length === 1) level = 1;

    return { level, reasons };
  }, [transactions]);
}

export function useFireSystem(transactions: Transaction[]) {
  const categoryAverages = useMemo(() => getCategoryAverages(transactions), [transactions]);
  const dashboardFire = useDashboardFire(transactions);
  
  return { categoryAverages, dashboardFire };
}
