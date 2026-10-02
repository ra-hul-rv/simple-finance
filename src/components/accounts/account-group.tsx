'use client';

import * as React from 'react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';
import { Badge } from '@/components/ui/badge';

interface AccountGroupProps {
  title: string;
  icon: React.ReactNode;
  count: number;
  totalBalance: number;
  defaultExpanded?: boolean;
  children: React.ReactNode;
  balanceLabel?: string; // e.g. 'Total Balance', 'Total Outstanding', 'Total Value'
  balanceVariant?: 'default' | 'destructive'; // red for liabilities
}

export function AccountGroup({
  title,
  icon,
  count,
  totalBalance,
  defaultExpanded = true,
  children,
  balanceLabel = 'Total Balance',
  balanceVariant = 'default',
}: AccountGroupProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="flex flex-col mb-8 last:mb-0">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "flex items-center justify-between w-full p-4 mb-4",
          "bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm border border-zinc-200 dark:border-zinc-800 rounded-xl",
          "hover:bg-white/80 dark:hover:bg-zinc-900/80 transition-colors",
          "group"
        )}
      >
        <div className="flex items-center gap-3">
          <div className="text-zinc-500 dark:text-zinc-400">
            {icon}
          </div>
          <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            {title}
          </h2>
          <Badge variant="secondary" className="ml-2 bg-zinc-100 dark:bg-zinc-800">
            {count}
          </Badge>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end text-sm">
            <span className="text-zinc-500 dark:text-zinc-400">{balanceLabel}</span>
            <span className={cn(
              "font-semibold tabular-nums",
              balanceVariant === 'destructive' ? "text-red-600 dark:text-red-400" : "text-zinc-900 dark:text-zinc-100"
            )}>
              {formatCurrency(totalBalance)}
            </span>
          </div>
          <ChevronDown
            className={cn(
              "h-5 w-5 text-zinc-400 transition-transform duration-200",
              isExpanded ? "rotate-180" : ""
            )}
          />
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="pt-2">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
