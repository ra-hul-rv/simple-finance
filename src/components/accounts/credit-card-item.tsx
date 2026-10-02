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
    <Card className="glass relative overflow-hidden border-border/40 rounded-2xl card-hover">
      <CardContent className="p-5 space-y-4">
        {/* Card Header with actions */}
        <div className="flex items-start justify-between">
          <div className="space-y-0.5">
            <h3 className="text-base font-bold truncate max-w-[200px]">{cc.cardName}</h3>
            {cc.lastFourDigits && (
              <span className="text-[11px] text-muted-foreground font-mono">
                •••• {cc.lastFourDigits}
              </span>
            )}
          </div>
          <div className="flex gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 rounded-lg hover:bg-accent"
              onClick={onEdit}
            >
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Flippable Card Visual */}
        <div className="flex justify-center">
          <CreditCardVisual
            template={template}
            cardNumber={cc.cardNumber}
            lastFourDigits={cc.lastFourDigits}
            cardHolderName={cc.cardHolderName}
            expiryDate={cc.expiryDate}
            cvv={cc.cvv}
            size="md"
          />
        </div>

        {/* Usage Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Credit Usage</span>
            <span className={cn("font-semibold tabular-nums", usagePct > 80 && "text-destructive")}>
              {usagePct.toFixed(1)}%
            </span>
          </div>
          <Progress
            value={Math.min(usagePct, 100)}
            className="h-2 rounded-full"
          />
        </div>

        {/* Outstanding & Available */}
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Outstanding</p>
            <p className="font-bold text-base tabular-nums text-destructive">
              {formatCurrency(cc.outstandingBalance)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Available</p>
            <p className="font-bold text-base tabular-nums text-emerald-500">
              {formatCurrency(cc.availableCredit)}
            </p>
          </div>
        </div>

        {/* Billing Info Row */}
        <div className="grid grid-cols-3 gap-2 text-[10px] bg-accent/20 rounded-xl p-3 border border-border/20">
          <div className="flex flex-col gap-0.5">
            <span className="text-muted-foreground font-semibold flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Statement
            </span>
            <span className="font-medium">
              {cc.statementDate ? `${cc.statementDate}${getOrdinalSuffix(cc.statementDate)}` : '—'}
            </span>
          </div>
          <div className="flex flex-col gap-0.5 border-l border-border/30 pl-2.5">
            <span className="text-muted-foreground font-semibold">Due Date</span>
            <span className="font-semibold text-destructive">
              {cc.dueDate ? `${cc.dueDate}${getOrdinalSuffix(cc.dueDate)}` : '—'}
            </span>
          </div>
          <div className="flex flex-col gap-0.5 border-l border-border/30 pl-2.5">
            <span className="text-muted-foreground font-semibold flex items-center gap-1">
              <Clock className="h-3 w-3" /> Last Paid
            </span>
            <span className="font-medium truncate text-emerald-500">
              {cc.lastPaidDate ? new Date(cc.lastPaidDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
            </span>
          </div>
        </div>

        {/* Rewards */}
        {cc.rewardsBalance > 0 && (
          <div className="flex items-center justify-between text-xs bg-amber-500/5 rounded-lg px-3 py-2 border border-amber-500/10">
            <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
              <Award className="h-3.5 w-3.5" /> Reward Points
            </span>
            <span className="font-bold tabular-nums">{cc.rewardsBalance.toLocaleString()}</span>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-border/30 pt-3 flex justify-between items-center">
          <Link
            href={`/accounts/${accountId}`}
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-0.5"
          >
            View Card Ledger
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
          <Badge variant="outline" className="text-[9px] font-mono">
            {formatCurrency(cc.creditLimit)} limit
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
