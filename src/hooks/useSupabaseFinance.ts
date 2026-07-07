import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

export interface Transaction {
  id: string;
  user_id: string;
  category_id: string | null;
  type: 'income' | 'expense';
  amount: number;
  description: string | null;
  date: string;
  created_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  color: string;
  type: 'income' | 'expense';
  is_default: boolean;
  created_at: string;
}

export interface SavingsGoal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  icon: string;
  color: string;
  deadline: string | null;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface PiggyBank {
  id: string;
  user_id: string;
  balance: number;
  created_at: string;
  updated_at: string;
  // Yield tracking fields
  cdi_rate_annual: number;
  yield_start_date: string | null;
  principal_amount: number;
  total_yield: number;
  last_yield_calculation: string | null;
  // New unified fields
  name: string;
  target_amount: number | null;
  icon: string;
  color: string;
  is_completed: boolean;
  currency: string;
  family_id?: string | null;
}

export interface PiggyBankTransaction {
  id: string;
  user_id: string;
  piggy_bank_id: string | null;
  type: 'deposit' | 'withdraw';
  amount: number;
  description: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface FinanceSettings {
  currency: string;
  currencySymbol: string;
}

export interface MonthlyStats {
  month: string;
  income: number;
  expense: number;
  balance: number;
}

export interface CategoryStats {
  categoryId: string;
  categoryName: string;
  icon: string;
  color: string;
  total: number;
  percentage: number;
  count: number;
}

const defaultSettings: FinanceSettings = {
  currency: 'BRL',
  currencySymbol: 'R$',
};

export function useSupabaseFinance(userId: string | null) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [piggyBanks, setPiggyBanks] = useState<PiggyBank[]>([]);
  const [piggyBankTransactions, setPiggyBankTransactions] = useState<PiggyBankTransaction[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [settings, setSettings] = useState<FinanceSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  // Load all data when userId changes
  useEffect(() => {
    if (!userId) {
      setTransactions([]);
      setCategories([]);
      setSavingsGoals([]);
      setPiggyBanks([]);
      setPiggyBankTransactions([]);
      setProfile(null);
      setIsLoading(false);
      return;
    }

    const loadData = async () => {
      setIsLoading(true);
      try {
        const [
          transactionsRes,
          categoriesRes,
          savingsGoalsRes,
          piggyBanksRes,
          piggyBankTransactionsRes,
          profileRes,
        ] = await Promise.all([
          supabase.from('transactions').select('*').order('date', { ascending: false }),
          supabase.from('categories').select('*').order('name'),
          supabase.from('savings_goals').select('*').order('created_at', { ascending: false }),
          supabase.from('piggy_bank').select('*').order('created_at', { ascending: true }),
          supabase.from('piggy_bank_transactions').select('*').order('created_at', { ascending: false }),
          supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
        ]);

        if (transactionsRes.data) setTransactions(transactionsRes.data as Transaction[]);
        if (categoriesRes.data) setCategories(categoriesRes.data as Category[]);
        if (savingsGoalsRes.data) setSavingsGoals(savingsGoalsRes.data as SavingsGoal[]);
        if (piggyBanksRes.data) setPiggyBanks(piggyBanksRes.data as PiggyBank[]);
        if (piggyBankTransactionsRes.data) setPiggyBankTransactions(piggyBankTransactionsRes.data as PiggyBankTransaction[]);
        if (profileRes.data) {
          const profileData = profileRes.data as Profile;
          setProfile(profileData);
          setSettings({
            currency: profileData.currency,
            currencySymbol: profileData.currency === 'BRL' ? 'R$' : profileData.currency === 'USD' ? '$' : '€',
          });
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [userId]);

  // === TRANSACTIONS ===
  const addTransaction = useCallback(async (transaction: {
    type: 'income' | 'expense';
    amount: number;
    category_id: string;
    description?: string;
    date: string;
  }) => {
    if (!userId) return null;

    const { data, error } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        type: transaction.type,
        amount: transaction.amount,
        category_id: transaction.category_id,
        description: transaction.description || null,
        date: transaction.date.split('T')[0],
      })
      .select()
      .single();

    if (error) {
      toast.error('Erro ao adicionar transação');
      console.error(error);
      return null;
    }

    setTransactions(prev => [data as Transaction, ...prev]);
    return data as Transaction;
  }, [userId]);

  const deleteTransaction = useCallback(async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id)
        .select('id');

      if (error) {
        console.error('Delete transaction error:', error);
        toast.error('Erro ao excluir transação');
        return false;
      }

      if (!data || data.length === 0) {
        toast.error('Você não tem permissão para excluir este lançamento');
        return false;
      }

      setTransactions(prev => prev.filter(t => t.id !== id));
      toast.success('Transação excluída!');
      return true;
    } catch (err) {
      console.error('Delete transaction exception:', err);
      toast.error('Erro ao excluir transação');
      return false;
    }
  }, []);

