import { useMemo } from 'react';
import { subDays, isAfter, isBefore, parseISO, isMonday, startOfDay } from 'date-fns';

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category_id: string | null;
  date: string;
}

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface WeeklySummary {
  totalSpent: number;
  previousWeekSpent: number;
  variationPercent: number;
  topCategory: { name: string; icon: string; color: string; total: number } | null;
  currentStreak: number;
  isVisible: boolean;
}

export function useWeeklySummary(
  transactions: Transaction[],
  categories: Category[],
  currentStreak: number
): WeeklySummary {
  return useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now);

    // Show on Mondays (or always for now — can restrict later)
    const isVisibleDay = isMonday(todayStart);

    const sevenDaysAgo = subDays(todayStart, 7);
    const fourteenDaysAgo = subDays(todayStart, 14);

    const thisWeekExpenses = transactions.filter(t => {
      const d = parseISO(t.date);
      return t.type === 'expense' && isAfter(d, sevenDaysAgo) && !isAfter(d, todayStart);
    });

    const prevWeekExpenses = transactions.filter(t => {
      const d = parseISO(t.date);
      return t.type === 'expense' && isAfter(d, fourteenDaysAgo) && !isAfter(d, sevenDaysAgo);
    });

    const totalSpent = thisWeekExpenses.reduce((sum, t) => sum + Number(t.amount), 0);
    const previousWeekSpent = prevWeekExpenses.reduce((sum, t) => sum + Number(t.amount), 0);

    const variationPercent = previousWeekSpent > 0
      ? ((totalSpent - previousWeekSpent) / previousWeekSpent) * 100
      : 0;

    // Top category
    const catMap = new Map<string, number>();
    thisWeekExpenses.forEach(t => {
      if (t.category_id) {
        catMap.set(t.category_id, (catMap.get(t.category_id) || 0) + Number(t.amount));
      }
    });

    let topCategory: WeeklySummary['topCategory'] = null;
    let maxTotal = 0;
    catMap.forEach((total, catId) => {
      if (total > maxTotal) {
        maxTotal = total;
        const cat = categories.find(c => c.id === catId);
        if (cat) {
          topCategory = { name: cat.name, icon: cat.icon, color: cat.color, total };
        }
      }
    });

    return {
      totalSpent,
      previousWeekSpent,
      variationPercent,
      topCategory,
      currentStreak,
      isVisible: isVisibleDay || totalSpent > 0, // Show if there's data
    };
  }, [transactions, categories, currentStreak]);
}
