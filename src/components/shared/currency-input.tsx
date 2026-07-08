'use client';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { forwardRef, useState } from 'react';

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: number | string;
  onChange: (value: number) => void;
  currency?: string;
  className?: string;
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onChange, currency = '₹', className, ...props }, ref) => {
    const [focused, setFocused] = useState(false);
    const [displayValue, setDisplayValue] = useState(
      typeof value === 'number' ? value.toString() : value
    );

    const formatNumber = (num: number): string => {
      return num.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/[^0-9.]/g, '');
      // Allow only one decimal point
      const parts = raw.split('.');
      const sanitized = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : raw;
      setDisplayValue(sanitized);
      const num = parseFloat(sanitized);
      if (!isNaN(num)) {
        onChange(num);
      } else if (sanitized === '' || sanitized === '.') {
        onChange(0);
      }
    };

    const handleBlur = () => {
      setFocused(false);
      const num = parseFloat(displayValue);
      if (!isNaN(num)) {
        setDisplayValue(formatNumber(num));
      } else {
        setDisplayValue('0.00');
      }
    };

    const handleFocus = () => {
      setFocused(true);
      const num = parseFloat(displayValue.replace(/,/g, ''));
      if (!isNaN(num) && num !== 0) {
        setDisplayValue(num.toString());
      } else {
        setDisplayValue('');
      }
    };

    return (
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
          {currency}
        </span>
        <Input
          ref={ref}
          type="text"
          inputMode="decimal"
          value={focused ? displayValue : (typeof value === 'number' ? formatNumber(value) : displayValue)}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={cn('pl-8 tabular-nums text-right', className)}
          {...props}
        />
      </div>
    );
  }
);

CurrencyInput.displayName = 'CurrencyInput';
