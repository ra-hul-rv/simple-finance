'use client';

import { useEffect, useState, useTransition, useMemo } from 'react';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  Coins,
  Trash2,
  Edit2,
  Calendar,
  AlertCircle,
  Percent,
  TrendingUp,
  TrendingDown,
  Archive,
  CheckCircle2,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  ChevronDown,
  ChevronUp,
  Eye,
  HandCoins,
  Wallet,
  AlertTriangle,
  Scale,
  CreditCard,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency, formatDate } from '@/lib/format';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmisTab } from './emis-tab';

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

type ActiveTab = 'OVERVIEW' | 'LENT' | 'BORROWED' | 'EMI';

export default function LendingPage() {
  const [lendings, setLendings] = useState<Lending[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [people, setPeople] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState<ActiveTab>('OVERVIEW');
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

  // ── Computed data ──
  const activeLent = useMemo(() => lendings.filter(l => l.type === 'LENT' && l.status === 'ACTIVE'), [lendings]);
  const activeBorrowed = useMemo(() => lendings.filter(l => l.type === 'BORROWED' && l.status === 'ACTIVE'), [lendings]);
  const allActive = useMemo(() => lendings.filter(l => l.status === 'ACTIVE'), [lendings]);

  const totalLentActive = activeLent.reduce((s, l) => s + l.outstandingBalance, 0);
  const totalBorrowedActive = activeBorrowed.reduce((s, l) => s + l.outstandingBalance, 0);
  const netPosition = totalLentActive - totalBorrowedActive;

  const overdueItems = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return allActive.filter(l => {
      if (!l.dueDate) return false;
      return new Date(l.dueDate) < today;
    });
  }, [allActive]);

  const recentTransactions = useMemo(() => {
    return lendings
      .flatMap(l => l.transactions.map(tx => ({ ...tx, personName: l.personName, lendingType: l.type, color: l.color })))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 6);
  }, [lendings]);

  // Per-person breakdown for bar charts
  const perPersonLent = useMemo(() => {
    const map = new Map<string, { name: string; outstanding: number; total: number; color: string }>();
    activeLent.forEach(l => {
      const existing = map.get(l.personName) || { name: l.personName, outstanding: 0, total: 0, color: l.color };
      existing.outstanding += l.outstandingBalance;
      existing.total += l.totalAmount;
      map.set(l.personName, existing);
    });
    return Array.from(map.values()).sort((a, b) => b.outstanding - a.outstanding);
  }, [activeLent]);

  const perPersonBorrowed = useMemo(() => {
    const map = new Map<string, { name: string; outstanding: number; total: number; color: string }>();
    activeBorrowed.forEach(l => {
      const existing = map.get(l.personName) || { name: l.personName, outstanding: 0, total: 0, color: l.color };
      existing.outstanding += l.outstandingBalance;
      existing.total += l.totalAmount;
      map.set(l.personName, existing);
    });
    return Array.from(map.values()).sort((a, b) => b.outstanding - a.outstanding);
  }, [activeBorrowed]);

  // ── Tab config ──
  const tabConfig: Record<ActiveTab, { title: string; description: string }> = {
    OVERVIEW: { title: 'Lending & Debts', description: 'Overview of all your loans, debts, and EMIs' },
    LENT: { title: 'Loans Given', description: 'Money you lent to others — track collections' },
    BORROWED: { title: 'Money Borrowed', description: 'Debts you owe — track repayments' },
    EMI: { title: 'EMI Tracker', description: 'Track your EMIs, splits, taxes, and installments' },
  };

  // ── Handlers ──
  const handleOpenAddDialog = (type: 'LENT' | 'BORROWED' = 'LENT') => {
    setEditingLending(null);
    setPersonId('');
    setPersonName('');
    setLendingType(type);
    setTotalAmount('');
    setOutstandingBalance('');
    setDueDate('');
    setInterestRate('');
    setNotes('');
    setAccountId(accounts[0]?.id || '');
    setColor(type === 'LENT' ? '#f97316' : '#a855f7');
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

  // ── Per-person bar chart component ──
  function PersonBreakdownChart({ data, maxVal, accentClass }: { data: { name: string; outstanding: number; total: number; color: string }[]; maxVal: number; accentClass: string }) {
    if (data.length === 0) return null;
    return (
      <Card className="glass-card">
        <CardContent className="p-5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Per-Person Breakdown</h4>
          <div className="space-y-3">
            {data.slice(0, 8).map((p) => {
              const pct = maxVal > 0 ? (p.outstanding / maxVal) * 100 : 0;
              return (
                <div key={p.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                      <span className="font-semibold text-foreground">{p.name}</span>
                    </div>
                    <span className="font-bold text-foreground">{formatCurrency(p.outstanding)}</span>
                  </div>
                  <div className="h-2 w-full bg-muted/60 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${accentClass}`}
                      style={{ width: `${Math.max(4, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── Lending list renderer (shared for LENT / BORROWED) ──
  function renderLendingList(tabType: 'LENT' | 'BORROWED') {
    const isLent = tabType === 'LENT';
    const filteredAll = lendings.filter(l => l.type === tabType);
    const displayList = filteredAll.filter(l => l.status === statusTab);
    const totalSum = filteredAll.reduce((sum, l) => sum + l.totalAmount, 0);
    const outstandingSum = filteredAll.filter(l => l.status === 'ACTIVE').reduce((sum, l) => sum + l.outstandingBalance, 0);
    const settledSum = filteredAll.filter(l => l.status === 'SETTLED').reduce((sum, l) => sum + l.totalAmount, 0);
    const activeCount = filteredAll.filter(l => l.status === 'ACTIVE').length;
    const recoveredSum = filteredAll.filter(l => l.status === 'ACTIVE').reduce((sum, l) => sum + (l.totalAmount - l.outstandingBalance), 0);
    const collectionRate = totalSum > 0 ? ((totalSum - outstandingSum) / totalSum * 100) : 0;
    const personData = isLent ? perPersonLent : perPersonBorrowed;
    const maxBar = personData.length > 0 ? personData[0].outstanding : 0;

    return (
      <div className="space-y-6">
        {/* Stat cards */}
        <div className="grid gap-4 md:grid-cols-5">
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
                  {isLent ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card overflow-hidden relative">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Outstanding</p>
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
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                    {isLent ? 'Recovered' : 'Repaid'}
                  </p>
                  <h3 className="text-xl font-bold mt-1 text-emerald-400">{formatCurrency(recoveredSum)}</h3>
                </div>
                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card overflow-hidden relative">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Active</p>
                  <h3 className="text-xl font-bold mt-1 text-foreground">{activeCount} records</h3>
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
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                    {isLent ? 'Collection' : 'Repayment'} Rate
                  </p>
                  <h3 className="text-xl font-bold mt-1 text-foreground">{collectionRate.toFixed(0)}%</h3>
                </div>
                <div className="relative h-11 w-11">
                  <div
                    className="h-11 w-11 rounded-full"
                    style={{
                      background: `conic-gradient(${isLent ? '#f97316' : '#a855f7'} ${collectionRate * 3.6}deg, hsl(var(--muted)) ${collectionRate * 3.6}deg)`,
                    }}
                  />
                  <div className="absolute inset-[3px] rounded-full bg-card" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bar chart + records */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left: Bar Chart */}
          <div className="lg:col-span-1">
            <PersonBreakdownChart
              data={personData}
              maxVal={maxBar}
              accentClass={isLent ? 'bg-gradient-to-r from-orange-500 to-amber-400' : 'bg-gradient-to-r from-purple-500 to-violet-400'}
            />
          </div>

          {/* Right: Records list */}
          <div className="lg:col-span-2 space-y-4">
            {/* Status toggle */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={statusTab === 'ACTIVE' ? 'secondary' : 'ghost'}
                onClick={() => setStatusTab('ACTIVE')}
                className="h-7 text-xs font-semibold rounded-lg"
              >
                Active ({filteredAll.filter(l => l.status === 'ACTIVE').length})
              </Button>
              <Button
                size="sm"
                variant={statusTab === 'SETTLED' ? 'secondary' : 'ghost'}
                onClick={() => setStatusTab('SETTLED')}
                className="h-7 text-xs font-semibold rounded-lg"
              >
                Settled ({filteredAll.filter(l => l.status === 'SETTLED').length})
              </Button>
            </div>

            {loading ? (
              <div className="flex h-36 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
              </div>
            ) : displayList.length === 0 ? (
              <Card className="glass-card">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <div className={`p-4 rounded-2xl mb-4 ${isLent ? 'bg-orange-500/10' : 'bg-purple-500/10'}`}>
                    {isLent ? <HandCoins className="h-8 w-8 text-orange-400" /> : <Wallet className="h-8 w-8 text-purple-400" />}
                  </div>
                  <p className="text-sm font-semibold text-foreground mb-1">
                    No {statusTab.toLowerCase()} {isLent ? 'loans' : 'debts'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {statusTab === 'ACTIVE'
                      ? `Click "New ${isLent ? 'Loan' : 'Debt'}" to start tracking`
                      : 'Settled records will appear here'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {displayList.map((lending) => {
                  const returned = lending.totalAmount - lending.outstandingBalance;
                  const progressPercent = lending.totalAmount > 0 
                    ? Math.min(100, Math.max(0, (returned / lending.totalAmount) * 100))
                    : 0;
                  const isExpanded = expandedId === lending.id;
                  const isOverdue = lending.dueDate && new Date(lending.dueDate) < new Date() && lending.status === 'ACTIVE';

                  return (
                    <Card key={lending.id} className={`glass-card hover-border relative overflow-hidden group ${isOverdue ? 'border-red-500/30' : ''}`}>
                      <CardContent className="p-0">
                        {/* Overdue indicator line */}
                        {isOverdue && <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-red-500 to-orange-500" />}

                        <div 
                          className="p-5 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
                          onClick={() => toggleExpand(lending.id)}
                        >
                          <div className="space-y-1.5 min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: lending.color }} />
                              <h4 className="font-bold text-foreground">{lending.personName}</h4>
                              {lending.interestRate && (
                                <span className="text-[10px] font-semibold bg-orange-500/10 border border-orange-500/20 text-orange-400 px-2 py-0.5 rounded">
                                  {lending.interestRate}% APR
                                </span>
                              )}
                              {isOverdue && (
                                <span className="text-[10px] font-semibold bg-red-500/10 border border-red-500/20 text-red-400 px-2 py-0.5 rounded flex items-center gap-1">
                                  <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                                  OVERDUE
                                </span>
                              )}
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${lending.status === 'SETTLED' ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'}`}>
                                {lending.status}
                              </span>
                            </div>
                            {lending.notes && <p className="text-xs text-muted-foreground line-clamp-1">{lending.notes}</p>}
                            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                              {lending.dueDate && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  Maturity: {formatDate(lending.dueDate)}
                                </span>
                              )}
                              {lending.account && (
                                <span className="flex items-center gap-1">
                                  <ArrowUpRight className="h-3 w-3" />
                                  {lending.account.name}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex-1 max-w-xs space-y-1.5">
                            <div className="flex items-center justify-between text-xs font-semibold">
                              <span className="text-muted-foreground">{isLent ? 'Recovery' : 'Repayment'}</span>
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

                          <div className="flex items-center gap-4 justify-between md:justify-end shrink-0">
                            <div className="text-right">
                              <p className="text-[10px] uppercase font-semibold text-muted-foreground">Outstanding</p>
                              <p className={`text-lg font-bold mt-0.5 ${isLent ? 'text-orange-400' : 'text-purple-400'}`}>{formatCurrency(lending.outstandingBalance)}</p>
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
          </div>
        </div>
      </div>
    );
  }

  // ── Overview tab ──
  function renderOverview() {
    const totalLentAll = lendings.filter(l => l.type === 'LENT').reduce((s, l) => s + l.totalAmount, 0);
    const totalBorrowedAll = lendings.filter(l => l.type === 'BORROWED').reduce((s, l) => s + l.totalAmount, 0);
    const settledLent = lendings.filter(l => l.type === 'LENT' && l.status === 'SETTLED').reduce((s, l) => s + l.totalAmount, 0);
    const settledBorrowed = lendings.filter(l => l.type === 'BORROWED' && l.status === 'SETTLED').reduce((s, l) => s + l.totalAmount, 0);
    const allPersonData = [...perPersonLent, ...perPersonBorrowed];
    const maxBar = allPersonData.length > 0 ? Math.max(...allPersonData.map(p => p.outstanding)) : 0;

    return (
      <div className="space-y-6">
        {/* Net Position Hero */}
        <Card className="glass-card overflow-hidden relative">
          <div className={`absolute inset-0 opacity-[0.03] ${netPosition >= 0 ? 'bg-gradient-to-br from-emerald-500 to-green-600' : 'bg-gradient-to-br from-red-500 to-rose-600'}`} />
          <CardContent className="p-6 md:p-8 relative">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Scale className="h-5 w-5 text-muted-foreground" />
                  <p className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Net Position</p>
                </div>
                <h2 className={`text-3xl md:text-4xl font-black tracking-tight ${netPosition >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {netPosition >= 0 ? '+' : ''}{formatCurrency(netPosition)}
                </h2>
                <p className="text-xs text-muted-foreground max-w-sm">
                  {netPosition >= 0
                    ? 'People owe you more than you owe. Your lending position is healthy.'
                    : 'You owe more than others owe you. Focus on settling your debts.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 md:gap-6">
                <div className="text-center md:text-right space-y-0.5">
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-orange-400/80">Others Owe You</p>
                  <p className="text-xl font-bold text-orange-400">{formatCurrency(totalLentActive)}</p>
                  <p className="text-[10px] text-muted-foreground">{activeLent.length} active loans</p>
                </div>
                <div className="text-center md:text-right space-y-0.5">
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-purple-400/80">You Owe Others</p>
                  <p className="text-xl font-bold text-purple-400">{formatCurrency(totalBorrowedActive)}</p>
                  <p className="text-[10px] text-muted-foreground">{activeBorrowed.length} active debts</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats Row */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="glass-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Total Lent (Lifetime)</p>
                  <h3 className="text-lg font-bold mt-1 text-foreground">{formatCurrency(totalLentAll)}</h3>
                  <p className="text-[10px] text-emerald-400 font-semibold mt-0.5">{formatCurrency(settledLent)} settled</p>
                </div>
                <div className="p-2.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Total Borrowed (Lifetime)</p>
                  <h3 className="text-lg font-bold mt-1 text-foreground">{formatCurrency(totalBorrowedAll)}</h3>
                  <p className="text-[10px] text-emerald-400 font-semibold mt-0.5">{formatCurrency(settledBorrowed)} repaid</p>
                </div>
                <div className="p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400">
                  <TrendingDown className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Total Active</p>
                  <h3 className="text-lg font-bold mt-1 text-foreground">{allActive.length} records</h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{activeLent.length} loans · {activeBorrowed.length} debts</p>
                </div>
                <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  <Clock className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`glass-card ${overdueItems.length > 0 ? 'border-red-500/30' : ''}`}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Overdue</p>
                  <h3 className={`text-lg font-bold mt-1 ${overdueItems.length > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {overdueItems.length > 0 ? `${overdueItems.length} items` : 'All clear'}
                  </h3>
                  {overdueItems.length > 0 && (
                    <p className="text-[10px] text-red-400 font-semibold mt-0.5">
                      {formatCurrency(overdueItems.reduce((s, l) => s + l.outstandingBalance, 0))} outstanding
                    </p>
                  )}
                </div>
                <div className={`p-2.5 rounded-lg border ${overdueItems.length > 0 ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
                  {overdueItems.length > 0 ? <AlertTriangle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Two-column: Chart + Overdue/Recent */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Lent breakdown */}
          {perPersonLent.length > 0 && (
            <PersonBreakdownChart
              data={perPersonLent}
              maxVal={Math.max(...perPersonLent.map(p => p.outstanding))}
              accentClass="bg-gradient-to-r from-orange-500 to-amber-400"
            />
          )}

          {/* Borrowed breakdown */}
          {perPersonBorrowed.length > 0 && (
            <PersonBreakdownChart
              data={perPersonBorrowed}
              maxVal={Math.max(...perPersonBorrowed.map(p => p.outstanding))}
              accentClass="bg-gradient-to-r from-purple-500 to-violet-400"
            />
          )}
        </div>

        {/* Overdue Alerts */}
        {overdueItems.length > 0 && (
          <Card className="glass-card border-red-500/20">
            <CardContent className="p-5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-red-400 mb-4 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Overdue Alerts
              </h4>
              <div className="space-y-2">
                {overdueItems.map(item => {
                  const daysOverdue = Math.floor((Date.now() - new Date(item.dueDate!).getTime()) / (1000 * 60 * 60 * 24));
                  return (
                    <div key={item.id} className="flex items-center justify-between rounded-lg p-3 bg-red-500/5 border border-red-500/10">
                      <div className="flex items-center gap-3">
                        <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                        <div>
                          <p className="text-sm font-semibold text-foreground">{item.personName}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {item.type === 'LENT' ? 'Loan' : 'Debt'} · Due {formatDate(item.dueDate!)} · {daysOverdue}d overdue
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-red-400">{formatCurrency(item.outstandingBalance)}</p>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 text-[10px] text-red-400 hover:text-red-300 px-2 -mr-2"
                          onClick={() => handleOpenCollectDialog(item)}
                        >
                          {item.type === 'LENT' ? 'Collect' : 'Repay'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Activity */}
        {recentTransactions.length > 0 && (
          <Card className="glass-card">
            <CardContent className="p-5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Recent Activity
              </h4>
              <div className="space-y-2">
                {recentTransactions.map(tx => (
                  <div key={tx.id} className="flex items-center justify-between rounded-lg p-3 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: tx.color }} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{tx.description}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {tx.personName} · {formatDate(tx.date)} · {tx.lendingType === 'LENT' ? 'Loan' : 'Debt'}
                        </p>
                      </div>
                    </div>
                    <span className={`text-sm font-bold shrink-0 ${tx.type === 'INCOME' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {tx.type === 'INCOME' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty state for overview */}
        {lendings.length === 0 && !loading && (
          <Card className="glass-card">
            <CardContent className="flex flex-col items-center justify-center py-20 text-center">
              <div className="p-5 rounded-2xl bg-primary/10 mb-4">
                <Scale className="h-10 w-10 text-primary" />
              </div>
              <p className="text-lg font-bold text-foreground mb-1">No records yet</p>
              <p className="text-sm text-muted-foreground max-w-sm mb-6">
                Start tracking loans and debts. Switch to the &quot;Loans Given&quot; or &quot;Borrowed&quot; tab to add records.
              </p>
              <div className="flex gap-3">
                <Button onClick={() => { setActiveTab('LENT'); handleOpenAddDialog('LENT'); }} className="gap-1 gradient-primary text-xs font-semibold">
                  <Plus className="h-3.5 w-3.5" /> New Loan
                </Button>
                <Button onClick={() => { setActiveTab('BORROWED'); handleOpenAddDialog('BORROWED'); }} variant="outline" className="gap-1 text-xs font-semibold">
                  <Plus className="h-3.5 w-3.5" /> New Debt
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // ── Render ──
  const { title, description } = tabConfig[activeTab];
  const isLendingTab = activeTab === 'LENT' || activeTab === 'BORROWED';

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title={title} description={description}>
        {activeTab === 'LENT' && (
          <Button onClick={() => handleOpenAddDialog('LENT')} className="h-8 gap-1 gradient-primary text-xs font-semibold">
            <Plus className="h-3.5 w-3.5" /> New Loan
          </Button>
        )}
        {activeTab === 'BORROWED' && (
          <Button onClick={() => handleOpenAddDialog('BORROWED')} className="h-8 gap-1 gradient-primary text-xs font-semibold">
            <Plus className="h-3.5 w-3.5" /> New Debt
          </Button>
        )}
      </PageHeader>

      {/* Tab Navigation */}
      <div className="flex justify-between items-center bg-card/40 p-1.5 rounded-lg border border-border/50 max-w-[500px]">
        <Tabs value={activeTab} onValueChange={(val: any) => { setActiveTab(val); setExpandedId(null); }} className="w-full">
          <TabsList className="grid grid-cols-4 w-full h-9">
            <TabsTrigger value="OVERVIEW" className="text-xs gap-1.5">
              <Eye className="h-3.5 w-3.5" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="LENT" className="text-xs gap-1.5">
              <HandCoins className="h-3.5 w-3.5" />
              Loans
            </TabsTrigger>
            <TabsTrigger value="BORROWED" className="text-xs gap-1.5">
              <Wallet className="h-3.5 w-3.5" />
              Borrowed
            </TabsTrigger>
            <TabsTrigger value="EMI" className="text-xs gap-1.5">
              <CreditCard className="h-3.5 w-3.5" />
              EMIs
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Tab Content */}
      {loading && activeTab !== 'EMI' ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : activeTab === 'OVERVIEW' ? (
        renderOverview()
      ) : activeTab === 'EMI' ? (
        <EmisTab />
      ) : (
        renderLendingList(activeTab)
      )}

      {/* New/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="form-spacious glass-dialog sm:max-w-[425px] lg:max-w-[550px] lg:p-8">
          <form onSubmit={handleSaveLending} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-foreground">
                {editingLending ? 'Edit Record' : `Record New ${lendingType === 'LENT' ? 'Loan' : 'Debt'}`}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Enter details to track funds you {lendingType === 'LENT' ? 'lent out' : 'borrowed'}.
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
                    <SelectValue>
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
                {collectLending?.type === 'LENT' ? 'Collect Repayment' : 'Make Repayment'}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {collectLending?.type === 'LENT' ? 'Confirm collection of funds from borrower.' : 'Record a repayment made to lender.'}
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
