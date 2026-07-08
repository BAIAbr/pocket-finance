// BRL currency helpers - digit-only input mask.
// User types digits; we treat them as cents.

export function digitsToCents(input: string): number {
  const digits = (input ?? '').replace(/\D/g, '');
  if (!digits) return 0;
  return parseInt(digits, 10);
}

export function centsToNumber(cents: number): number {
  return (cents || 0) / 100;
}

export function numberToCents(value: number): number {
  return Math.round((value || 0) * 100);
}

export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);
}

export function formatBRLFromDigits(input: string): string {
  return formatBRL(centsToNumber(digitsToCents(input)));
}

/** Human-friendly duration in months -> "X anos e Y meses" */
export function formatDuration(months: number | null | undefined): string {
  if (months == null || !isFinite(months)) return '—';
  const total = Math.max(0, Math.round(months));
  if (total === 0) return 'imediato';
  const y = Math.floor(total / 12);
  const m = total % 12;
  const parts: string[] = [];
  if (y > 0) parts.push(`${y} ${y === 1 ? 'ano' : 'anos'}`);
  if (m > 0) parts.push(`${m} ${m === 1 ? 'mês' : 'meses'}`);
  return parts.join(' e ') || '0 meses';
}

/** Add months to today and return a Date. */
export function futureDate(months: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() + Math.round(months));
  return d;
}

export function formatMonthYear(date: Date): string {
  const s = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}
