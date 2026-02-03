import { useMemo } from 'react';

// CDI Constants - Based on Brazilian Central Bank reference rate
// Base CDI rate (taxa SELIC atual aproximada)
const BASE_CDI_ANNUAL_RATE = 14.15; // 14.15% per year - taxa base do CDI
const DAYS_IN_YEAR = 252; // Brazilian market uses 252 trading days

// Default percentage of CDI (100% = paga exatamente o CDI)
const DEFAULT_CDI_PERCENTAGE = 100;

/**
 * Convert CDI percentage to effective annual rate
 * Ex: 100% CDI with base 14.15% = 14.15% annual
 * Ex: 110% CDI with base 14.15% = 15.565% annual
 */
export function cdiPercentageToAnnualRate(cdiPercentage: number): number {
  return (cdiPercentage / 100) * BASE_CDI_ANNUAL_RATE;
}

/**
 * Convert annual rate back to CDI percentage
 */
export function annualRateToCdiPercentage(annualRate: number): number {
  return (annualRate / BASE_CDI_ANNUAL_RATE) * 100;
}

export interface YieldCalculation {
  principalAmount: number;        // Valor aportado
  totalYield: number;             // Total rendido
  updatedBalance: number;         // Saldo atualizado (principal + yield)
  dailyYield: number;             // Rendimento do dia
  daysInvested: number;           // Dias investidos
  effectiveRate: number;          // Taxa efetiva no período
  annualRate: number;             // Taxa anual configurada
  cdiPercentage: number;          // Percentual do CDI (100%, 110%, etc)
}

export interface YieldHistoryPoint {
  date: string;
  principal: number;
  yield: number;
  balance: number;
}

/**
 * Calculate CDI-based yield using compound interest formula
 * Formula: FV = PV × (1 + r)^n
 * Where:
 * - FV = Future Value (balance with yield)
 * - PV = Present Value (principal)
 * - r = Daily rate (annual rate / 252)
 * - n = Number of days
 */
function calculateCompoundYield(
  principal: number,
  annualRate: number,
  days: number
): number {
  if (principal <= 0 || days <= 0) return 0;
  
  const dailyRate = annualRate / 100 / DAYS_IN_YEAR;
  const futureValue = principal * Math.pow(1 + dailyRate, days);
  return futureValue - principal;
}

/**
 * Calculate daily yield for a specific day
 * This is the yield earned on that single day
 */
function calculateDailyYield(
  balanceBeforeToday: number,
  annualRate: number
): number {
  if (balanceBeforeToday <= 0) return 0;
  
  const dailyRate = annualRate / 100 / DAYS_IN_YEAR;
  return balanceBeforeToday * dailyRate;
}

/**
 * Generate yield history for chart display
 * Shows evolution over time
 */
function generateYieldHistory(
  principal: number,
  annualRate: number,
  startDate: Date,
  endDate: Date = new Date()
): YieldHistoryPoint[] {
  const history: YieldHistoryPoint[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Normalize dates to start of day
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  
  // Calculate days between dates
  const diffTime = end.getTime() - start.getTime();
  const totalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (totalDays <= 0 || principal <= 0) {
    return [{
      date: end.toISOString().split('T')[0],
      principal,
      yield: 0,
      balance: principal
    }];
  }
  
  // For performance, limit to max 90 data points
  const step = Math.max(1, Math.floor(totalDays / 90));
  
  for (let i = 0; i <= totalDays; i += step) {
    const currentDate = new Date(start);
    currentDate.setDate(start.getDate() + i);
    
    const yieldAmount = calculateCompoundYield(principal, annualRate, i);
    
    history.push({
      date: currentDate.toISOString().split('T')[0],
      principal,
      yield: yieldAmount,
      balance: principal + yieldAmount
    });
  }
  
  // Always include the final day
  if (history.length > 0) {
    const lastPoint = history[history.length - 1];
    const finalDate = end.toISOString().split('T')[0];
    
    if (lastPoint.date !== finalDate) {
      const finalYield = calculateCompoundYield(principal, annualRate, totalDays);
      history.push({
        date: finalDate,
        principal,
        yield: finalYield,
        balance: principal + finalYield
      });
    }
  }
  
  return history;
}

/**
 * Custom hook to calculate CDI-based yield for piggy bank
 */
export function useCdiYield(
  principal: number,
  startDate: Date | string | null,
  annualRate: number = BASE_CDI_ANNUAL_RATE
): YieldCalculation {
  return useMemo(() => {
    if (!startDate || principal <= 0) {
      return {
        principalAmount: principal,
        totalYield: 0,
        updatedBalance: principal,
        dailyYield: 0,
        daysInvested: 0,
        effectiveRate: 0,
        annualRate,
        cdiPercentage: annualRateToCdiPercentage(annualRate)
      };
    }
    
    const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
    const now = new Date();
    
    // Normalize to start of day
    start.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    
    const diffTime = now.getTime() - start.getTime();
    const daysInvested = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
    
    const totalYield = calculateCompoundYield(principal, annualRate, daysInvested);
    const updatedBalance = principal + totalYield;
    
    // Calculate today's yield (yield on yesterday's balance)
    const yesterdayBalance = principal + calculateCompoundYield(principal, annualRate, Math.max(0, daysInvested - 1));
    const dailyYield = calculateDailyYield(yesterdayBalance, annualRate);
    
    // Effective rate in the period
    const effectiveRate = principal > 0 ? (totalYield / principal) * 100 : 0;
    
    return {
      principalAmount: principal,
      totalYield,
      updatedBalance,
      dailyYield,
      daysInvested,
      effectiveRate,
      annualRate,
      cdiPercentage: annualRateToCdiPercentage(annualRate)
    };
  }, [principal, startDate, annualRate]);
}

/**
 * Hook to generate yield history for charts
 */
export function useYieldHistory(
  principal: number,
  startDate: Date | string | null,
  annualRate: number = BASE_CDI_ANNUAL_RATE
): YieldHistoryPoint[] {
  return useMemo(() => {
    if (!startDate || principal <= 0) {
      return [];
    }
    
    const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
    return generateYieldHistory(principal, annualRate, start);
  }, [principal, startDate, annualRate]);
}

/**
 * Format percentage with appropriate precision
 */
export function formatPercentage(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Get estimated future balance
 */
export function estimateFutureBalance(
  principal: number,
  annualRate: number,
  daysFromNow: number
): number {
  const yield_ = calculateCompoundYield(principal, annualRate, daysFromNow);
  return principal + yield_;
}
