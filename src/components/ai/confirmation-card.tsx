'use client';

import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertTriangle, Wallet, Tag, Calendar, Building } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

export interface ActionPreview {
  action: string;
  amount: number;
  type: string;
  description: string;
  date: string;
  time?: string | null;
  accountName: string;
  categoryName?: string;
  merchant?: string | null;
  notes?: string | null;
}

interface ConfirmationCardProps {
  actionId: string;
  operationId: string;
  preview: ActionPreview;
  onConfirm: (actionId: string) => void;
  onCancel: (actionId: string) => void;
  isProcessing?: boolean;
}

export function ConfirmationCard({
  actionId,
  preview,
  onConfirm,
  onCancel,
  isProcessing = false,
}: ConfirmationCardProps) {
  const isExpense = preview.type === 'EXPENSE';
  const isIncome = preview.type === 'INCOME';

  return (
    <Card className="my-3 border-primary/40 bg-card/90 shadow-md backdrop-blur-md overflow-hidden">
      <div className="bg-primary/10 border-b border-primary/20 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-warning animate-pulse-soft" />
          <span className="text-xs font-bold uppercase tracking-wider text-primary">
            Explicit Confirmation Required
          </span>
        </div>
        <Badge
          variant="outline"
          className={cn(
            'text-[10px] font-bold uppercase px-2 py-0.5',
            isExpense && 'border-destructive/40 text-destructive bg-destructive/10',
            isIncome && 'border-success/40 text-success bg-success/10'
          )}
        >
          {preview.type}
        </Badge>
      </div>

      <CardContent className="p-4 space-y-4">
        {/* Main description and Amount display */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h4 className="text-base font-bold text-foreground">{preview.description}</h4>
            {preview.merchant && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <Building className="h-3 w-3" />
                {preview.merchant}
              </p>
            )}
          </div>
          <div className="text-right">
            <span
              className={cn(
                'text-xl font-bold tabular-nums',
                isExpense ? 'text-foreground' : 'text-success'
              )}
            >
              {isExpense ? '-' : '+'}{formatCurrency(preview.amount)}
            </span>
          </div>
        </div>

        {/* Structured metadata grid */}
        <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-muted/30 border border-border/40 text-xs">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Wallet className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="truncate">
              Account: <strong className="text-foreground">{preview.accountName}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Tag className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="truncate">
              Category: <strong className="text-foreground">{preview.categoryName || 'Uncategorized'}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="truncate">
              Date: <strong className="text-foreground">{preview.date}</strong>
              {preview.time && <span className="text-foreground/90 font-medium"> ({preview.time})</span>}
            </span>
          </div>
          {preview.notes && (
            <div className="col-span-2 text-muted-foreground truncate pt-1 border-t border-border/30">
              Note: <span className="text-foreground">{preview.notes}</span>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="bg-muted/15 border-t border-border/40 px-4 py-2.5 flex items-center justify-end gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isProcessing}
          onClick={() => onCancel(actionId)}
          className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <XCircle className="h-3.5 w-3.5" />
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={isProcessing}
          onClick={() => onConfirm(actionId)}
          className="h-8 gap-1.5 text-xs bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          {isProcessing ? 'Processing...' : 'Confirm and Save'}
        </Button>
      </CardFooter>
    </Card>
  );
}
