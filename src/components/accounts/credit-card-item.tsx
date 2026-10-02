'use client';

import { useState } from 'react';
import { CreditCardVisual } from './credit-card-visual';
import { getTemplate, getOrdinalSuffix, type CardTemplate } from '@/lib/card-templates';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Edit2,
  Trash2,
  ChevronRight,
  Award,
  Calendar,
  Clock,
} from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface CreditCardDetail {
  id: string;
  cardName: string;
  lastFourDigits: string | null;
  cardNumber: string | null;
  cardHolderName: string | null;
  expiryDate: string | null;
  cvv: string | null;
  template: string | null;
  notes: string | null;
  creditLimit: number;
  outstandingBalance: number;
  availableCredit: number;
  dueDate: number | null;
  statementDate: number | null;
  minimumDue: number | null;
  interestRate: number | null;
  rewardsBalance: number;
  color: string;
  lastPaidDate?: string | null;
  order: number;
}

interface CreditCardItemProps {
  accountId: string;
  accountName: string;
  accountColor: string;
  creditCard: CreditCardDetail;
  onEdit: () => void;
  onDelete: () => void;
}

export function CreditCardItem({
  accountId,
  accountName,
  accountColor,
  creditCard: cc,
  onEdit,
  onDelete,
}: CreditCardItemProps) {
  const template = getTemplate(cc.template || 'STANDARD');
  const usagePct = cc.creditLimit > 0 ? (cc.outstandingBalance / cc.creditLimit) * 100 : 0;

  return (
    <div className="relative overflow-hidden border border-border/30 rounded-2xl flex flex-col bg-card/40 backdrop-blur-sm shadow-sm transition-all hover:shadow-md group p-0 m-0">
      
      {/* Top half: Full width Credit Card Visual without its own border radius */}
      <div className="relative w-full overflow-hidden border-b border-border/20">
        {/* We use a negative margin trick or scale to make the visual fit perfectly, or just modify the visual directly */}
        <div className="w-full">
          <CreditCardVisual
            template={template}
            cardNumber={cc.cardNumber}
            lastFourDigits={cc.lastFourDigits}
            cardHolderName={cc.cardHolderName}
            expiryDate={cc.expiryDate}
            cvv={cc.cvv}
            size="full"
            forceFlat={true}
            className="!w-full !max-w-full h-auto aspect-[1.9/1] rounded-t-2xl m-0 p-0"
          />
        </div>
        
        {/* Floating actions over the card */}
        <div className="absolute top-3 right-3 flex gap-1 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 rounded-lg bg-black/40 hover:bg-black/60 text-white backdrop-blur-md border border-white/10"
            onClick={onEdit}
          >
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 rounded-lg bg-black/40 hover:bg-red-500/80 text-white backdrop-blur-md border border-white/10"
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4 flex-1 flex flex-col justify-between">
        
        {/* Usage Progress */}
        <div className="space-y-1.5 mt-1">
          <div className="flex justify-between text-[11px] font-medium tracking-wide">
            <span className="text-muted-foreground uppercase">Credit Usage</span>
            <span className={cn("tabular-nums", usagePct > 80 && "text-destructive")}>
              {usagePct.toFixed(1)}%
            </span>
          </div>
          <Progress
            value={Math.min(usagePct, 100)}
            className="h-1.5 rounded-full bg-secondary/50"
            indicatorClassName={usagePct > 80 ? 'bg-destructive' : 'bg-primary'}
          />
        </div>

        {/* Outstanding & Available */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-0.5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Outstanding</p>
            <p className="font-bold text-lg tabular-nums text-foreground">
              {formatCurrency(cc.outstandingBalance)}
            </p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Available</p>
            <p className="font-bold text-lg tabular-nums text-emerald-500 dark:text-emerald-400">
              {formatCurrency(cc.availableCredit)}
            </p>
          </div>
        </div>

        {/* Billing Info Row */}
        <div className="grid grid-cols-3 gap-2 text-[10px] bg-secondary/30 rounded-xl p-2.5 border border-border/40">
          <div className="flex flex-col gap-0.5">
            <span className="text-muted-foreground font-semibold flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Stmt
            </span>
            <span className="font-medium">
              {cc.statementDate ? `${cc.statementDate}${getOrdinalSuffix(cc.statementDate)}` : '—'}
            </span>
          </div>
          <div className="flex flex-col gap-0.5 border-l border-border/50 pl-2">
            <span className="text-muted-foreground font-semibold">Due</span>
            <span className="font-semibold text-destructive">
              {cc.dueDate ? `${cc.dueDate}${getOrdinalSuffix(cc.dueDate)}` : '—'}
            </span>
          </div>
          <div className="flex flex-col gap-0.5 border-l border-border/50 pl-2">
            <span className="text-muted-foreground font-semibold flex items-center gap-1">
              <Clock className="h-3 w-3" /> Paid
            </span>
            <span className="font-medium truncate text-emerald-600 dark:text-emerald-400">
              {cc.lastPaidDate ? new Date(cc.lastPaidDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
            </span>
          </div>
        </div>

        {/* Rewards */}
        {cc.rewardsBalance > 0 && (
          <div className="flex items-center justify-between text-xs bg-amber-500/10 rounded-lg px-3 py-2 border border-amber-500/20">
            <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold tracking-wide">
              <Award className="h-3.5 w-3.5" /> Rewards
            </span>
            <span className="font-bold tabular-nums text-amber-600 dark:text-amber-400">{cc.rewardsBalance.toLocaleString()} pts</span>
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 flex justify-between items-center mt-auto">
          <Link
            href={`/accounts/${accountId}`}
            className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-0.5"
          >
            View Ledger
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
          <Badge variant="secondary" className="text-[9px] font-mono tracking-wider bg-secondary/50">
            LIMIT: {formatCurrency(cc.creditLimit)}
          </Badge>
        </div>
      </div>
    </div>
  );
}
