import { useMemo, useCallback, useState, useEffect } from 'react';
import { useFinanceContext } from '@/contexts/FinanceContext';
import { useFamilyContext } from '@/contexts/FamilyContext';
import { supabase } from '@/integrations/supabase/client';
import { Transaction, Category, PiggyBank, PiggyBankTransaction } from '@/hooks/useSupabaseFinance';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Hook that returns finance data filtered by the current view context.
 * When viewContext is 'personal', returns the user's own data.
 * When viewContext is 'family', returns shared family transactions from all members.
 */
export function useEffectiveFinance() {
  const finance = useFinanceContext();
  const { viewContext, family, sharedTransactions, members } = useFamilyContext();
  const memberProfiles = useMemo(() => {
    const map = new Map<string, string>();
    members.forEach(m => {
      if (m.profile?.name) map.set(m.user_id, m.profile.name);
    });
    return map;
  }, [members]);

  const [familyTransactions, setFamilyTransactions] = useState<Transaction[]>([]);
  const [familyPiggyBanks, setFamilyPiggyBanks] = useState<PiggyBank[]>([]);
  const [familyPiggyBankTransactions, setFamilyPiggyBankTransactions] = useState<PiggyBankTransaction[]>([]);
  const [isLoadingFamily, setIsLoadingFamily] = useState(false);

  // Fetch all shared family transactions (including from other members)
  useEffect(() => {
    if (viewContext !== 'family' || !family || sharedTransactions.length === 0) {
      setFamilyTransactions([]);
      return;
    }

    const fetchFamilyTransactions = async () => {
      setIsLoadingFamily(true);
      try {
        const sharedIds = sharedTransactions.map(st => st.transaction_id);
        
        // Fetch in batches of 100 to avoid URL length limits
        const allTransactions: Transaction[] = [];
        for (let i = 0; i < sharedIds.length; i += 100) {
          const batch = sharedIds.slice(i, i + 100);
          const { data } = await supabase
            .from('transactions')
            .select('*')
            .in('id', batch)
            .order('date', { ascending: false });
          
          if (data) {
            allTransactions.push(...(data as Transaction[]));
          }
        }
        
        setFamilyTransactions(allTransactions);
      } catch (err) {
        console.error('Error fetching family transactions:', err);
      } finally {
        setIsLoadingFamily(false);
      }
    };

    fetchFamilyTransactions();
  }, [viewContext, family, sharedTransactions]);

  // Fetch all family members' piggy banks
  useEffect(() => {
    if (viewContext !== 'family' || !family || members.length === 0) {
      setFamilyPiggyBanks([]);
      setFamilyPiggyBankTransactions([]);
      return;
    }

    const fetchFamilyPiggyBanks = async () => {
      try {
        const memberUserIds = members.map(m => m.user_id);
        
        const [piggyRes, piggyTxRes] = await Promise.all([
          supabase
            .from('piggy_bank')
            .select('*')
            .in('user_id', memberUserIds)
            .order('created_at', { ascending: true }),
          supabase
            .from('piggy_bank_transactions')
            .select('*')
            .in('user_id', memberUserIds)
            .order('created_at', { ascending: false }),
        ]);

        if (piggyRes.data) setFamilyPiggyBanks(piggyRes.data as PiggyBank[]);
        if (piggyTxRes.data) setFamilyPiggyBankTransactions(piggyTxRes.data as PiggyBankTransaction[]);
      } catch (err) {
        console.error('Error fetching family piggy banks:', err);
      }
    };

    fetchFamilyPiggyBanks();
  }, [viewContext, family, members]);

  const isFamily = viewContext === 'family';

  // Effective transactions based on context
  const transactions = useMemo(() => {
    if (!isFamily) return finance.transactions;
    return familyTransactions;
  }, [isFamily, finance.transactions, familyTransactions]);

  // Effective recent transactions
  const recentTransactions = useMemo(() => {
    return (transactions as Transaction[]).slice(0, 10);
  }, [transactions]);

  // Effective total balance
  const totalBalance = useMemo(() => {
    const income = (transactions as Transaction[])
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const expense = (transactions as Transaction[])
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    return income - expense;
  }, [transactions]);

  // Effective current month stats
  const getTransactionsForMonth = useCallback((date: Date) => {
    const start = startOfMonth(date);
    const end = endOfMonth(date);
    return (transactions as Transaction[]).filter(t => {
      const tDate = parseISO(t.date);
      return isWithinInterval(tDate, { start, end });
    });
  }, [transactions]);

  const currentMonthStats = useMemo(() => {
    const now = new Date();
    const monthTransactions = getTransactionsForMonth(now);
    
    const income = monthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const expense = monthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    return {
      income,
      expense,
      balance: income - expense,
      month: format(now, 'MMMM yyyy', { locale: ptBR }),
    };
  }, [getTransactionsForMonth]);

  const getCategoryStats = useCallback((date: Date, type: 'income' | 'expense') => {
    const monthTransactions = getTransactionsForMonth(date).filter(t => t.type === type);
    const total = monthTransactions.reduce((sum, t) => sum + Number(t.amount), 0);

    const categoryMap = new Map<string, { total: number; count: number }>();
    monthTransactions.forEach(t => {
      if (!t.category_id) return;
      const existing = categoryMap.get(t.category_id) || { total: 0, count: 0 };
      categoryMap.set(t.category_id, {
        total: existing.total + Number(t.amount),
        count: existing.count + 1,
      });
    });

    return Array.from(categoryMap.entries())
      .map(([categoryId, data]) => {
        const category = finance.getCategoryById(categoryId);
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
  }, [getTransactionsForMonth, finance.getCategoryById]);

  const getMonthlyStats = useCallback((months: number = 6) => {
    const stats = [];
    const now = new Date();
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthTx = getTransactionsForMonth(date);
      const income = monthTx.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
      const expense = monthTx.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
      stats.push({
        month: format(date, 'MMM', { locale: ptBR }),
        income,
        expense,
        balance: income - expense,
      });
    }
    return stats;
  }, [getTransactionsForMonth]);

  // Effective piggy banks based on context
  const piggyBanks = useMemo(() => {
    if (!isFamily) return finance.piggyBanks;
    return familyPiggyBanks;
  }, [isFamily, finance.piggyBanks, familyPiggyBanks]);

  const piggyBankTransactions = useMemo(() => {
    if (!isFamily) return finance.piggyBankTransactions;
    return familyPiggyBankTransactions;
  }, [isFamily, finance.piggyBankTransactions, familyPiggyBankTransactions]);

  return {
    // Override with effective data
    ...finance,
    transactions,
    recentTransactions,
    totalBalance,
    currentMonthStats,
    getTransactionsForMonth,
    getCategoryStats,
    getMonthlyStats,
    piggyBanks,
    piggyBankTransactions,
    isLoading: finance.isLoading || isLoadingFamily,
    isFamily,
    memberProfiles,
    // Keep original finance for write operations
    _personalFinance: finance,
  };
}
