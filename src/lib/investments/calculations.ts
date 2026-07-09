// Local investment calculations - pure functions, no external deps.

export interface Tx {
  kind: 'buy' | 'sell';
  quantity: number;
  unit_price: number;
  total: number;
  date: string;
}

export interface Dividend {
  amount: number;
  pay_date: string;
}

export interface AssetPosition {
  quantity: number;
  invested: number;
  averagePrice: number;
  totalBought: number;
  totalSold: number;
}

export function computePosition(txs: Tx[]): AssetPosition {
  let qty = 0;
  let invested = 0;
  let totalBought = 0;
  let totalSold = 0;
  for (const t of txs) {
    if (t.kind === 'buy') {
      const newQty = qty + t.quantity;
      invested = invested + t.total;
      qty = newQty;
      totalBought += t.total;
    } else {
      // sell: reduce invested proportionally at average price
      const avg = qty > 0 ? invested / qty : 0;
      const sellQty = Math.min(qty, t.quantity);
      invested = Math.max(0, invested - sellQty * avg);
      qty = qty - sellQty;
      totalSold += t.total;
    }
  }
  const averagePrice = qty > 0 ? invested / qty : 0;
  return { quantity: qty, invested, averagePrice, totalBought, totalSold };
}

export interface AssetMetrics {
  quantity: number;
  invested: number;
  averagePrice: number;
  currentPrice: number | null;
  patrimony: number;
  profit: number;
  profitPct: number;
  dividendsReceived: number;
}

export function computeAssetMetrics(
  txs: Tx[],
  dividends: Dividend[],
  currentPrice: number | null,
): AssetMetrics {
  const p = computePosition(txs);
  const dividendsReceived = dividends.reduce((s, d) => s + Number(d.amount || 0), 0);
  const patrimony = currentPrice != null ? p.quantity * currentPrice : p.invested;
  const profit = currentPrice != null ? patrimony - p.invested : 0;
  const profitPct = p.invested > 0 && currentPrice != null ? (profit / p.invested) * 100 : 0;
  return {
    quantity: p.quantity,
    invested: p.invested,
    averagePrice: p.averagePrice,
    currentPrice,
    patrimony,
    profit,
    profitPct,
    dividendsReceived,
  };
}

/** Simulator: how many shares fit in an available amount. */
export function simulatePurchase(available: number, price: number) {
  if (!price || price <= 0) return { shares: 0, used: 0, remaining: available };
  const shares = Math.floor(available / price);
  const used = shares * price;
  return { shares, used, remaining: available - used };
}

/** Projection: monthly compound with optional dividend reinvestment.
 * monthlyContribution in currency, months, monthlyYield e.g. dividend yield / 12,
 * reinvest: if true adds dividends back to principal.
 */
export interface ProjectionInput {
  monthlyContribution: number;
  months: number;
  monthlyDividendYield: number; // e.g. 0.008 for 0.8% ao mês
  monthlyPriceGrowth?: number; // e.g. 0.005 for 0.5% ao mês
  initialPatrimony?: number;
  reinvest: boolean;
}

export interface ProjectionPoint {
  month: number;
  contributed: number;
  patrimony: number;
  monthlyDividend: number;
  accumulatedDividends: number;
}

export function projectPortfolio(input: ProjectionInput): ProjectionPoint[] {
  const {
    monthlyContribution,
    months,
    monthlyDividendYield,
    monthlyPriceGrowth = 0,
    initialPatrimony = 0,
    reinvest,
  } = input;

  const points: ProjectionPoint[] = [];
  let patrimony = initialPatrimony;
  let contributed = initialPatrimony;
  let accumulatedDividends = 0;

  for (let m = 1; m <= months; m++) {
    patrimony += monthlyContribution;
    contributed += monthlyContribution;
    patrimony *= 1 + monthlyPriceGrowth;
    const dividend = patrimony * monthlyDividendYield;
    accumulatedDividends += dividend;
    if (reinvest) patrimony += dividend;
    points.push({
      month: m,
      contributed,
      patrimony,
      monthlyDividend: dividend,
      accumulatedDividends,
    });
  }
  return points;
}
