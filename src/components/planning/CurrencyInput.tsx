import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { centsToNumber, digitsToCents, formatBRL, numberToCents } from '@/lib/currency';

interface Props {
  value: number; // numeric value in reais
  onChange: (value: number) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  id?: string;
}

/**
 * Digit-only currency input that always displays "R$ 0,00" style.
 * User types digits; caret stays at end. Non-digit input is ignored.
 */
export const CurrencyInput = forwardRef<HTMLInputElement, Props>(
  ({ value, onChange, placeholder = 'R$ 0,00', className, disabled, autoFocus, id }, ref) => {
    const cents = numberToCents(value);
    const display = cents === 0 ? '' : formatBRL(centsToNumber(cents));

    return (
      <input
        ref={ref}
        id={id}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        disabled={disabled}
        autoFocus={autoFocus}
        placeholder={placeholder}
        value={display}
        onChange={(e) => {
          const nextCents = digitsToCents(e.target.value);
          onChange(centsToNumber(nextCents));
        }}
        onKeyDown={(e) => {
          // Prevent letters/symbols so the mask stays consistent.
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
          'w-full px-3 py-2.5 rounded-xl bg-secondary/50 border border-border text-sm font-semibold tabular-nums focus:outline-none focus:border-primary transition-colors',
          className,
        )}
      />
    );
  },
);
CurrencyInput.displayName = 'CurrencyInput';
