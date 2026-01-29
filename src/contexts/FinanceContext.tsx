import React, { createContext, useContext } from 'react';
import { useSupabaseFinance } from '@/hooks/useSupabaseFinance';
import { useAuth } from '@/contexts/AuthContext';

type FinanceContextType = ReturnType<typeof useSupabaseFinance>;

const FinanceContext = createContext<FinanceContextType | null>(null);

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const finance = useSupabaseFinance(user?.id ?? null);
  
  return (
    <FinanceContext.Provider value={finance}>
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinanceContext() {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinanceContext must be used within a FinanceProvider');
  }
  return context;
}
