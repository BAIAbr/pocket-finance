import { forwardRef, useMemo } from 'react';
import { cn } from '@/lib/utils';

/**
 * Global money input for the app.
 *
 * Rules (padrão Finango):
 * - User types ONLY digits.
 * - Display is formatted automatically as "R$ 1.000,00" (pt-BR).
 * - Stored/emitted value is a plain decimal string ("1000.50") — never contains
 *   the currency symbol, so DB persistence stays numeric.
 * - Symbol is embedded inside the field; consumers should NOT add an external
 *   "R$" prefix.
 */

export interface MoneyInputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'value' | 'onChange' | 'type' | 'inputMode' | 'pattern'
  > {
  /** Decimal value in the base currency (e.g. reais). Accepts number or numeric string. */
  value: string | number | null | undefined;
  /** Called with a decimal string like "1000.50" (or "" when cleared). */
  onChange: (value: string) => void;
  /** Currency symbol shown as a prefix. Defaults to "R$". */
  symbol?: string;
  /** When true, no symbol prefix is shown (rare). */
  hideSymbol?: boolean;
  /** Extra classes for the input element. */
  className?: string;
  /** Wrapper classes (relative container). */
  wrapperClassName?: string;
  /** Visual error state. */
  hasError?: boolean;
}

function toCents(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === '') return 0;
  const n = typeof value === 'number' ? value : parseFloat(String(value).replace(',', '.'));
  if (!isFinite(n) || isNaN(n)) return 0;
  return Math.round(n * 100);
}

function centsToDecimalString(cents: number): string {
  if (!cents) return '';
  const abs = Math.abs(cents);
  const int = Math.floor(abs / 100);
  const frac = abs % 100;
  return `${cents < 0 ? '-' : ''}${int}.${frac.toString().padStart(2, '0')}`;
}

function formatBRLFromCents(cents: number, symbol: string): string {
  const value = cents / 100;
  const formatted = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return `${symbol} ${formatted}`;
}

export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(
  (
    {
      value,
      onChange,
      symbol = 'R$',
      hideSymbol = false,
      className,
      wrapperClassName,
      hasError,
      placeholder,
      disabled,
      ...rest
    },
    ref,
  ) => {
    const cents = useMemo(() => toCents(value), [value]);
    const display = cents === 0 ? '' : formatBRLFromCents(cents, hideSymbol ? '' : symbol).trimStart();
    const placeholderText = placeholder ?? (hideSymbol ? '0,00' : `${symbol} 0,00`);

    return (
      <input
        ref={ref}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        disabled={disabled}
        placeholder={placeholderText}
        value={display}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, '');
          if (!digits) {
            onChange('');
            return;
          }
          const nextCents = parseInt(digits, 10);
          onChange(centsToDecimalString(nextCents));
        }}
        onKeyDown={(e) => {
          if (
            e.key.length === 1 &&
            !/[0-9]/.test(e.key) &&
            !e.ctrlKey &&
            !e.metaKey
          ) {
            e.preventDefault();
          }
        }}
        className={cn(
          hasError && 'border-destructive',
          'tabular-nums',
          className,
        )}
        {...rest}
      />
    );
  },
);
MoneyInput.displayName = 'MoneyInput';
