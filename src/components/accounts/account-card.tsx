'use client';

import * as React from 'react';
import Link from 'next/link';
import { Building, Wallet, Edit2, Trash2, ChevronRight, Percent } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface AccountCardProps {
  account: {
    id: string;
    name: string;
    type: string;
    institution: string | null;
    accountNumber: string | null;
    balance: number;
    interestRate: number | null;
    color: string;
    icon: string;
  };
  onEdit: (account: any) => void;
  onDelete: (id: string) => void;
}

const TYPE_LABELS: Record<string, string> = {
  SAVINGS: 'Savings Account',
  CURRENT: 'Current Account',
  CASH: 'Cash',
  WALLET: 'Digital Wallet',
  GIFT_CARD: 'Gift Card',
  FIXED_DEPOSIT: 'Fixed Deposit',
  STOCKS: 'Stocks',
  MUTUAL_FUNDS: 'Mutual Funds',
  CRYPTO: 'Crypto',
  EPF: 'EPF',
  PPF: 'PPF',
  NPS: 'NPS',
  LOAN: 'Loan',
  OTHER: 'Other',
};

export function AccountCard({ account, onEdit, onDelete }: AccountCardProps) {
  const typeLabel = TYPE_LABELS[account.type] || account.type;

  return (
    <Card className="relative overflow-hidden group bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm hover:shadow-md transition-shadow">
      {/* Left color bar */}
      <div 
        className="absolute left-0 top-0 bottom-0 w-1.5 opacity-80"
        style={{ backgroundColor: account.color }}
      />
      
      <CardHeader className="pb-2 pt-4 pl-6">
        <div className="flex items-start justify-between mb-2">
          <Badge variant="outline" className="text-[10px] uppercase font-semibold tracking-wider bg-white dark:bg-zinc-950 rounded-full">
            {typeLabel}
          </Badge>
          
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              onClick={() => onEdit(account)}
            >
              <Edit2 className="h-4 w-4" />
              <span className="sr-only">Edit</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50"
              onClick={() => onDelete(account.id)}
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Delete</span>
            </Button>
          </div>
        </div>

        <div className="space-y-1">
          <CardTitle className="text-base font-bold line-clamp-1">
            {account.name}
          </CardTitle>
          {account.institution && (
            <CardDescription className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Building className="h-3.5 w-3.5" />
              <span className="truncate">{account.institution}</span>
            </CardDescription>
          )}
        </div>
      </CardHeader>

      <CardContent className="pl-6 pb-4">
        <div className="mt-2 mb-4">
          <div className="text-2xl font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
            {formatCurrency(account.balance)}
          </div>
          
          <div className="flex items-center gap-3 mt-2">
            {account.accountNumber && (
              <div className="text-xs text-muted-foreground font-mono bg-zinc-100 dark:bg-zinc-800/50 px-2 py-1 rounded">
                •••• {account.accountNumber.slice(-4)}
              </div>
            )}
            
            {account.interestRate && (
              <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-500 font-medium">
                <Percent className="h-3 w-3" />
                {account.interestRate}%
              </div>
            )}
          </div>
        </div>

        <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
          <Link 
            href={`/accounts/${account.id}`}
            className="flex w-full items-center justify-between h-auto py-2 -mx-2 px-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
          >
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              View Ledger
            </div>
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