  const updateTransaction = useCallback(async (id: string, updates: {
    type?: 'income' | 'expense';
    amount?: number;
    category_id?: string;
    description?: string;
    date?: string;
  }) => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Update transaction error:', error);
        toast.error('Erro ao atualizar transação');
        return null;
      }

      setTransactions(prev => prev.map(t => t.id === id ? (data as Transaction) : t));
      toast.success('Transação atualizada!');
      return data as Transaction;
    } catch (err) {
      console.error('Update transaction exception:', err);
      toast.error('Erro ao atualizar transação');
      return null;
    }
  }, []);

  // === CATEGORIES ===
  const addCategory = useCallback(async (category: {
    name: string;
    icon: string;
    color: string;
    type: 'income' | 'expense';
  }) => {
    if (!userId) return null;

    const { data, error } = await supabase
      .from('categories')
      .insert({
        user_id: userId,
        name: category.name,
        icon: category.icon,
        color: category.color,
        type: category.type,
        is_default: false,
      })
      .select()
      .single();

    if (error) {
      toast.error('Erro ao adicionar categoria');
      return null;
    }

    setCategories(prev => [...prev, data as Category]);
    return data as Category;
  }, [userId]);

  const updateCategory = useCallback(async (id: string, updates: Partial<Category>) => {
    const { error } = await supabase
      .from('categories')
      .update(updates)
      .eq('id', id);

    if (error) {
      toast.error('Erro ao atualizar categoria');
      return;
    }

    setCategories(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  }, []);

  const deleteCategory = useCallback(async (id: string) => {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    
    if (error) {
      toast.error('Erro ao excluir categoria');
      return;
    }

    setCategories(prev => prev.filter(c => c.id !== id));
  }, []);

  const getCategoryById = useCallback((id: string | null) => {
    if (!id) return null;
    return categories.find(c => c.id === id) || null;
  }, [categories]);

  // === SAVINGS GOALS ===
  const addSavingsGoal = useCallback(async (goal: {
    name: string;
    target_amount: number;
    icon?: string;
    color?: string;
    deadline?: string;
  }) => {
    if (!userId) return null;

    const { data, error } = await supabase
      .from('savings_goals')
      .insert({
        user_id: userId,
        name: goal.name,
        target_amount: goal.target_amount,
        icon: goal.icon || 'Target',
        color: goal.color || '#10B981',
        deadline: goal.deadline || null,
      })
      .select()
      .single();

    if (error) {
      toast.error('Erro ao criar meta');
      return null;
    }

    setSavingsGoals(prev => [data as SavingsGoal, ...prev]);
    toast.success('Meta criada!');
    return data as SavingsGoal;
  }, [userId]);

  const updateSavingsGoal = useCallback(async (id: string, updates: Partial<SavingsGoal>) => {
    const { error } = await supabase
      .from('savings_goals')
      .update(updates)
      .eq('id', id);

    if (error) {
      toast.error('Erro ao atualizar meta');
      return;
    }

    setSavingsGoals(prev => prev.map(g => g.id === id ? { ...g, ...updates } : g));
  }, []);

  const addToSavingsGoal = useCallback(async (id: string, amount: number) => {
    const goal = savingsGoals.find(g => g.id === id);
    if (!goal) return;

    const newAmount = goal.current_amount + amount;
    const isCompleted = newAmount >= goal.target_amount;

    await updateSavingsGoal(id, {
      current_amount: newAmount,
      is_completed: isCompleted,
    });

    if (isCompleted) {
      toast.success('🎉 Meta alcançada!');
    } else {
      toast.success(`+${formatCurrency(amount)} adicionado à meta!`);
    }
  }, [savingsGoals]);

  const deleteSavingsGoal = useCallback(async (id: string) => {
    const { error } = await supabase.from('savings_goals').delete().eq('id', id);
    
    if (error) {
      toast.error('Erro ao excluir meta');
      return;
    }

    setSavingsGoals(prev => prev.filter(g => g.id !== id));
    toast.success('Meta excluída');
  }, []);

  // === PIGGY BANK (MULTIPLE) ===
  const createPiggyBank = useCallback(async (data: {
    name: string;
    target_amount?: number | null;
    icon?: string;
    color?: string;
    cdi_rate_annual?: number;
    currency?: string;
    family_id?: string | null;
  }) => {
    if (!userId) return null;

    const { data: newPiggy, error } = await supabase
      .from('piggy_bank')
      .insert({
        user_id: userId,
        name: data.name,
        target_amount: data.target_amount || null,
        icon: data.icon || 'PiggyBank',
        color: data.color || '#10B981',
        cdi_rate_annual: data.cdi_rate_annual || 14.15,
        currency: data.currency || 'BRL',
        balance: 0,
        principal_amount: 0,
        total_yield: 0,
        family_id: data.family_id || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Create piggy bank error:', error);
      toast.error('Erro ao criar meta');
      return null;
    }

    setPiggyBanks(prev => [...prev, newPiggy as PiggyBank]);
    toast.success('Meta criado!');
    return newPiggy as PiggyBank;
  }, [userId]);

  const updatePiggyBank = useCallback(async (id: string, updates: Partial<PiggyBank>) => {
    const { error } = await supabase
      .from('piggy_bank')
      .update(updates)
      .eq('id', id);

    if (error) {
      toast.error('Erro ao atualizar meta');
      return;
    }

    setPiggyBanks(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  }, []);

  const updatePiggyBankCdiRate = useCallback(async (piggyBankId: string, rate: number) => {
    if (!userId) return;

    const { error } = await supabase
      .from('piggy_bank')
      .update({ cdi_rate_annual: rate })
      .eq('id', piggyBankId);

    if (error) {
      toast.error('Erro ao atualizar taxa CDI');
      return;
    }

    setPiggyBanks(prev => prev.map(p => p.id === piggyBankId ? { ...p, cdi_rate_annual: rate } : p));
    toast.success('Taxa CDI atualizada!');
  }, [userId]);

  const deletePiggyBank = useCallback(async (id: string) => {
    const { data, error } = await supabase
      .from('piggy_bank')
      .delete()
      .eq('id', id)
      .select('id');

    if (error) {
      console.error('Delete piggy bank error:', error);
      toast.error('Erro ao excluir meta');
      return false;
    }

    if (!data || data.length === 0) {
      toast.error('Você não tem permissão para excluir este meta');
      return false;
    }

    setPiggyBanks(prev => prev.filter(p => p.id !== id));
    toast.success('Meta excluído');
    return true;
  }, []);

  const depositToPiggyBank = useCallback(async (piggyBankId: string, amount: number, description?: string) => {
    if (!userId) return;

    const piggy = piggyBanks.find(p => p.id === piggyBankId);
    if (!piggy) return;

    const currentBalance = Number(piggy.balance) || 0;
    const currentPrincipal = Number(piggy.principal_amount) || 0;
    const newBalance = currentBalance + amount;
    const newPrincipal = currentPrincipal + amount;
    
    // Set yield_start_date if this is the first deposit
    const yieldStartDate = piggy.yield_start_date || new Date().toISOString();
    
    // Check if target is reached
    const targetAmount = Number(piggy.target_amount) || 0;
    const isCompleted = targetAmount > 0 && newBalance >= targetAmount;

    const [{ error: updateError }, { error: transactionError }] = await Promise.all([
      supabase.from('piggy_bank').update({ 
        balance: newBalance,
        principal_amount: newPrincipal,
        yield_start_date: yieldStartDate,
        is_completed: isCompleted,
      }).eq('id', piggyBankId),
      supabase.from('piggy_bank_transactions').insert({
        user_id: userId,
        piggy_bank_id: piggyBankId,
        type: 'deposit',
        amount,
        description: description || null,
      }),
    ]);

    if (updateError || transactionError) {
      toast.error('Erro ao depositar');
      return;
    }

    setPiggyBanks(prev => prev.map(p => p.id === piggyBankId ? { 
      ...p, 
      balance: newBalance,
      principal_amount: newPrincipal,
      yield_start_date: yieldStartDate,
      is_completed: isCompleted,
    } : p));
    
    const { data: transactionsData } = await supabase
      .from('piggy_bank_transactions')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (transactionsData) {
      setPiggyBankTransactions(transactionsData as PiggyBankTransaction[]);
    }

    if (isCompleted) {
      toast.success('🎉 Meta alcançada!');
    } else {
      toast.success(`+${formatCurrency(amount)} depositado!`);
    }
  }, [userId, piggyBanks]);

  const withdrawFromPiggyBank = useCallback(async (piggyBankId: string, amount: number, description?: string) => {
    if (!userId) return;

    const piggy = piggyBanks.find(p => p.id === piggyBankId);
    if (!piggy) return;

    const currentBalance = Number(piggy.balance) || 0;
    const currentPrincipal = Number(piggy.principal_amount) || 0;
    
    if (amount > currentBalance) {
      toast.error('Saldo insuficiente no meta');
      return;
    }

    const newBalance = currentBalance - amount;
    // Proportionally reduce principal based on withdrawal
    const withdrawalRatio = currentBalance > 0 ? amount / currentBalance : 0;
    const principalWithdrawal = currentPrincipal * withdrawalRatio;
    const newPrincipal = Math.max(0, currentPrincipal - principalWithdrawal);

    const [{ error: updateError }, { error: transactionError }] = await Promise.all([
      supabase.from('piggy_bank').update({ 
        balance: newBalance,
        principal_amount: newPrincipal,
        is_completed: false,
      }).eq('id', piggyBankId),
      supabase.from('piggy_bank_transactions').insert({
        user_id: userId,
        piggy_bank_id: piggyBankId,
        type: 'withdraw',
        amount,
        description: description || null,
      }),
    ]);

    if (updateError || transactionError) {
      toast.error('Erro ao retirar');
      return;
    }

    setPiggyBanks(prev => prev.map(p => p.id === piggyBankId ? { 
      ...p, 
      balance: newBalance,
      principal_amount: newPrincipal,
      is_completed: false,
    } : p));
    
    const { data: transactionsData } = await supabase
      .from('piggy_bank_transactions')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (transactionsData) {
      setPiggyBankTransactions(transactionsData as PiggyBankTransaction[]);
    }

    toast.success(`${formatCurrency(amount)} retirado do meta`);
  }, [userId, piggyBanks]);

  const deletePiggyBankTransaction = useCallback(async (transactionId: string) => {
    if (!userId) return false;

    // Find the transaction to get its amount and type
    const transaction = piggyBankTransactions.find(t => t.id === transactionId);
    if (!transaction) {
      toast.error('Transação não encontrada');
      return false;
    }

    const piggy = piggyBanks.find(p => p.id === transaction.piggy_bank_id);
    if (!piggy) {
      toast.error('Meta não encontrado');
      return false;
    }

    const currentBalance = Number(piggy.balance) || 0;
    const currentPrincipal = Number(piggy.principal_amount) || 0;
    const transactionAmount = Number(transaction.amount);
    
    // Reverse the transaction effect on balance and principal
    let newBalance: number;
    let newPrincipal: number;
    if (transaction.type === 'deposit') {
      newBalance = currentBalance - transactionAmount;
      newPrincipal = Math.max(0, currentPrincipal - transactionAmount);
    } else {
      newBalance = currentBalance + transactionAmount;
      newPrincipal = currentPrincipal + transactionAmount;
    }

    // Ensure balance doesn't go negative
    if (newBalance < 0) {
      toast.error('Não é possível excluir: saldo ficaria negativo');
      return false;
    }

    const [{ error: deleteError }, { error: updateError }] = await Promise.all([
      supabase.from('piggy_bank_transactions').delete().eq('id', transactionId),
      supabase.from('piggy_bank').update({ 
        balance: newBalance,
        principal_amount: newPrincipal,
      }).eq('id', piggy.id),
    ]);

    if (deleteError || updateError) {
      console.error('Delete piggy transaction error:', deleteError || updateError);
      toast.error('Erro ao excluir transação');
      return false;
    }

    setPiggyBanks(prev => prev.map(p => p.id === piggy.id ? { ...p, balance: newBalance, principal_amount: newPrincipal } : p));
    setPiggyBankTransactions(prev => prev.filter(t => t.id !== transactionId));
    toast.success('Transação excluída!');
    return true;
  }, [userId, piggyBanks, piggyBankTransactions]);

  // === PROFILE ===
  const updateProfile = useCallback(async (updates: Partial<Profile>) => {
    if (!profile) return;

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', profile.id);

    if (error) {
      toast.error('Erro ao atualizar perfil');
      return;
    }

    setProfile(prev => prev ? { ...prev, ...updates } : null);
    
    if (updates.currency) {
      setSettings({
        currency: updates.currency,
        currencySymbol: updates.currency === 'BRL' ? 'R$' : updates.currency === 'USD' ? '$' : '€',
      });
    }

    toast.success('Perfil atualizado!');
  }, [profile]);

  // === CALCULATIONS ===
  const getTransactionsForMonth = useCallback((date: Date) => {
    const start = startOfMonth(date);
    const end = endOfMonth(date);
    return transactions.filter(t => {
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

  const totalBalance = useMemo(() => {
    const income = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    const expense = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    return income - expense;
  }, [transactions]);

  const getCategoryStats = useCallback((date: Date, type: 'income' | 'expense'): CategoryStats[] => {
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

  const getMonthlyStats = useCallback((months: number = 6): MonthlyStats[] => {
    const stats: MonthlyStats[] = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthTransactions = getTransactionsForMonth(date);
      
      const income = monthTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      const expense = monthTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      stats.push({
        month: format(date, 'MMM', { locale: ptBR }),
        income,
        expense,
        balance: income - expense,
      });
    }

    return stats;
  }, [getTransactionsForMonth]);

  const recentTransactions = useMemo(() => {
    return transactions.slice(0, 10);
  }, [transactions]);

  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: settings.currency,
    }).format(amount);
  }, [settings.currency]);

  const clearAllData = useCallback(async () => {
    if (!userId) return;

    try {
      await Promise.all([
        supabase.from('transactions').delete().eq('user_id', userId),
        supabase.from('savings_goals').delete().eq('user_id', userId),
        supabase.from('piggy_bank_transactions').delete().eq('user_id', userId),
        supabase.from('piggy_bank').update({ balance: 0 }).eq('user_id', userId),
      ]);

      setTransactions([]);
      setSavingsGoals([]);
      setPiggyBankTransactions([]);
      setPiggyBanks(prev => prev.map(p => ({ ...p, balance: 0, principal_amount: 0 })));
      
      toast.success('Dados limpos com sucesso');
    } catch (error) {
      toast.error('Erro ao limpar dados');
    }
  }, [userId]);

  return {
    // Data
    transactions,
    categories,
    savingsGoals,
    piggyBanks,
    piggyBankTransactions,
    profile,
    settings,
    recentTransactions,
    totalBalance,
    currentMonthStats,
    isLoading,

    // Transaction actions
    addTransaction,
    deleteTransaction,
    updateTransaction,

    // Category actions
    addCategory,
    updateCategory,
    deleteCategory,
    getCategoryById,

    // Savings goals actions
    addSavingsGoal,
    updateSavingsGoal,
    addToSavingsGoal,
    deleteSavingsGoal,

    // Piggy bank actions
    createPiggyBank,
    updatePiggyBank,
    deletePiggyBank,
    depositToPiggyBank,
    withdrawFromPiggyBank,
    deletePiggyBankTransaction,
    updatePiggyBankCdiRate,

    // Profile actions
    updateProfile,

    // Calculations
    getTransactionsForMonth,
    getCategoryStats,
    getMonthlyStats,
    formatCurrency,
    setSettings,
    clearAllData,
  };
}
