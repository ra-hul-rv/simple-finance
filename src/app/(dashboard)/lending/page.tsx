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
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency, formatDate } from '@/lib/format';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Transaction {
  id: string;
  date: string;
  amount: number;
  type: string;
  description: string;
  notes: string | null;
  accountId: string;
}

interface Lending {
  id: string;
  type: 'LENT' | 'BORROWED';
  personName: string;
  totalAmount: number;
  outstandingBalance: number;
  dueDate: string | null;
  interestRate: number | null;
  color: string;
  notes: string | null;
  status: string; // ACTIVE, SETTLED
  createdAt: string;
  accountId: string | null;
  account: { name: string } | null;
  personId: string | null;
  transactions: Transaction[];
}

interface Account {
  id: string;
  name: string;
  balance: number;
}

export default function LendingPage() {
  const [lendings, setLendings] = useState<Lending[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [people, setPeople] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState<'LENT' | 'BORROWED'>('LENT');
  const [statusTab, setStatusTab] = useState<'ACTIVE' | 'SETTLED'>('ACTIVE');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // New/Edit Dialog
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLending, setEditingLending] = useState<Lending | null>(null);
  const [personId, setPersonId] = useState('');
  const [personName, setPersonName] = useState('');
  const [lendingType, setLendingType] = useState<'LENT' | 'BORROWED'>('LENT');
  const [totalAmount, setTotalAmount] = useState('');
  const [outstandingBalance, setOutstandingBalance] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [notes, setNotes] = useState('');
  const [accountId, setAccountId] = useState('');
  const [color, setColor] = useState('#f97316');

  // Repayment Collection Dialog
  const [isCollectOpen, setIsCollectOpen] = useState(false);
  const [collectLending, setCollectLending] = useState<Lending | null>(null);
  const [collectAmount, setCollectAmount] = useState('');
  const [collectAccountId, setCollectAccountId] = useState('');
  const [collectDate, setCollectDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [collectNotes, setCollectNotes] = useState('');

  const [isPending, startTransition] = useTransition();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [lendingsRes, accRes, pplRes] = await Promise.all([
        fetch('/api/lending'),
        fetch('/api/accounts'),
        fetch('/api/people'),
      ]);
      if (lendingsRes.ok) setLendings(await lendingsRes.json());
      if (accRes.ok) setAccounts(await accRes.json());
      if (pplRes.ok) setPeople(await pplRes.json());
    } catch (err) {
      console.error(err);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenAddDialog = () => {
    setEditingLending(null);
    setPersonId('');
    setPersonName('');
    setLendingType(activeTab);
    setTotalAmount('');
    setOutstandingBalance('');
    setDueDate('');
    setInterestRate('');
    setNotes('');
    setAccountId(accounts[0]?.id || '');
    setColor(activeTab === 'LENT' ? '#f97316' : '#a855f7');
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (lending: Lending) => {
    setEditingLending(lending);
    setPersonId(lending.personId || '');
    setPersonName(lending.personName);
    setLendingType(lending.type);
    setTotalAmount(lending.totalAmount.toString());
    setOutstandingBalance(lending.outstandingBalance.toString());
    setDueDate(lending.dueDate ? lending.dueDate.split('T')[0] : '');
    setInterestRate(lending.interestRate ? lending.interestRate.toString() : '');
    setNotes(lending.notes || '');
    setAccountId(lending.accountId || '');
    setColor(lending.color);
    setIsDialogOpen(true);
  };

  const handleOpenCollectDialog = (lending: Lending) => {
    setCollectLending(lending);
    setCollectAmount(lending.outstandingBalance.toString());
    setCollectAccountId(accounts[0]?.id || '');
    setCollectDate(new Date().toISOString().split('T')[0]);
    setCollectNotes(lending.type === 'LENT' ? `Repayment collected from ${lending.personName}` : `Repaid to ${lending.personName}`);
    setIsCollectOpen(true);
  };

  const handleSaveLending = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personName || !totalAmount) {
      toast.error('Please fill in required fields');
      return;
    }

    startTransition(async () => {
      try {
        const payload = {
          type: lendingType,
          personName,
          totalAmount: parseFloat(totalAmount),
          outstandingBalance: outstandingBalance ? parseFloat(outstandingBalance) : parseFloat(totalAmount),
          dueDate: dueDate || null,
          interestRate: interestRate ? parseFloat(interestRate) : null,
          notes,
          accountId: accountId || null,
          color,
          personId: personId || null,
        };

        const url = editingLending ? `/api/lending/${editingLending.id}` : '/api/lending';
        const method = editingLending ? 'PUT' : 'POST';

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) throw new Error();
        toast.success(editingLending ? 'Record updated' : 'New record created');
        setIsDialogOpen(false);
        fetchData();
      } catch (err) {
        toast.error('Failed to save record');
      }
    });
  };

  const handleSaveCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collectLending || !collectAmount) return;

    startTransition(async () => {
      try {
        const res = await fetch(`/api/lending/${collectLending.id}`, {
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
        toast.success(collectLending.type === 'LENT' ? 'Repayment received' : 'Repayment sent');
        setIsCollectOpen(false);
        fetchData();
      } catch (err) {
        toast.error('Failed to record repayment');
      }
    });
  };

  const handleDeleteLending = async (id: string) => {
    if (!confirm('Are you sure you want to delete this record?')) return;
    try {
      const res = await fetch(`/api/lending/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Record deleted');
      fetchData();
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  const handleArchiveLending = async (lending: Lending) => {
    try {
      const res = await fetch(`/api/lending/${lending.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...lending,
          status: lending.status === 'SETTLED' ? 'ACTIVE' : 'SETTLED',
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(lending.status === 'SETTLED' ? 'Set to active' : 'Archived');
      fetchData();
    } catch (err) {
      toast.error('Failed to archive');
    }
  };

  const toggleExpand = (id: string) => {
    if (expandedId === id) setExpandedId(null);
    else setExpandedId(id);
  };

  // Filtered lists
  const displayList = lendings.filter(l => l.type === activeTab && l.status === statusTab);

  const totalSum = lendings.filter(l => l.type === activeTab).reduce((sum, l) => sum + l.totalAmount, 0);
  const outstandingSum = lendings.filter(l => l.type === activeTab && l.status === 'ACTIVE').reduce((sum, l) => sum + l.outstandingBalance, 0);
  const settledSum = lendings.filter(l => l.type === activeTab && l.status === 'SETTLED').reduce((sum, l) => sum + l.totalAmount, 0);
  const activeCount = lendings.filter(l => l.type === activeTab && l.status === 'ACTIVE').length;

  const isLent = activeTab === 'LENT';

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Lending & Debts" description="Track money you lent to others, and money you borrowed">
        <Button onClick={handleOpenAddDialog} className="h-8 gap-1 gradient-primary text-xs font-semibold">
          <Plus className="h-3.5 w-3.5" />
          {isLent ? 'New Loan' : 'New Debt'}
        </Button>
      </PageHeader>

      <div className="flex border-b border-border/40 pb-2 gap-4">
        <Button
          size="sm"
          variant={activeTab === 'LENT' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('LENT')}
          className={`h-9 px-6 font-bold ${activeTab === 'LENT' ? 'gradient-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
        >
          They Owe Me (Loans)
        </Button>
        <Button
          size="sm"
          variant={activeTab === 'BORROWED' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('BORROWED')}
          className={`h-9 px-6 font-bold ${activeTab === 'BORROWED' ? 'gradient-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
        >
          I Owe Them (Debts)
        </Button>
      </div>

      {/* Aggregate Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="glass-card overflow-hidden relative">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                  {isLent ? 'Total Lent' : 'Total Borrowed'}
                </p>
                <h3 className="text-xl font-bold mt-1 text-foreground">{formatCurrency(totalSum)}</h3>
              </div>
              <div className={`p-2.5 rounded-lg border ${isLent ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' : 'bg-purple-500/10 border-purple-500/20 text-purple-400'}`}>
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card overflow-hidden relative">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Still Owed</p>
                <h3 className="text-xl font-bold mt-1 text-red-400">{formatCurrency(outstandingSum)}</h3>
              </div>
              <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
                <AlertCircle className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card overflow-hidden relative">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Active</p>
                <h3 className="text-xl font-bold mt-1 text-foreground">{activeCount} active</h3>
              </div>
              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <Clock className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card overflow-hidden relative">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Settled</p>
                <h3 className="text-xl font-bold mt-1 text-green-400">{formatCurrency(settledSum)}</h3>
              </div>
              <div className="p-2.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant={statusTab === 'ACTIVE' ? 'secondary' : 'ghost'}
          onClick={() => setStatusTab('ACTIVE')}
          className="h-7 text-xs font-semibold rounded-lg"
        >
          Active
        </Button>
        <Button
          size="sm"
          variant={statusTab === 'SETTLED' ? 'secondary' : 'ghost'}
          onClick={() => setStatusTab('SETTLED')}
          className="h-7 text-xs font-semibold rounded-lg"
        >
          Settled
        </Button>
      </div>

      {loading ? (
        <div className="flex h-36 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
        </div>
      ) : displayList.length === 0 ? (
        <div className="text-center py-12 glass-card rounded-xl border border-border/20">
          <p className="text-sm text-muted-foreground">No records found matching this category</p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayList.map((lending) => {
            const returned = lending.totalAmount - lending.outstandingBalance;
            const progressPercent = lending.totalAmount > 0 
              ? Math.min(100, Math.max(0, (returned / lending.totalAmount) * 100))
              : 0;

            const isExpanded = expandedId === lending.id;

            return (
              <Card key={lending.id} className="glass-card hover-border relative overflow-hidden group">
                <CardContent className="p-0">
                  <div 
                    className="p-6 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
                    onClick={() => toggleExpand(lending.id)}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: lending.color }} />
                        <h4 className="font-bold text-foreground">{lending.personName}</h4>
                        {lending.interestRate && (
                          <span className="text-[10px] font-semibold bg-orange-500/10 border border-orange-500/20 text-orange-400 px-2 py-0.5 rounded">
                            {lending.interestRate}% Interest
                          </span>
                        )}
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${lending.status === 'SETTLED' ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'}`}>
                          {lending.status}
                        </span>
                      </div>
                      {lending.notes && <p className="text-xs text-muted-foreground line-clamp-1">{lending.notes}</p>}
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground pt-1">
                        {lending.dueDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Maturity: {formatDate(lending.dueDate)}
                          </span>
                        )}
                        {lending.account && (
                          <span className="flex items-center gap-1">
                            <ArrowUpRight className="h-3 w-3" />
                            Account: {lending.account.name}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex-1 max-w-md space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-muted-foreground">{isLent ? 'Recovery' : 'Repayment'} Progress</span>
                        <span className="text-foreground">{progressPercent.toFixed(0)}%</span>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-500" 
                          style={{ 
                            width: `${progressPercent}%`,
                            backgroundColor: lending.color 
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>{isLent ? 'Recovered:' : 'Paid:'} {formatCurrency(returned)}</span>
                        <span>Total: {formatCurrency(lending.totalAmount)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 justify-between md:justify-end">
                      <div className="text-right">
                        <p className="text-[10px] uppercase font-semibold text-muted-foreground">Outstanding</p>
                        <p className="text-lg font-bold text-orange-400 mt-0.5">{formatCurrency(lending.outstandingBalance)}</p>
                      </div>

                      <div className="flex flex-col gap-1 items-end">
                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {lending.status === 'ACTIVE' && (
                            <Button 
                              size="icon" 
                              variant="outline" 
                              className="h-8 w-8 hover:bg-green-500/10 hover:text-green-400"
                              onClick={() => handleOpenCollectDialog(lending)}
                            >
                              <Coins className="h-4 w-4" />
                            </Button>
                          )}
                          <Button 
                            size="icon" 
                            variant="outline" 
                            className="h-8 w-8 hover:bg-amber-500/10 hover:text-amber-400"
                            onClick={() => handleOpenEditDialog(lending)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="outline" 
                            className="h-8 w-8 hover:bg-orange-500/10 hover:text-orange-400"
                            onClick={() => handleArchiveLending(lending)}
                          >
                            <Archive className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="outline" 
                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteLending(lending.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Transaction History */}
                  {isExpanded && (
                    <div className="border-t border-border/40 bg-muted/20 p-4 pb-6">
                      <div className="flex items-center justify-between mb-3 px-2">
                        <h5 className="text-sm font-bold flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          Transaction History
                        </h5>
                      </div>
                      
                      {lending.transactions.length === 0 ? (
                        <div className="text-center py-6 glass-card rounded-xl">
                          <p className="text-xs text-muted-foreground">No transactions found for this record</p>
                        </div>
                      ) : (
                        <div className="glass-card rounded-xl overflow-hidden border border-border/20">
                          <Table>
                            <TableHeader className="bg-background/50">
                              <TableRow>
                                <TableHead className="text-xs font-semibold py-2">Date</TableHead>
                                <TableHead className="text-xs font-semibold py-2">Description</TableHead>
                                <TableHead className="text-xs font-semibold py-2">Type</TableHead>
                                <TableHead className="text-xs font-semibold text-right py-2">Amount</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {lending.transactions.map((tx) => (
                                <TableRow key={tx.id} className="hover:bg-muted/40">
                                  <TableCell className="py-2 text-xs font-medium">
                                    {formatDate(tx.date)}
                                  </TableCell>
                                  <TableCell className="py-2 text-xs">
                                    {tx.description}
                                    {tx.notes && <div className="text-[10px] text-muted-foreground">{tx.notes}</div>}
                                  </TableCell>
                                  <TableCell className="py-2 text-xs">
                                    <span className={`px-2 py-0.5 rounded font-semibold ${tx.type === 'INCOME' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                      {tx.type}
                                    </span>
                                  </TableCell>
                                  <TableCell className="py-2 text-xs font-bold text-right">
                                    {formatCurrency(tx.amount)}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  )}

                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* New/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="form-spacious glass-dialog sm:max-w-[425px] lg:max-w-[550px] lg:p-8">
          <form onSubmit={handleSaveLending} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-foreground">
                {editingLending ? 'Edit Record' : 'Record New Entry'}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Enter details to track funds you {activeTab === 'LENT' ? 'lent out' : 'borrowed'}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Person *</Label>
                <Select 
                  value={personId} 
                  onValueChange={(val: any) => {
                    setPersonId(val || '');
                    const person = people.find(p => p.id === val);
                    if (person) setPersonName(person.name);
                    else setPersonName('');
                  }}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select Person">
                      {people.find(p => p.id === personId)?.name || (personName || 'Select Person')}
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
                    <Label htmlFor="person" className="text-xs text-muted-foreground">Or enter name manually</Label>
                    <Input
                      id="person"
                      placeholder="e.g. John Doe"
                      value={personName}
                      onChange={(e) => setPersonName(e.target.value)}
                      className="h-9 text-xs mt-1"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="totalAmount" className="text-xs">Total Amount *</Label>
                  <Input
                    id="totalAmount"
                    type="number"
                    step="0.01"
                    placeholder="e.g. 1500"
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="outstanding" className="text-xs">Outstanding Balance</Label>
                  <Input
                    id="outstanding"
                    type="number"
                    step="0.01"
                    placeholder="Same as total"
                    value={outstandingBalance}
                    onChange={(e) => setOutstandingBalance(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="dueDate" className="text-xs">Maturity / Due Date</Label>
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
                <Label htmlFor="account" className="text-xs">Related Account</Label>
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
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="h-9 text-xs">
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} className="h-9 text-xs gradient-primary font-semibold">
                {isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Save Record
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
              <DialogTitle className="text-lg font-bold text-foreground">
                {activeTab === 'LENT' ? 'Collect Repayment' : 'Make Repayment'}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {activeTab === 'LENT' ? 'Confirm collection of funds from borrower.' : 'Record a repayment made to lender.'}
              </DialogDescription>
            </DialogHeader>

            {collectLending && (
              <div className="space-y-3">
                <div className="bg-background/25 border border-border/20 rounded-lg p-3 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Person:</span>
                    <span className="font-bold text-foreground">{collectLending.personName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Outstanding:</span>
                    <span className="font-bold text-orange-400">{formatCurrency(collectLending.outstandingBalance)}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="collectTo" className="text-xs">Account</Label>
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
                  <Label htmlFor="collectAmt" className="text-xs">Amount</Label>
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
                  <Label htmlFor="collectDate" className="text-xs">Date</Label>
                  <Input
                    id="collectDate"
                    type="date"
                    value={collectDate}
                    onChange={(e) => setCollectDate(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="collectNotes" className="text-xs">Notes</Label>
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
              <Button type="button" variant="outline" onClick={() => setIsCollectOpen(false)} className="h-9 text-xs">
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} className="h-9 text-xs gradient-primary font-semibold">
                {isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Confirm
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
