'use client';

import { useEffect, useState, useTransition } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import {
  Plus,
  Coins,
  Trash2,
  Edit2,
  Calendar,
  AlertCircle,
  Percent,
  TrendingDown,
  Archive,
  CheckCircle2,
  Loader2,
  ArrowDownRight,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency, formatDate } from '@/lib/format';

interface Debt {
  id: string;
  lenderName: string;
  totalBorrowed: number;
  outstandingBalance: number;
  dueDate: string | null;
  interestRate: number | null;
  color: string;
  notes: string | null;
  status: string; // ACTIVE, SETTLED
  createdAt: string;
  accountId: string | null;
  account: { name: string } | null;
}

interface Account {
  id: string;
  name: string;
  balance: number;
}

export default function DebtsPage() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'SETTLED'>('ACTIVE');

  // New/Edit Dialog
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [lenderName, setLenderName] = useState('');
  const [totalBorrowed, setTotalBorrowed] = useState('');
  const [outstandingBalance, setOutstandingBalance] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [notes, setNotes] = useState('');
  const [accountId, setAccountId] = useState('');
  const [color, setColor] = useState('#a855f7');

  // Repayment Dialog
  const [isRepayOpen, setIsRepayOpen] = useState(false);
  const [repayDebt, setRepayDebt] = useState<Debt | null>(null);
  const [repayAmount, setRepayAmount] = useState('');
  const [repayAccountId, setRepayAccountId] = useState('');
  const [repayDate, setRepayDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [repayNotes, setRepayNotes] = useState('');

  const [isPending, startTransition] = useTransition();

  const fetchDebtsAndAccounts = async () => {
    setLoading(true);
    try {
      const [debtsRes, accRes] = await Promise.all([
        fetch('/api/debts'),
        fetch('/api/accounts'),
      ]);
      if (debtsRes.ok) setDebts(await debtsRes.json());
      if (accRes.ok) setAccounts(await accRes.json());
    } catch (err) {
      console.error(err);
      toast.error('Failed to load debts data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDebtsAndAccounts();
  }, []);

  const handleOpenAddDialog = () => {
    setEditingDebt(null);
    setLenderName('');
    setTotalBorrowed('');
    setOutstandingBalance('');
    setDueDate('');
    setInterestRate('');
    setNotes('');
    setAccountId(accounts[0]?.id || '');
    setColor('#a855f7');
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (debt: Debt) => {
    setEditingDebt(debt);
    setLenderName(debt.lenderName);
    setTotalBorrowed(debt.totalBorrowed.toString());
    setOutstandingBalance(debt.outstandingBalance.toString());
    setDueDate(debt.dueDate ? debt.dueDate.split('T')[0] : '');
    setInterestRate(debt.interestRate ? debt.interestRate.toString() : '');
    setNotes(debt.notes || '');
    setAccountId(debt.accountId || '');
    setColor(debt.color);
    setIsDialogOpen(true);
  };

  const handleOpenRepayDialog = (debt: Debt) => {
    setRepayDebt(debt);
    setRepayAmount(debt.outstandingBalance.toString());
    setRepayAccountId(accounts[0]?.id || '');
    setRepayDate(new Date().toISOString().split('T')[0]);
    setRepayNotes(`Repayment for borrowing from ${debt.lenderName}`);
    setIsRepayOpen(true);
  };

  const handleSaveDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lenderName || !totalBorrowed) {
      toast.error('Please fill in required fields');
      return;
    }

    startTransition(async () => {
      try {
        const payload = {
          lenderName,
          totalBorrowed: parseFloat(totalBorrowed),
          outstandingBalance: outstandingBalance ? parseFloat(outstandingBalance) : parseFloat(totalBorrowed),
          dueDate: dueDate || null,
          interestRate: interestRate ? parseFloat(interestRate) : null,
          notes,
          accountId: accountId || null,
          color,
        };

        const url = editingDebt ? `/api/debts/${editingDebt.id}` : '/api/debts';
        const method = editingDebt ? 'PUT' : 'POST';

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) throw new Error();
        toast.success(editingDebt ? 'Debt details updated' : 'New debt record created');
        setIsDialogOpen(false);
        fetchDebtsAndAccounts();
      } catch (err) {
        toast.error('Failed to save debt record');
      }
    });
  };

  const handleSaveRepayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repayDebt || !repayAmount) return;

    startTransition(async () => {
      try {
        const res = await fetch(`/api/debts/${repayDebt.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amountPaid: parseFloat(repayAmount),
            accountId: repayAccountId || null,
            date: repayDate,
            notes: repayNotes,
          }),
        });

        if (!res.ok) throw new Error();
        toast.success('Repayment transaction recorded successfully');
        setIsRepayOpen(false);
        fetchDebtsAndAccounts();
      } catch (err) {
        toast.error('Failed to record repayment');
      }
    });
  };

  const handleDeleteDebt = async (id: string) => {
    if (!confirm('Are you sure you want to delete this debt record?')) return;
    try {
      const res = await fetch(`/api/debts/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Debt record deleted');
      fetchDebtsAndAccounts();
    } catch (err) {
      toast.error('Failed to delete debt');
    }
  };

  const handleArchiveDebt = async (debt: Debt) => {
    try {
      const res = await fetch(`/api/debts/${debt.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...debt,
          status: debt.status === 'SETTLED' ? 'ACTIVE' : 'SETTLED',
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(debt.status === 'SETTLED' ? 'Debt set to active' : 'Debt archived');
      fetchDebtsAndAccounts();
    } catch (err) {
      toast.error('Failed to archive debt');
    }
  };

  // Filtered lists
  const activeDebts = debts.filter((d) => d.status === 'ACTIVE');
  const settledDebts = debts.filter((d) => d.status === 'SETTLED');
  const displayList = activeTab === 'ACTIVE' ? activeDebts : settledDebts;

  // Stat aggregates
  const totalBorrowedSum = debts.reduce((sum, d) => sum + d.totalBorrowed, 0);
  const outstandingSum = activeDebts.reduce((sum, d) => sum + d.outstandingBalance, 0);
  const settledSum = settledDebts.reduce((sum, d) => sum + d.totalBorrowed, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Debt Tracker" description="Track funds borrowed from individuals, institutions, or lenders">
        <Button onClick={handleOpenAddDialog} className="h-8 gap-1 gradient-primary text-xs font-semibold">
          <Plus className="h-3.5 w-3.5" />
          New Debt
        </Button>
      </PageHeader>

      {/* Aggregate Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="glass-card overflow-hidden relative">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Total Borrowed</p>
                <h3 className="text-xl font-bold mt-1 text-foreground">{formatCurrency(totalBorrowedSum)}</h3>
              </div>
              <div className="p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400">
                <TrendingDown className="h-5 w-5" />
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-purple-500/0 via-purple-500 to-purple-500/0" />
          </CardContent>
        </Card>

        <Card className="glass-card overflow-hidden relative">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Remaining Debt</p>
                <h3 className="text-xl font-bold mt-1 text-red-400">{formatCurrency(outstandingSum)}</h3>
              </div>
              <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
                <AlertCircle className="h-5 w-5" />
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-red-500/0 via-red-500 to-red-500/0" />
          </CardContent>
        </Card>

        <Card className="glass-card overflow-hidden relative">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Active Borrowings</p>
                <h3 className="text-xl font-bold mt-1 text-foreground">{activeDebts.length} active</h3>
              </div>
              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <Clock className="h-5 w-5" />
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-500/0 via-amber-500 to-amber-500/0" />
          </CardContent>
        </Card>

        <Card className="glass-card overflow-hidden relative">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Settled Debts</p>
                <h3 className="text-xl font-bold mt-1 text-green-400">{formatCurrency(settledSum)}</h3>
              </div>
              <div className="p-2.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-green-500/0 via-green-500 to-green-500/0" />
          </CardContent>
        </Card>
      </div>

      {/* Tabs list */}
      <div className="flex items-center justify-between border-b border-border/40 pb-2">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={activeTab === 'ACTIVE' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('ACTIVE')}
            className={`h-8 text-xs font-semibold rounded-lg ${activeTab === 'ACTIVE' ? 'gradient-primary' : 'text-muted-foreground'}`}
          >
            Active Debts
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'SETTLED' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('SETTLED')}
            className={`h-8 text-xs font-semibold rounded-lg ${activeTab === 'SETTLED' ? 'gradient-primary' : 'text-muted-foreground'}`}
          >
            Settled History
          </Button>
        </div>
      </div>

      {/* Main List */}
      {loading ? (
        <div className="flex h-36 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
        </div>
      ) : displayList.length === 0 ? (
        <div className="text-center py-12 glass-card rounded-xl border border-border/20">
          <p className="text-sm text-muted-foreground">No debt records found matching this category</p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayList.map((debt) => {
            const repaid = debt.totalBorrowed - debt.outstandingBalance;
            const progressPercent = debt.totalBorrowed > 0 
              ? Math.min(100, Math.max(0, (repaid / debt.totalBorrowed) * 100))
              : 0;

            return (
              <Card key={debt.id} className="glass-card hover-border relative overflow-hidden group">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Left: Lender Title & Metadata */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: debt.color }} />
                        <h4 className="font-bold text-foreground">{debt.lenderName}</h4>
                        {debt.interestRate && (
                          <span className="text-[10px] font-semibold bg-purple-500/10 border border-purple-500/20 text-purple-400 px-2 py-0.5 rounded">
                            {debt.interestRate}% APR
                          </span>
                        )}
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${debt.status === 'SETTLED' ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'}`}>
                          {debt.status}
                        </span>
                      </div>
                      {debt.notes && <p className="text-xs text-muted-foreground line-clamp-1">{debt.notes}</p>}
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground pt-1">
                        {debt.dueDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Due: {formatDate(debt.dueDate)}
                          </span>
                        )}
                        {debt.account && (
                          <span className="flex items-center gap-1">
                            <ArrowDownRight className="h-3 w-3" />
                            Settles From: {debt.account.name}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Middle: Progress Gauges */}
                    <div className="flex-1 max-w-md space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-muted-foreground">Repayment Progress</span>
                        <span className="text-foreground">{progressPercent.toFixed(0)}%</span>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-500" 
                          style={{ 
                            width: `${progressPercent}%`,
                            backgroundColor: debt.color 
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>Repaid: {formatCurrency(repaid)}</span>
                        <span>Total: {formatCurrency(debt.totalBorrowed)}</span>
                      </div>
                    </div>

                    {/* Right: Remaining Balance & Hover Actions Toolbar */}
                    <div className="flex items-center gap-4 justify-between md:justify-end">
                      <div className="text-right">
                        <p className="text-[10px] uppercase font-semibold text-muted-foreground">Still Owed</p>
                        <p className="text-lg font-bold text-red-400 mt-0.5">{formatCurrency(debt.outstandingBalance)}</p>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200">
                        {debt.status === 'ACTIVE' && (
                          <Button 
                            size="icon" 
                            variant="outline" 
                            className="h-8 w-8 hover:bg-green-500/10 hover:text-green-400"
                            onClick={() => handleOpenRepayDialog(debt)}
                          >
                            <Coins className="h-4 w-4" />
                          </Button>
                        )}
                        <Button 
                          size="icon" 
                          variant="outline" 
                          className="h-8 w-8 hover:bg-amber-500/10 hover:text-amber-400"
                          onClick={() => handleOpenEditDialog(debt)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="outline" 
                          className="h-8 w-8 hover:bg-purple-500/10 hover:text-purple-400"
                          onClick={() => handleArchiveDebt(debt)}
                        >
                          <Archive className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="outline" 
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteDebt(debt.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* New/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="glass-dialog sm:max-w-[425px]">
          <form onSubmit={handleSaveDebt} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-foreground">
                {editingDebt ? 'Edit Debt Record' : 'Record New Debt'}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Enter parameters to track borrowings from institutional or personal lenders.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="lender" className="text-xs">Lender Name *</Label>
                <Input
                  id="lender"
                  placeholder="e.g. Bank of America, Uncle Bob"
                  value={lenderName}
                  onChange={(e) => setLenderName(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="borrowed" className="text-xs">Total Borrowed *</Label>
                  <Input
                    id="borrowed"
                    type="number"
                    step="0.01"
                    placeholder="e.g. 5000"
                    value={totalBorrowed}
                    onChange={(e) => setTotalBorrowed(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="outstanding" className="text-xs">Outstanding Balance</Label>
                  <Input
                    id="outstanding"
                    type="number"
                    step="0.01"
                    placeholder="Same as borrowed"
                    value={outstandingBalance}
                    onChange={(e) => setOutstandingBalance(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="dueDate" className="text-xs">Due Date</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="rate" className="text-xs">Interest Rate (% APR)</Label>
                  <div className="relative">
                    <Input
                      id="rate"
                      type="number"
                      step="0.01"
                      placeholder="e.g. 5.5"
                      value={interestRate}
                      onChange={(e) => setInterestRate(e.target.value)}
                      className="h-9 pr-7 text-xs"
                    />
                    <Percent className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="account" className="text-xs">Linked Account (For settlement)</Label>
                <Select value={accountId} onValueChange={(val) => setAccountId(val || '')}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue>
                      {accounts.find(a => a.id === accountId)?.name || 'Select Account'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="glass-select">
                    {accounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id} className="text-xs">
                        {acc.name} ({formatCurrency(acc.balance)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="color" className="text-xs">Visual Identification Color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    id="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="h-8 w-8 rounded border border-border cursor-pointer bg-transparent"
                  />
                  <span className="text-[10px] font-mono text-muted-foreground uppercase">{color}</span>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="notes" className="text-xs">Notes / Terms</Label>
                <Textarea
                  id="notes"
                  placeholder="Payment cycles, EMI counts, description..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[60px] text-xs resize-none"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="h-9 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="h-9 text-xs gradient-primary font-semibold"
              >
                {isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Save Debt Record
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Record Payment Dialog */}
      <Dialog open={isRepayOpen} onOpenChange={setIsRepayOpen}>
        <DialogContent className="glass-dialog sm:max-w-[400px]">
          <form onSubmit={handleSaveRepayment} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-foreground">Record Repayment</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Subtract payment from outstanding debt and deduct cash balances.
              </DialogDescription>
            </DialogHeader>

            {repayDebt && (
              <div className="space-y-3">
                <div className="bg-background/25 border border-border/20 rounded-lg p-3 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Lender:</span>
                    <span className="font-bold text-foreground">{repayDebt.lenderName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Remaining Debt:</span>
                    <span className="font-bold text-red-400">{formatCurrency(repayDebt.outstandingBalance)}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="repayFrom" className="text-xs">From Account</Label>
                  <Select value={repayAccountId} onValueChange={(val) => setRepayAccountId(val || '')}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue>
                        {accounts.find(a => a.id === repayAccountId)?.name || 'Select Account'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="glass-select">
                      {accounts.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id} className="text-xs">
                          {acc.name} ({formatCurrency(acc.balance)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="repayAmt" className="text-xs">Amount Paid</Label>
                  <Input
                    id="repayAmt"
                    type="number"
                    step="0.01"
                    value={repayAmount}
                    onChange={(e) => setRepayAmount(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="repayDate" className="text-xs">Payment Date</Label>
                  <Input
                    id="repayDate"
                    type="date"
                    value={repayDate}
                    onChange={(e) => setRepayDate(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="repayNotes" className="text-xs">Description / Notes</Label>
                  <Textarea
                    id="repayNotes"
                    value={repayNotes}
                    onChange={(e) => setRepayNotes(e.target.value)}
                    className="min-h-[50px] text-xs resize-none"
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsRepayOpen(false)}
                className="h-9 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="h-9 text-xs gradient-primary font-semibold"
              >
                {isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Confirm Payment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
