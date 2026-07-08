// Pure planning math. No IA, no external calls — 100% local.
// Compound interest with monthly contributions.

export interface SimulationPoint {
  month: number;
  invested: number;      // principal + all contributions to this month
  yield: number;         // total interest accumulated
  balance: number;       // invested + yield
}

export interface GoalSimulationInput {
  initial: number;
  monthly: number;
  annualRate: number; // e.g. 14.15 (%)
  months: number;
}

export function monthlyRateFromAnnual(annualRate: number): number {
  return Math.pow(1 + annualRate / 100, 1 / 12) - 1;
}

/**
 * Simulate compound growth with monthly contributions.
 * Yield is applied first on the previous balance, then the monthly contribution is added.
 */
export function simulateGoal({ initial, monthly, annualRate, months }: GoalSimulationInput): SimulationPoint[] {
  const r = monthlyRateFromAnnual(annualRate);
  const points: SimulationPoint[] = [];
  let balance = Math.max(0, initial);
  let invested = Math.max(0, initial);
  let totalYield = 0;

  points.push({ month: 0, invested, yield: 0, balance });

  for (let i = 1; i <= Math.max(0, Math.floor(months)); i++) {
    const monthYield = balance * r;
    totalYield += monthYield;
    balance += monthYield + monthly;
    invested += monthly;
    points.push({ month: i, invested, yield: totalYield, balance });
  }

  return points;
}

/**
 * Estimate the number of months required to reach a target amount.
 * Returns null when the goal can never be reached (no growth and no contribution).
 * Caps at 1200 months (100 years) to avoid infinite loops.
 */
export function monthsToReach(target: number, initial: number, monthly: number, annualRate: number): number | null {
  if (target <= initial) return 0;
  const r = monthlyRateFromAnnual(annualRate);
  if (r <= 0 && monthly <= 0) return null;

  let balance = initial;
  let months = 0;
  const cap = 1200;
  while (balance < target && months < cap) {
    balance = balance * (1 + r) + monthly;
    months++;
  }
  return balance >= target ? months : null;
}

/**
 * Required monthly contribution to hit `target` in `months` given `annualRate`.
 * Uses the future value of an annuity formula, solved for PMT.
 */
export function requiredMonthlyContribution(target: number, initial: number, annualRate: number, months: number): number {
  if (months <= 0) return Math.max(0, target - initial);
  const r = monthlyRateFromAnnual(annualRate);
  const growth = Math.pow(1 + r, months);
  const fvInitial = initial * growth;
  const remaining = target - fvInitial;
  if (remaining <= 0) return 0;
  if (r === 0) return remaining / months;
  const annuityFactor = (growth - 1) / r;
  return remaining / annuityFactor;
}

export function projectPatrimony(currentBalance: number, monthlyContribution: number, annualRate: number, years: number): SimulationPoint[] {
  return simulateGoal({
    initial: currentBalance,
    monthly: monthlyContribution,
    annualRate,
    months: Math.round(years * 12),
  });
}

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}
