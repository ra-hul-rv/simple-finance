'use client';

import { useEffect, useState, useTransition } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress, ProgressTrack, ProgressIndicator } from '@/components/ui/progress';
import { CreditCard as CardIcon, Plus, Calendar, Loader2, Award, Edit2, Trash2, ShieldCheck, Flame, Percent } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

interface CreditCard {
  id: string;
  cardName: string;
  lastFourDigits: string | null;
  cardNumber: string | null;
  cardHolderName: string | null;
  expiryDate: string | null;
  cvv: string | null;
  template: string | null;
  creditLimit: number;
  outstandingBalance: number;
  availableCredit: number;
  dueDate: number | null;
  statementDate: number | null;
  minimumDue: number | null;
  interestRate: number | null;
  rewardsBalance: number;
  color: string;
  accountId: string;
  account: { name: string };
}

interface Account {
  id: string;
  name: string;
  type: string;
}

export default function CreditCardsPage() {
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);
  const [isPending, startTransition] = useTransition();

  const [cardName, setCardName] = useState('');
  const [lastFourDigits, setLastFourDigits] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [outstandingBalance, setOutstandingBalance] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [statementDate, setStatementDate] = useState('');
  const [minimumDue, setMinimumDue] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [rewardsBalance, setRewardsBalance] = useState('');
  const [color, setColor] = useState('#ea580c');
  const [accountId, setAccountId] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolderName, setCardHolderName] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [template, setTemplate] = useState('STANDARD');

  const fetchCreditCards = async () => {
    try {
      const res = await fetch('/api/credit-cards');
      const data = await res.json();
      setCards(data);

      const accRes = await fetch('/api/accounts');
      const accData = await accRes.json();
      const ccAccounts = accData.filter((a: any) => a.type === 'CREDIT_CARD');
      setAccounts(ccAccounts);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCreditCards();
  }, []);

  const handleOpenAddDialog = () => {
    if (accounts.length === 0) {
      toast.error('Please create a Credit Card type Account first');
      return;
    }
    setEditingCard(null);
    setCardName('');
    setLastFourDigits('');
    setCardNumber('');
    setCardHolderName('');
    setExpiryDate('');
    setCvv('');
    setTemplate('STANDARD');
    setCreditLimit('');
    setOutstandingBalance('');
    setDueDate('');
    setStatementDate('');
    setMinimumDue('');
    setInterestRate('');
    setRewardsBalance('0');
    setColor('#ea580c');
    setAccountId(accounts[0]?.id || '');
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (card: CreditCard) => {
    setEditingCard(card);
    setCardName(card.cardName);
    setLastFourDigits(card.lastFourDigits || '');
    setCardNumber(card.cardNumber || '');
    setCardHolderName(card.cardHolderName || '');
    setExpiryDate(card.expiryDate || '');
    setCvv(card.cvv || '');
    setTemplate(card.template || 'STANDARD');
    setCreditLimit(card.creditLimit.toString());
    setOutstandingBalance(card.outstandingBalance.toString());
    setDueDate(card.dueDate?.toString() || '');
    setStatementDate(card.statementDate?.toString() || '');
    setMinimumDue(card.minimumDue?.toString() || '');
    setInterestRate(card.interestRate?.toString() || '');
    setRewardsBalance(card.rewardsBalance.toString());
    setColor(card.color);
    setAccountId(card.accountId);
    setIsDialogOpen(true);
  };

  const handleSaveCard = () => {
    if (!cardName.trim()) {
      toast.error('Please enter a card name');
      return;
    }
    if (!creditLimit || parseFloat(creditLimit) <= 0) {
      toast.error('Please enter a valid limit');
      return;
    }
    if (!accountId) {
      toast.error('Please select an account ledger');
      return;
    }

    const payload = {
      cardName,
      lastFourDigits: lastFourDigits || (cardNumber && cardNumber.length >= 4 ? cardNumber.replace(/\s+/g, '').slice(-4) : null) || null,
      cardNumber: cardNumber || null,
      cardHolderName: cardHolderName || null,
      expiryDate: expiryDate || null,
      cvv: cvv || null,
      template: template || 'STANDARD',
      creditLimit: parseFloat(creditLimit),
      outstandingBalance: parseFloat(outstandingBalance || '0'),
      dueDate: dueDate ? parseInt(dueDate) : null,
      statementDate: statementDate ? parseInt(statementDate) : null,
      minimumDue: minimumDue ? parseFloat(minimumDue) : null,
      interestRate: interestRate ? parseFloat(interestRate) : null,
      rewardsBalance: parseFloat(rewardsBalance || '0'),
      color,
      accountId,
    };

    startTransition(async () => {
      try {
        const url = editingCard ? `/api/credit-cards/${editingCard.id}` : '/api/credit-cards';
        const method = editingCard ? 'PUT' : 'POST';

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to save card');
        }

        toast.success(editingCard ? 'Credit card updated' : 'Credit card linked');
        setIsDialogOpen(false);
        fetchCreditCards();
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || 'Failed to save card');
      }
    });
  };

  const handleDeleteCard = async (id: string) => {
    if (!confirm('Are you sure you want to delete this credit card integration? Linked transactions will not be deleted but card parameters will be wiped.')) {
      return;
    }

    try {
      const res = await fetch(`/api/credit-cards/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete card');
      toast.success('Credit card integration removed');
      fetchCreditCards();
    } catch (err) {
      console.error(err);
      toast.error('Failed to remove credit card');
    }
  };

  const totalLimit = cards.reduce((sum, c) => sum + c.creditLimit, 0);
  const totalOutstanding = cards.reduce((sum, c) => sum + c.outstandingBalance, 0);
  const totalAvailable = totalLimit - totalOutstanding;

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <PageHeader title="Credit Cards" description="Monitor limits, outstanding balances, payment calendars, and card details" />
        <Button onClick={handleOpenAddDialog} className="gradient-primary text-white font-semibold">
          <Plus className="mr-1.5 h-4 w-4" />
          Link Card
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Total Credit Limit"
          value={totalLimit}
          prefix="₹"
          icon={<CardIcon className="h-4 w-4 text-primary" />}
        />
        <StatCard
          title="Consolidated Outstanding"
          value={totalOutstanding}
          prefix="₹"
          icon={<Calendar className="h-4 w-4 text-destructive" />}
        />
        <StatCard
          title="Available Credit"
          value={totalAvailable}
          prefix="₹"
          icon={<Calendar className="h-4 w-4 text-success" />}
        />
      </div>

      {/* Virtual Credit Cards Render Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {cards.map((card) => {
          const usagePct = (card.outstandingBalance / card.creditLimit) * 100;
          return (
            <Card key={card.id} className="glass relative overflow-hidden border-border bg-card/60 backdrop-blur-xl transition-all duration-200 card-hover">
              <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: card.color || '#ea580c' }} />

              <CardHeader className="pl-6 pb-2">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg font-bold">
                        {card.cardName}
                      </CardTitle>
                      {card.lastFourDigits && (
                        <span className="text-xs text-muted-foreground font-mono">
                          (•••• {card.lastFourDigits})
                        </span>
                      )}
                    </div>
                    <CardDescription className="text-xs">Linked Ledger: {card.account.name}</CardDescription>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 rounded hover:bg-accent"
                      onClick={() => handleOpenEditDialog(card)}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDeleteCard(card.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pl-6 space-y-4">
                {/* Visual Glassmorphic Card Details */}
                <div
                  className="rounded-xl p-5 text-white flex flex-col justify-between relative overflow-hidden shadow-lg border border-white/10"
                  style={{
                    background: `linear-gradient(135deg, ${card.color}bb, #171717f0)`,
                  }}
                >
                  <div className="absolute top-0 right-0 w-32 h-32 rounded-full filter blur-3xl opacity-20" style={{ backgroundColor: card.color }} />
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-white/60 uppercase tracking-widest">Card Provider</span>
                      <span className="font-semibold text-sm">{card.cardName}</span>
                    </div>
                    <CardIcon className="h-7 w-7 opacity-80" />
                  </div>

                  <div className="my-6">
                    <p className="text-[10px] text-white/50 tracking-wider">CARD NUMBER</p>
                    <p className="text-base font-mono tracking-widest mt-0.5">
                      •••• •••• •••• {card.lastFourDigits || '0000'}
                    </p>
                  </div>

                  <div className="flex justify-between items-end text-xs">
                    <div>
                      <p className="text-[9px] text-white/40 uppercase">Statement Date</p>
                      <p className="font-semibold font-mono">{card.statementDate ? `${card.statementDate}th` : 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-white/40 uppercase">Payment Due</p>
                      <p className="font-semibold font-mono">{card.dueDate ? `${card.dueDate}th` : 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-white/40 uppercase">APR Interest</p>
                      <p className="font-semibold font-mono">{card.interestRate ? `${card.interestRate}%` : 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Outstanding & Limit Metrics */}
                <div className="grid grid-cols-2 gap-4 text-sm pt-2">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Outstanding</p>
                    <p className="text-base font-bold text-destructive">{formatCurrency(card.outstandingBalance)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Credit Limit</p>
                    <p className="text-base font-bold">{formatCurrency(card.creditLimit)}</p>
                  </div>
                </div>

                {/* Utilization Progress Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Credit Utilization Ratio</span>
                    <span className={cn(usagePct > 35 ? "text-destructive font-bold" : "")}>{usagePct.toFixed(1)}%</span>
                  </div>
                  <Progress value={Math.min(usagePct, 100)} className="w-full">
                    <ProgressTrack className="h-1.5 bg-muted rounded-full overflow-hidden w-full">
                      <ProgressIndicator
                        className={cn(
                          "h-full transition-all",
                          usagePct > 35 ? "bg-destructive" : usagePct > 20 ? "bg-amber-500" : "bg-success"
                        )}
                        style={{ width: `${Math.min(usagePct, 100)}%` }}
                      />
                    </ProgressTrack>
                  </Progress>
                </div>

                {/* Extra Stats Footer */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/40 text-xs text-muted-foreground">
                  <div>
                    <p className="font-semibold text-foreground">{formatCurrency(card.availableCredit)}</p>
                    <p>Available</p>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground flex items-center gap-0.5"><Award className="h-3 w-3 text-amber-500" /> {card.rewardsBalance.toLocaleString()} pts</p>
                    <p>Rewards</p>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{card.minimumDue ? formatCurrency(card.minimumDue) : 'N/A'}</p>
                    <p>Min Due</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {cards.length === 0 && (
          <div className="col-span-2 text-center py-10 text-muted-foreground text-sm">
            No credit cards linked yet. Click "Link Card" to configure templates.
          </div>
        )}
      </div>

      {/* Add/Edit Card Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[450px] glass border-border bg-card/90 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle>{editingCard ? 'Update Credit Card' : 'Link Credit Card Ledger'}</DialogTitle>
            <DialogDescription>
              Assign credit limit, due dates, interest rates, and rewards parameters to a credit card.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Card Name</Label>
                <Input
                  placeholder="e.g. Amazon Pay Card"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  disabled={isPending}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Last 4 Digits</Label>
                <Input
                  placeholder="e.g. 4820"
                  maxLength={4}
                  value={lastFourDigits}
                  onChange={(e) => setLastFourDigits(e.target.value)}
                  disabled={isPending}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Credit Limit (₹)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 200000"
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(e.target.value)}
                  disabled={isPending}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Outstanding (₹)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 15000"
                  value={outstandingBalance}
                  onChange={(e) => setOutstandingBalance(e.target.value)}
                  disabled={isPending}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Statement Date (1-31)</Label>
                <Input
                  type="number"
                  placeholder="25"
                  value={statementDate}
                  onChange={(e) => setStatementDate(e.target.value)}
                  disabled={isPending}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Due Date (1-31)</Label>
                <Input
                  type="number"
                  placeholder="15"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  disabled={isPending}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Minimum Due (₹)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 1240"
                  value={minimumDue}
                  onChange={(e) => setMinimumDue(e.target.value)}
                  disabled={isPending}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Interest Rate (% p.a.)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 42"
                  value={interestRate}
                  onChange={(e) => setInterestRate(e.target.value)}
                  disabled={isPending}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Linked Ledger Account</Label>
                <Select value={accountId} onValueChange={(val) => setAccountId(val || '')} disabled={isPending}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select Account">
                      {accounts.find(a => a.id === accountId)?.name || 'Select Account'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Card Theme Color</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="color"
                    className="w-12 h-9 p-0.5 border rounded-lg cursor-pointer bg-background"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    disabled={isPending}
                  />
                  <span className="text-xs font-mono">{color}</span>
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="label-uppercase text-muted-foreground">Rewards Points Balance</Label>
              <Input
                type="number"
                placeholder="0"
                value={rewardsBalance}
                onChange={(e) => setRewardsBalance(e.target.value)}
                disabled={isPending}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleSaveCard} disabled={isPending} className="gradient-primary">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : 'Save Card Details'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
