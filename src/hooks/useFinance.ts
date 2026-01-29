import { useMemo, useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { Transaction, Category, MonthlyStats, CategoryStats, TransactionType } from '@/types/finance';
import { defaultCategories } from '@/data/defaultCategories';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const TRANSACTIONS_KEY = 'finance-transactions';
const CATEGORIES_KEY = 'finance-categories';
const SETTINGS_KEY = 'finance-settings';

export interface FinanceSettings {
  currency: string;
  currencySymbol: string;
}

const defaultSettings: FinanceSettings = {
  currency: 'BRL',
  currencySymbol: 'R$',
};

export function useFinance() {
  const [transactions, setTransactions, clearTransactions] = useLocalStorage<Transaction[]>(TRANSACTIONS_KEY, []);
  const [categories, setCategories] = useLocalStorage<Category[]>(CATEGORIES_KEY, defaultCategories);
  const [settings, setSettings] = useLocalStorage<FinanceSettings>(SETTINGS_KEY, defaultSettings);

  // Add transaction
  const addTransaction = useCallback((transaction: Omit<Transaction, 'id' | 'createdAt'>) => {
    const newTransaction: Transaction = {
      ...transaction,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    setTransactions(prev => [newTransaction, ...prev]);
    return newTransaction;
  }, [setTransactions]);

  // Delete transaction
  const deleteTransaction = useCallback((id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  }, [setTransactions]);

  // Add category
  const addCategory = useCallback((category: Omit<Category, 'id'>) => {
    const newCategory: Category = {
      ...category,
      id: crypto.randomUUID(),
    };
    setCategories(prev => [...prev, newCategory]);
    return newCategory;
  }, [setCategories]);

  // Update category
  const updateCategory = useCallback((id: string, updates: Partial<Omit<Category, 'id'>>) => {
    setCategories(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  }, [setCategories]);

  // Delete category
  const deleteCategory = useCallback((id: string) => {
    setCategories(prev => prev.filter(c => c.id !== id));
  }, [setCategories]);

  // Get category by ID
  const getCategoryById = useCallback((id: string) => {
    return categories.find(c => c.id === id);
  }, [categories]);

  // Get transactions for a specific month
  const getTransactionsForMonth = useCallback((date: Date) => {
    const start = startOfMonth(date);
    const end = endOfMonth(date);
    return transactions.filter(t => {
      const tDate = parseISO(t.date);
      return isWithinInterval(tDate, { start, end });
    });
  }, [transactions]);

  // Calculate totals for current month
  const currentMonthStats = useMemo(() => {
    const now = new Date();
    const monthTransactions = getTransactionsForMonth(now);
    
    const income = monthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const expense = monthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      income,
      expense,
      balance: income - expense,
      month: format(now, 'MMMM yyyy', { locale: ptBR }),
    };
  }, [getTransactionsForMonth]);

  // Calculate total balance (all time)
  const totalBalance = useMemo(() => {
    const income = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const expense = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    return income - expense;
  }, [transactions]);

  // Get category stats for a month
  const getCategoryStats = useCallback((date: Date, type: TransactionType): CategoryStats[] => {
    const monthTransactions = getTransactionsForMonth(date).filter(t => t.type === type);
    const total = monthTransactions.reduce((sum, t) => sum + t.amount, 0);

    const categoryMap = new Map<string, { total: number; count: number }>();
    
    monthTransactions.forEach(t => {
      const existing = categoryMap.get(t.categoryId) || { total: 0, count: 0 };
      categoryMap.set(t.categoryId, {
        total: existing.total + t.amount,
        count: existing.count + 1,
      });
    });

    return Array.from(categoryMap.entries())
      .map(([categoryId, data]) => {
        const category = getCategoryById(categoryId);
        return {
          categoryId,
          categoryName: category?.name || 'Desconhecido',
          icon: category?.icon || 'Circle',
          color: category?.color || '#888888',
          total: data.total,
          percentage: total > 0 ? (data.total / total) * 100 : 0,
          count: data.count,
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [getTransactionsForMonth, getCategoryById]);

  // Get monthly stats for the last N months
  const getMonthlyStats = useCallback((months: number = 6): MonthlyStats[] => {
    const stats: MonthlyStats[] = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthTransactions = getTransactionsForMonth(date);
      
      const income = monthTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
      
      const expense = monthTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

      stats.push({
        month: format(date, 'MMM', { locale: ptBR }),
        income,
        expense,
        balance: income - expense,
      });
    }

    return stats;
  }, [getTransactionsForMonth]);

  // Get recent transactions
  const recentTransactions = useMemo(() => {
    return transactions.slice(0, 10);
  }, [transactions]);

  // Format currency
  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: settings.currency,
    }).format(amount);
  }, [settings.currency]);

  // Clear all data
  const clearAllData = useCallback(() => {
    clearTransactions();
    setCategories(defaultCategories);
    setSettings(defaultSettings);
  }, [clearTransactions, setCategories, setSettings]);

  return {
    // Data
    transactions,
    categories,
    settings,
    recentTransactions,
    totalBalance,
    currentMonthStats,
    
    // Actions
    addTransaction,
    deleteTransaction,
    addCategory,
    updateCategory,
    deleteCategory,
    getCategoryById,
    getTransactionsForMonth,
    getCategoryStats,
    getMonthlyStats,
    formatCurrency,
    setSettings,
    clearAllData,
  };
}
