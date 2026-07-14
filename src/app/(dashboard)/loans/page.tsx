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
  TrendingUp,
  Archive,
  CheckCircle2,
  Loader2,
  ArrowUpRight,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency, formatDate } from '@/lib/format';

interface Loan {
  id: string;
  borrowerName: string;
  totalLent: number;
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

export default function LoansPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [people, setPeople] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'SETTLED'>('ACTIVE');

  // New/Edit Dialog
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [personId, setPersonId] = useState('');
  const [borrowerName, setBorrowerName] = useState('');
  const [totalLent, setTotalLent] = useState('');
  const [outstandingBalance, setOutstandingBalance] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [notes, setNotes] = useState('');
  const [accountId, setAccountId] = useState('');
  const [color, setColor] = useState('#f97316');

  // Repayment Collection Dialog
  const [isCollectOpen, setIsCollectOpen] = useState(false);
  const [collectLoan, setCollectLoan] = useState<Loan | null>(null);
  const [collectAmount, setCollectAmount] = useState('');
  const [collectAccountId, setCollectAccountId] = useState('');
  const [collectDate, setCollectDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [collectNotes, setCollectNotes] = useState('');

  const [isPending, startTransition] = useTransition();

  const fetchLoansAndAccounts = async () => {
    setLoading(true);
    try {
      const [loansRes, accRes, pplRes] = await Promise.all([
        fetch('/api/loans'),
        fetch('/api/accounts'),
        fetch('/api/people'),
      ]);
      if (loansRes.ok) setLoans(await loansRes.json());
      if (accRes.ok) setAccounts(await accRes.json());
      if (pplRes.ok) setPeople(await pplRes.json());
    } catch (err) {
      console.error(err);
      toast.error('Failed to load loans data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoansAndAccounts();
  }, []);

  const handleOpenAddDialog = () => {
    setEditingLoan(null);
    setPersonId('');
    setBorrowerName('');
    setTotalLent('');
    setOutstandingBalance('');
    setDueDate('');
    setInterestRate('');
    setNotes('');
    setAccountId(accounts[0]?.id || '');
    setColor('#f97316');
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (loan: Loan & { personId?: string }) => {
    setEditingLoan(loan as any);
    setPersonId(loan.personId || '');
    setBorrowerName(loan.borrowerName);
    setTotalLent(loan.totalLent.toString());
    setOutstandingBalance(loan.outstandingBalance.toString());
    setDueDate(loan.dueDate ? loan.dueDate.split('T')[0] : '');
    setInterestRate(loan.interestRate ? loan.interestRate.toString() : '');
    setNotes(loan.notes || '');
    setAccountId(loan.accountId || '');
    setColor(loan.color);
    setIsDialogOpen(true);
  };

  const handleOpenCollectDialog = (loan: Loan) => {
    setCollectLoan(loan);
    setCollectAmount(loan.outstandingBalance.toString());
    setCollectAccountId(accounts[0]?.id || '');
    setCollectDate(new Date().toISOString().split('T')[0]);
    setCollectNotes(`Repayment collected from ${loan.borrowerName}`);
    setIsCollectOpen(true);
  };

  const handleSaveLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!borrowerName || !totalLent) {
      toast.error('Please fill in required fields');
      return;
    }

    startTransition(async () => {
      try {
        const payload = {
          borrowerName,
          totalLent: parseFloat(totalLent),
          outstandingBalance: outstandingBalance ? parseFloat(outstandingBalance) : parseFloat(totalLent),
          dueDate: dueDate || null,
          interestRate: interestRate ? parseFloat(interestRate) : null,
          notes,
          accountId: accountId || null,
          color,
          personId: personId || null,
        };

        const url = editingLoan ? `/api/loans/${editingLoan.id}` : '/api/loans';
        const method = editingLoan ? 'PUT' : 'POST';

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) throw new Error();
        toast.success(editingLoan ? 'Loan details updated' : 'New loan record created');
        setIsDialogOpen(false);
        fetchLoansAndAccounts();
      } catch (err) {
        toast.error('Failed to save loan record');
      }
    });
  };

