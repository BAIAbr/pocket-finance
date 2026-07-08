import { useMemo } from 'react';
import { parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { useEffectiveFinance } from '@/hooks/useEffectiveFinance';

export interface PlanningStats {
  monthsAnalyzed: number;
  avgIncome: number;
  avgExpense: number;
  avgSavings: number;          // avgIncome - avgExpense
  currentMonthIncome: number;
  currentMonthExpense: number;
  currentMonthSavings: number;
  patrimony: number;           // sum of piggy bank balances
  emergencyRecommended: number; // 6 x avgExpense
  emergencyCoverageMonths: number;
  investmentCapacity: number;  // avgSavings capped at 0
  savingsVariationPct: number; // vs avgSavings
}

export function usePlanningStats(monthsWindow = 6): PlanningStats {
  const { transactions, piggyBanks } = useEffectiveFinance();

  return useMemo(() => {
    const now = new Date();
    const buckets: { income: number; expense: number }[] = [];

    for (let i = 0; i < monthsWindow; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = startOfMonth(d);
      const end = endOfMonth(d);
      const monthTx = (transactions as any[]).filter(t => {
        try { return isWithinInterval(parseISO(t.date), { start, end }); } catch { return false; }
      });
      const income = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
      const expense = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
      buckets.push({ income, expense });
    }

    // Skip current month for averages if it's the first entry and empty
    const historical = buckets.slice(1).filter(b => b.income > 0 || b.expense > 0);
    const denom = historical.length || 1;
    const avgIncome = historical.reduce((s, b) => s + b.income, 0) / denom;
    const avgExpense = historical.reduce((s, b) => s + b.expense, 0) / denom;
    const avgSavings = avgIncome - avgExpense;

    const current = buckets[0] ?? { income: 0, expense: 0 };
    const currentMonthSavings = current.income - current.expense;

    const patrimony = (piggyBanks as any[]).reduce((s, p) => s + Number(p.balance ?? 0), 0);
    const emergencyRecommended = Math.max(0, avgExpense) * 6;
    const emergencyCoverageMonths = avgExpense > 0 ? patrimony / avgExpense : 0;

    const investmentCapacity = Math.max(0, avgSavings);
    const savingsVariationPct = avgSavings > 0 ? ((currentMonthSavings - avgSavings) / avgSavings) * 100 : 0;

    return {
      monthsAnalyzed: historical.length,
      avgIncome,
      avgExpense,
      avgSavings,
      currentMonthIncome: current.income,
      currentMonthExpense: current.expense,
      currentMonthSavings,
      patrimony,
      emergencyRecommended,
      emergencyCoverageMonths,
      investmentCapacity,
      savingsVariationPct,
    };
  }, [transactions, piggyBanks, monthsWindow]);
}
