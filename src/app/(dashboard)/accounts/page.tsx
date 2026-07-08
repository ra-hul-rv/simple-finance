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
import { Textarea } from '@/components/ui/textarea';
import {
  Plus,
  Edit2,
  Trash2,
  Wallet,
  TrendingUp,
  CreditCard,
  Building,
  Loader2,
  ChevronRight,
  ArrowLeftRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/format';
import Link from 'next/link';

interface Account {
  id: string;
  name: string;
  type: string;
  institution: string | null;
  accountNumber: string | null;
  balance: number;
  openingBalance: number;
  currency: string;
  interestRate: number | null;
  creditLimit: number | null;
  color: string;
  icon: string;
  notes: string | null;
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog forms
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [isPending, startTransition] = useTransition();

  // Form states
  const [name, setName] = useState('');
  const [type, setType] = useState('SAVINGS');
  const [institution, setInstitution] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [balance, setBalance] = useState('');
  const [openingBalance, setOpeningBalance] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [icon, setIcon] = useState('wallet');
  const [notes, setNotes] = useState('');

  const fetchAccounts = async () => {
    try {
      const res = await fetch('/api/accounts');
      if (!res.ok) throw new Error('Failed to load accounts');
      const data = await res.json();
      setAccounts(data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleOpenAddDialog = () => {
    setEditingAccount(null);
    setName('');
    setType('SAVINGS');
    setInstitution('');
    setAccountNumber('');
    setBalance('0');
    setOpeningBalance('0');
    setInterestRate('');
    setCreditLimit('');
    setColor('#6366f1');
    setIcon('wallet');
    setNotes('');
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (account: Account) => {
    setEditingAccount(account);
    setName(account.name);
    setType(account.type);
    setInstitution(account.institution || '');
    setAccountNumber(account.accountNumber || '');
    setBalance(account.balance.toString());
    setOpeningBalance(account.openingBalance.toString());
    setInterestRate(account.interestRate?.toString() || '');
    setCreditLimit(account.creditLimit?.toString() || '');
    setColor(account.color);
    setIcon(account.icon);
    setNotes(account.notes || '');
    setIsDialogOpen(true);
  };

  const handleSaveAccount = () => {
    if (!name.trim()) {
      toast.error('Please enter a name');
      return;
    }

    startTransition(async () => {
      try {
        const payload = {
          name,
          type,
          institution: institution.trim() || null,
          accountNumber: accountNumber.trim() || null,
          balance: parseFloat(balance || '0'),
          openingBalance: parseFloat(openingBalance || '0'),
          currency: 'INR',
          interestRate: interestRate ? parseFloat(interestRate) : null,
          creditLimit: creditLimit ? parseFloat(creditLimit) : null,
          color,
          icon,
          notes: notes.trim() || null,
        };

        const url = editingAccount ? `/api/accounts/${editingAccount.id}` : '/api/accounts';
        const method = editingAccount ? 'PUT' : 'POST';

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) throw new Error('Failed to save account');

        toast.success(editingAccount ? 'Account updated' : 'Account created');
        setIsDialogOpen(false);
        fetchAccounts();
      } catch (err) {
        console.error(err);
        toast.error('Failed to save account');
      }
    });
  };

  const handleDeleteAccount = async (id: string) => {
    if (!confirm('Are you sure you want to delete this account? All associated transactions will be deleted.')) {
      return;
    }

    try {
      const res = await fetch(`/api/accounts/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete account');
      toast.success('Account deleted');
      fetchAccounts();
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete account');
    }
  };

  const totalAssets = accounts
    .filter((a) => a.balance >= 0)
    .reduce((sum, a) => sum + a.balance, 0);

  const totalLiabilities = Math.abs(
    accounts.filter((a) => a.balance < 0).reduce((sum, a) => sum + a.balance, 0)
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Financial Accounts" description="Manage savings, credit cards, fixed deposits, and wallets">
        <div className="flex items-center gap-2">
          <Link href="/transactions?action=transfer" className="h-8 gap-1 px-3 border border-border/40 hover:bg-accent/40 rounded-lg inline-flex items-center text-xs font-semibold bg-background/20 text-foreground transition-all duration-200">
            <ArrowLeftRight className="h-3.5 w-3.5" />
            Transfer Funds
          </Link>
          <Button size="sm" onClick={handleOpenAddDialog} className="h-8 gap-1 gradient-primary">
            <Plus className="h-4 w-4" />
            Add Account
          </Button>
        </div>
      </PageHeader>

      {/* Aggregate Overview Card */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Total Cash & Assets" value={totalAssets} variant="glass" />
        <StatCard title="Total Debt & Liabilities" value={totalLiabilities} prefix="₹" trend={0} icon={<CreditCard className="h-4 w-4 text-destructive" />} />
        <StatCard title="Net Balance" value={totalAssets - totalLiabilities} variant="default" />
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((acc) => (
            <Card
              key={acc.id}
              className="glass relative overflow-hidden transition-all duration-200 card-hover border-l-4"
              style={{ borderLeftColor: acc.color }}
            >
              <CardHeader className="flex flex-row items-start justify-between pb-3">
                <div className="space-y-1">
                  <span className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground bg-accent/40 px-2 py-0.5 rounded-full">
                    {acc.type.replace('_', ' ')}
                  </span>
                  <CardTitle className="text-base font-bold truncate max-w-[200px] pt-1">
                    {acc.name}
                  </CardTitle>
                  {acc.institution && (
                    <CardDescription className="flex items-center gap-1 text-xs">
                      <Building className="h-3 w-3 shrink-0" />
                      {acc.institution}
                    </CardDescription>
                  )}
                </div>
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-white font-bold"
                  style={{ backgroundColor: acc.color }}
                >
                  <Wallet className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-muted-foreground">Balance</span>
                  <span
                    className={`text-xl font-bold tabular-nums tracking-tight ${
                      acc.balance < 0 ? 'text-destructive' : 'text-foreground'
                    }`}
                  >
                    {formatCurrency(acc.balance, 'INR')}
                  </span>
                </div>
                {acc.creditLimit && (
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Available Credit</span>
                      <span className="font-semibold tabular-nums">
                        {formatCurrency(Number(acc.creditLimit) + acc.balance, 'INR')}
                      </span>
                    </div>
                  </div>
                )}
                {acc.interestRate && (
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Interest Rate</span>
                    <span className="font-semibold">{acc.interestRate}% p.a.</span>
                  </div>
                )}

                <div className="flex justify-between items-center border-t border-border/30 pt-3">
                  <Link
                    href={`/accounts/${acc.id}`}
                    className="text-xs font-semibold text-primary hover:underline flex items-center gap-0.5"
                  >
                    View ledger
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                  <div className="flex gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 rounded hover:bg-accent"
                      onClick={() => handleOpenEditDialog(acc)}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeleteAccount(acc.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {accounts.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center border border-dashed rounded-xl p-12 text-center bg-card/20">
              <Wallet className="h-10 w-10 text-muted-foreground/60 mb-2" />
              <p className="text-sm font-semibold">No accounts found</p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">Create your first account to start tracking transactions</p>
              <Button size="sm" onClick={handleOpenAddDialog}>
                Add Account
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Account form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingAccount ? 'Edit Account' : 'Create Account'}</DialogTitle>
            <DialogDescription>
              Set properties for this financial ledger.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="label-uppercase text-muted-foreground">Account Name</Label>
              <Input
                placeholder="e.g. HDFC Savings Account"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isPending}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Account Type</Label>
                <Select value={type} onValueChange={(val) => setType(val || 'SAVINGS')} disabled={isPending}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Type">
                      {type === 'SAVINGS' ? 'Savings Account' : type === 'CURRENT' ? 'Current Account' : type === 'CASH' ? 'Cash Wallet' : type === 'CREDIT_CARD' ? 'Credit Card' : type === 'FIXED_DEPOSIT' ? 'Fixed Deposit' : type === 'STOCKS' ? 'Stocks Demat' : type === 'MUTUAL_FUNDS' ? 'Mutual Funds' : type === 'CRYPTO' ? 'Crypto Wallet' : type === 'LOAN' ? 'Loan Ledger' : type === 'EPF' ? 'EPF (Retirement)' : type === 'PPF' ? 'PPF Account' : type === 'NPS' ? 'NPS Account' : type === 'OTHER' ? 'Other Assets' : type}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SAVINGS">Savings Account</SelectItem>
                    <SelectItem value="CURRENT">Current Account</SelectItem>
                    <SelectItem value="CASH">Cash Wallet</SelectItem>
                    <SelectItem value="CREDIT_CARD">Credit Card</SelectItem>
                    <SelectItem value="FIXED_DEPOSIT">Fixed Deposit</SelectItem>
                    <SelectItem value="STOCKS">Stocks Demat</SelectItem>
                    <SelectItem value="MUTUAL_FUNDS">Mutual Funds</SelectItem>
                    <SelectItem value="CRYPTO">Crypto Wallet</SelectItem>
                    <SelectItem value="LOAN">Loan Ledger</SelectItem>
                    <SelectItem value="EPF">EPF (Retirement)</SelectItem>
                    <SelectItem value="PPF">PPF Account</SelectItem>
                    <SelectItem value="NPS">NPS Account</SelectItem>
                    <SelectItem value="OTHER">Other Assets</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Institution Name</Label>
                <Input
                  placeholder="e.g. HDFC Bank"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  disabled={isPending}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Current Balance</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={balance}
                  onChange={(e) => setBalance(e.target.value)}
                  disabled={isPending}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Account Number (Opt)</Label>
                <Input
                  placeholder="XXXXXX5892"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  disabled={isPending}
                />
              </div>
            </div>
            {(type === 'SAVINGS' || type === 'FIXED_DEPOSIT' || type === 'LOAN') && (
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Interest Rate (% p.a.)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 3.5"
                  value={interestRate}
                  onChange={(e) => setInterestRate(e.target.value)}
                  disabled={isPending}
                />
              </div>
            )}
            {type === 'CREDIT_CARD' && (
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Credit Limit</Label>
                <Input
                  type="number"
                  placeholder="e.g. 200000"
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(e.target.value)}
                  disabled={isPending}
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Color Badge</Label>
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
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Icon Symbol</Label>
                <Select value={icon} onValueChange={(val) => setIcon(val || 'wallet')} disabled={isPending}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Icon">
                      {icon === 'wallet' ? 'Wallet' : icon === 'banknote' ? 'Banknote' : icon === 'credit-card' ? 'Credit Card' : icon === 'landmark' ? 'Landmark' : icon === 'trending-up' ? 'Trending' : icon}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wallet">Wallet</SelectItem>
                    <SelectItem value="banknote">Banknote</SelectItem>
                    <SelectItem value="credit-card">Credit Card</SelectItem>
                    <SelectItem value="landmark">Landmark</SelectItem>
                    <SelectItem value="trending-up">Trending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="label-uppercase text-muted-foreground">Private Notes</Label>
              <Textarea
                placeholder="Write any account details or branch notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isPending}
                className="bg-background/40 min-h-[60px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleSaveAccount} disabled={isPending} className="gradient-primary">
              {isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