  const handleSaveCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collectLoan || !collectAmount) return;

    startTransition(async () => {
      try {
        const res = await fetch(`/api/loans/${collectLoan.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amountCollected: parseFloat(collectAmount),
            accountId: collectAccountId || null,
            date: collectDate,
            notes: collectNotes,
          }),
        });

        if (!res.ok) throw new Error();
        toast.success('Repayment received and recorded');
        setIsCollectOpen(false);
        fetchLoansAndAccounts();
      } catch (err) {
        toast.error('Failed to record repayment');
      }
    });
  };

  const handleDeleteLoan = async (id: string) => {
    if (!confirm('Are you sure you want to delete this loan record?')) return;
    try {
      const res = await fetch(`/api/loans/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Loan record deleted');
      fetchLoansAndAccounts();
    } catch (err) {
      toast.error('Failed to delete loan');
    }
  };

  const handleArchiveLoan = async (loan: Loan) => {
    try {
      const res = await fetch(`/api/loans/${loan.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...loan,
          status: loan.status === 'SETTLED' ? 'ACTIVE' : 'SETTLED',
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(loan.status === 'SETTLED' ? 'Loan set to active' : 'Loan archived');
      fetchLoansAndAccounts();
    } catch (err) {
      toast.error('Failed to archive loan');
    }
  };

  // Filtered lists
  const activeLoans = loans.filter((l) => l.status === 'ACTIVE');
  const settledLoans = loans.filter((l) => l.status === 'SETTLED');
  const displayList = activeTab === 'ACTIVE' ? activeLoans : settledLoans;

  // Stat aggregates
  const totalLentSum = loans.reduce((sum, l) => sum + l.totalLent, 0);
  const outstandingSum = activeLoans.reduce((sum, l) => sum + l.outstandingBalance, 0);
  const recoveredSum = settledLoans.reduce((sum, l) => sum + l.totalLent, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Loans Tracker" description="Track funds lent to individuals, employees, or borrowers">
        <Button onClick={handleOpenAddDialog} className="h-8 gap-1 gradient-primary text-xs font-semibold">
          <Plus className="h-3.5 w-3.5" />
          New Loan
        </Button>
      </PageHeader>

      {/* Aggregate Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="glass-card overflow-hidden relative">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Total Lent</p>
                <h3 className="text-xl font-bold mt-1 text-foreground">{formatCurrency(totalLentSum)}</h3>
              </div>
              <div className="p-2.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-orange-500/0 via-orange-500 to-orange-500/0" />
          </CardContent>
        </Card>

        <Card className="glass-card overflow-hidden relative">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Still Owed</p>
                <h3 className="text-xl font-bold mt-1 text-orange-400">{formatCurrency(outstandingSum)}</h3>
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
                <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Active Loans</p>
                <h3 className="text-xl font-bold mt-1 text-foreground">{activeLoans.length} active</h3>
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
                <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Recovered / Settled</p>
                <h3 className="text-xl font-bold mt-1 text-green-400">{formatCurrency(recoveredSum)}</h3>
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
            Active Loans
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'SETTLED' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('SETTLED')}
            className={`h-8 text-xs font-semibold rounded-lg ${activeTab === 'SETTLED' ? 'gradient-primary' : 'text-muted-foreground'}`}
          >
            Recovered History
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
          <p className="text-sm text-muted-foreground">No loan records found matching this category</p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayList.map((loan) => {
            const returned = loan.totalLent - loan.outstandingBalance;
            const progressPercent = loan.totalLent > 0 
              ? Math.min(100, Math.max(0, (returned / loan.totalLent) * 100))
              : 0;

            return (
              <Card key={loan.id} className="glass-card hover-border relative overflow-hidden group">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Left: Borrower Title & Metadata */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: loan.color }} />
                        <h4 className="font-bold text-foreground">{loan.borrowerName}</h4>
                        {loan.interestRate && (
                          <span className="text-[10px] font-semibold bg-orange-500/10 border border-orange-500/20 text-orange-400 px-2 py-0.5 rounded">
                            {loan.interestRate}% Interest
                          </span>
                        )}
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${loan.status === 'SETTLED' ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'}`}>
                          {loan.status}
                        </span>
                      </div>
                      {loan.notes && <p className="text-xs text-muted-foreground line-clamp-1">{loan.notes}</p>}
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground pt-1">
                        {loan.dueDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Maturity: {formatDate(loan.dueDate)}
                          </span>
                        )}
                        {loan.account && (
                          <span className="flex items-center gap-1">
                            <ArrowUpRight className="h-3 w-3" />
                            Receives Into: {loan.account.name}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Middle: Progress Gauges */}
                    <div className="flex-1 max-w-md space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-muted-foreground">Recovery Progress</span>
                        <span className="text-foreground">{progressPercent.toFixed(0)}%</span>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-500" 
                          style={{ 
                            width: `${progressPercent}%`,
                            backgroundColor: loan.color 
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>Recovered: {formatCurrency(returned)}</span>
                        <span>Total Lent: {formatCurrency(loan.totalLent)}</span>
                      </div>
                    </div>

                    {/* Right: Remaining Balance & Hover Actions Toolbar */}
                    <div className="flex items-center gap-4 justify-between md:justify-end">
                      <div className="text-right">
                        <p className="text-[10px] uppercase font-semibold text-muted-foreground">Outstanding</p>
                        <p className="text-lg font-bold text-orange-400 mt-0.5">{formatCurrency(loan.outstandingBalance)}</p>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200">
                        {loan.status === 'ACTIVE' && (
                          <Button 
                            size="icon" 
                            variant="outline" 
                            className="h-8 w-8 hover:bg-green-500/10 hover:text-green-400"
                            onClick={() => handleOpenCollectDialog(loan)}
                          >
                            <Coins className="h-4 w-4" />
                          </Button>
                        )}
                        <Button 
                          size="icon" 
                          variant="outline" 
                          className="h-8 w-8 hover:bg-amber-500/10 hover:text-amber-400"
                          onClick={() => handleOpenEditDialog(loan)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="outline" 
                          className="h-8 w-8 hover:bg-orange-500/10 hover:text-orange-400"
                          onClick={() => handleArchiveLoan(loan)}
                        >
                          <Archive className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="outline" 
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteLoan(loan.id)}
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
        <DialogContent className="form-spacious glass-dialog sm:max-w-[425px] lg:max-w-[550px] lg:p-8">
          <form onSubmit={handleSaveLoan} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-foreground">
                {editingLoan ? 'Edit Loan Record' : 'Record New Loan'}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Enter details to track funds you lent out to family, friends, or businesses.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Person / Borrower *</Label>
                <Select 
                  value={personId} 
                  onValueChange={(val: any) => {
                    setPersonId(val || '');
                    const person = people.find(p => p.id === val);
                    if (person) setBorrowerName(person.name);
                    else setBorrowerName('');
                  }}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select Person">
                      {people.find(p => p.id === personId)?.name || (borrowerName || 'Select Person')}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="glass-select">
                    {people.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-xs">
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!personId && (
                  <div className="mt-2">
                    <Label htmlFor="borrower" className="text-xs text-muted-foreground">Or enter name manually (legacy)</Label>
                    <Input
                      id="borrower"
                      placeholder="e.g. Aunt Emilly, John Doe"
                      value={borrowerName}
                      onChange={(e) => setBorrowerName(e.target.value)}
                      className="h-9 text-xs mt-1"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="lent" className="text-xs">Total Lent *</Label>
                  <Input
                    id="lent"
                    type="number"
                    step="0.01"
                    placeholder="e.g. 1500"
                    value={totalLent}
                    onChange={(e) => setTotalLent(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="outstanding" className="text-xs">Outstanding Balance</Label>
                  <Input
                    id="outstanding"
                    type="number"
                    step="0.01"
                    placeholder="Same as lent"
                    value={outstandingBalance}
                    onChange={(e) => setOutstandingBalance(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="dueDate" className="text-xs">Maturity Date</Label>
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
                      placeholder="e.g. 4.0"
                      value={interestRate}
                      onChange={(e) => setInterestRate(e.target.value)}
                      className="h-9 pr-7 text-xs"
                    />
                    <Percent className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="account" className="text-xs">Receives Into Account</Label>
                <Select value={accountId} onValueChange={(val: any) => setAccountId(val || '')}>
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
                    className="w-14 h-11 p-1 border rounded-xl cursor-pointer border-border/40 transition-colors"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-[10px] font-mono text-muted-foreground uppercase">{color}</span>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="notes" className="text-xs">Notes / Terms</Label>
                <Textarea
                  id="notes"
                  placeholder="Settlement terms, description..."
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
                Save Loan Record
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Collect Repayment Dialog */}
      <Dialog open={isCollectOpen} onOpenChange={setIsCollectOpen}>
        <DialogContent className="form-spacious glass-dialog sm:max-w-[400px] lg:max-w-[520px] lg:p-8">
          <form onSubmit={handleSaveCollection} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-foreground">Collect Repayment</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Confirm collection of funds from borrower and increment cash balance.
              </DialogDescription>
            </DialogHeader>

            {collectLoan && (
              <div className="space-y-3">
                <div className="bg-background/25 border border-border/20 rounded-lg p-3 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Borrower:</span>
                    <span className="font-bold text-foreground">{collectLoan.borrowerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Outstanding:</span>
                    <span className="font-bold text-orange-400">{formatCurrency(collectLoan.outstandingBalance)}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="collectTo" className="text-xs">To Account</Label>
                  <Select value={collectAccountId} onValueChange={(val: any) => setCollectAccountId(val || '')}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue>
                        {accounts.find(a => a.id === collectAccountId)?.name || 'Select Account'}
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
                  <Label htmlFor="collectAmt" className="text-xs">Amount Collected</Label>
                  <Input
                    id="collectAmt"
                    type="number"
                    step="0.01"
                    value={collectAmount}
                    onChange={(e) => setCollectAmount(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="collectDate" className="text-xs">Collection Date</Label>
                  <Input
                    id="collectDate"
                    type="date"
                    value={collectDate}
                    onChange={(e) => setCollectDate(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="collectNotes" className="text-xs">Description / Notes</Label>
                  <Textarea
                    id="collectNotes"
                    value={collectNotes}
                    onChange={(e) => setCollectNotes(e.target.value)}
                    className="min-h-[50px] text-xs resize-none"
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCollectOpen(false)}
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
                Confirm Receipt
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
