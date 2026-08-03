'use client';

import { useEffect, useState, use, useTransition } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Calendar,
  Building,
  AlertCircle,
  Clock,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Plus,
  Edit2,
  Trash2,
  Zap,
  Eye,
  EyeOff,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency, formatDate } from '@/lib/format';
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
  subAccounts?: SubAccount[];
}

interface SubAccount {
  id: string;
  name: string;
  balance: number;
  color: string;
  icon: string;
  iconPath: string | null;
  credentials: string | null;
  notes: string | null;
  isActive: boolean;
}

interface Transaction {
  id: string;
  date: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'INVESTMENT' | 'CREDIT_CARD_PAYMENT' | 'REFUND' | 'INTEREST' | 'DIVIDEND';
  description: string;
  merchant: string | null;
  category: { name: string; color: string } | null;
}

export default function AccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [account, setAccount] = useState<Account | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  
  // Sorting
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'description'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Sub-account management
  const [isSubAccountDialogOpen, setIsSubAccountDialogOpen] = useState(false);
  const [editingSubAccount, setEditingSubAccount] = useState<SubAccount | null>(null);
  const [saName, setSaName] = useState('');
  const [saColor, setSaColor] = useState('#6366f1');
  const [saBalance, setSaBalance] = useState('0');
  const [saNotes, setSaNotes] = useState('');
  const [saCredUsername, setSaCredUsername] = useState('');
  const [saCredPassword, setSaCredPassword] = useState('');
  const [saCredNotes, setSaCredNotes] = useState('');
  const [revealedCredentials, setRevealedCredentials] = useState<Record<string, boolean>>({});

  const fetchDetails = async () => {
    try {
      // 1. Fetch account info
      const accRes = await fetch(`/api/accounts/${id}`);
      if (!accRes.ok) throw new Error('Account not found');
      const accData = await accRes.json();
      setAccount(accData);

      // 2. Fetch transactions for this account
      const txRes = await fetch(`/api/transactions?accountId=${id}&limit=100&sortBy=${sortBy}&sortOrder=${sortOrder}`);
      if (!txRes.ok) throw new Error('Failed to load transactions');
      const txData = await txRes.json();
      setTransactions(txData.transactions);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load account ledger details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id, sortBy, sortOrder]);

  const toggleSort = (column: 'date' | 'amount' | 'description') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const renderSortIcon = (column: 'date' | 'amount' | 'description') => {
    if (sortBy !== column) return <ArrowUpDown className="ml-1 h-3 w-3 inline opacity-50" />;
    return sortOrder === 'asc' ? <ArrowUp className="ml-1 h-3 w-3 inline" /> : <ArrowDown className="ml-1 h-3 w-3 inline" />;
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-3">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <h3 className="text-lg font-semibold">Ledger Not Found</h3>
        <p className="text-sm text-muted-foreground">The requested financial account could not be resolved.</p>
        <Link href="/accounts">
          <Button size="sm">Go back to accounts</Button>
        </Link>
      </div>
    );
  }

  const incomeSum = transactions
    .filter((t) => t.type === 'INCOME' || t.type === 'REFUND' || t.type === 'INTEREST' || t.type === 'DIVIDEND')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const expenseSum = transactions
    .filter((t) => t.type === 'EXPENSE' || t.type === 'INVESTMENT')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const handleOpenAddSubAccount = () => {
    setEditingSubAccount(null);
    setSaName('');
    setSaColor('#6366f1');
    setSaBalance('0');
    setSaNotes('');
    setSaCredUsername('');
    setSaCredPassword('');
    setSaCredNotes('');
    setIsSubAccountDialogOpen(true);
  };

  const handleOpenEditSubAccount = (sa: SubAccount) => {
    setEditingSubAccount(sa);
    setSaName(sa.name);
    setSaColor(sa.color);
    setSaBalance(sa.balance.toString());
    setSaNotes(sa.notes || '');
    try {
      const creds = sa.credentials ? JSON.parse(sa.credentials) : {};
      setSaCredUsername(creds.username || '');
      setSaCredPassword(creds.password || '');
      setSaCredNotes(creds.notes || '');
    } catch {
      setSaCredUsername('');
      setSaCredPassword('');
      setSaCredNotes('');
    }
    setIsSubAccountDialogOpen(true);
  };

  const handleSaveSubAccount = () => {
    if (!saName.trim()) { toast.error('Name is required'); return; }
    startTransition(async () => {
      try {
        const credentials = (saCredUsername || saCredPassword || saCredNotes)
          ? JSON.stringify({ username: saCredUsername, password: saCredPassword, notes: saCredNotes })
          : null;
        const payload: any = {
          name: saName.trim(),
          color: saColor,
          balance: parseFloat(saBalance || '0'),
          notes: saNotes.trim() || null,
          credentials,
        };
        if (!editingSubAccount) {
          payload.accountId = id;
        }
        const url = editingSubAccount ? `/api/sub-accounts/${editingSubAccount.id}` : '/api/sub-accounts';
        const method = editingSubAccount ? 'PUT' : 'POST';
        const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!res.ok) throw new Error('Failed to save');
        toast.success(editingSubAccount ? 'Sub-account updated' : 'Sub-account created');
        setIsSubAccountDialogOpen(false);
        fetchDetails();
      } catch { toast.error('Failed to save sub-account'); }
    });
  };

  const handleDeleteSubAccount = async (saId: string) => {
    if (!confirm('Delete this sub-account? Its balance will be removed from the wallet.')) return;
    try {
      const res = await fetch(`/api/sub-accounts/${saId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Sub-account deleted');
      fetchDetails();
    } catch { toast.error('Failed to delete'); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-2">
        <Link href="/accounts">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-accent">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <PageHeader title={account.name} description={account.institution || 'Ledger detailed report'} />
      </div>

      {/* Overview stats specific to this ledger */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Current Balance"
          value={account.balance}
          prefix={account.currency === 'INR' ? '₹' : '$'}
          trend={0}
          variant="glass"
          className="border-t-4"
          style={{ borderTopColor: account.color }}
        />
        <StatCard
          title="Total Inflow"
          value={incomeSum}
          prefix={account.currency === 'INR' ? '₹' : '$'}
          icon={<ArrowUpRight className="h-4 w-4 text-success" />}
        />
        <StatCard
          title="Total Outflow"
          value={expenseSum}
          prefix={account.currency === 'INR' ? '₹' : '$'}
          icon={<ArrowDownRight className="h-4 w-4 text-destructive" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Transaction History Column */}
        <Card className="glass lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase label-uppercase tracking-wider">Account Statements</CardTitle>
            <CardDescription>All transactions routed through this account</CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            {transactions.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                No statement records for this account
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead 
                        className="label-uppercase text-[10px] cursor-pointer select-none"
                        onClick={() => toggleSort('date')}
                      >
                        Date {renderSortIcon('date')}
                      </TableHead>
                      <TableHead 
                        className="label-uppercase text-[10px] cursor-pointer select-none"
                        onClick={() => toggleSort('description')}
                      >
                        Description {renderSortIcon('description')}
                      </TableHead>
                      <TableHead className="label-uppercase text-[10px]">Category</TableHead>
                      <TableHead 
                        className="text-right label-uppercase text-[10px] cursor-pointer select-none"
                        onClick={() => toggleSort('amount')}
                      >
                        Amount {renderSortIcon('amount')}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="text-xs font-medium text-muted-foreground">
                          {formatDate(tx.date, 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-sm">{tx.description}</div>
                          {tx.merchant && (
                            <div className="text-[10px] text-muted-foreground mt-0.5">{tx.merchant}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          {tx.category ? (
                            <span
                              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                              style={{
                                backgroundColor: `${tx.category.color}15`,
                                color: tx.category.color,
                              }}
                            >
                              {tx.category.name}
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent text-muted-foreground">
                              Transfer/Payment
                            </span>
                          )}
                        </TableCell>
                        <TableCell className={`text-right font-bold tabular-nums text-sm ${
                          tx.type === 'INCOME' || tx.type === 'REFUND' || tx.type === 'INTEREST' || tx.type === 'DIVIDEND'
                            ? 'text-success'
                            : 'text-foreground'
                        }`}>
                          {tx.type === 'INCOME' || tx.type === 'REFUND' || tx.type === 'INTEREST' || tx.type === 'DIVIDEND' ? '+' : '-'}
                          {formatCurrency(Number(tx.amount), account.currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ledger Metadata Details */}
        <div className="space-y-6">
          <Card className="glass">
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase label-uppercase tracking-wider">Ledger Details</CardTitle>
              <CardDescription>System properties for this account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs font-semibold text-muted-foreground">
              {account.institution && (
                <div className="flex justify-between border-b pb-2">
                  <span>Institution</span>
                  <span className="text-foreground">{account.institution}</span>
                </div>
              )}
              {account.accountNumber && (
                <div className="flex justify-between border-b pb-2">
                  <span>Account Number</span>
                  <span className="text-foreground font-mono">{account.accountNumber}</span>
                </div>
              )}
              <div className="flex justify-between border-b pb-2">
                <span>Account Type</span>
                <span className="text-foreground">{account.type}</span>
              </div>
              {account.interestRate && (
                <div className="flex justify-between border-b pb-2">
                  <span>Interest Rate</span>
                  <span className="text-success">{account.interestRate}% p.a.</span>
                </div>
              )}
              {account.creditLimit && (
                <div className="flex justify-between border-b pb-2">
                  <span>Credit Limit</span>
                  <span className="text-foreground tabular-nums">{formatCurrency(account.creditLimit, account.currency)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {account.notes && (
            <Card className="glass">
              <CardHeader>
                <CardTitle className="text-sm font-bold uppercase label-uppercase tracking-wider">Private Notes</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {account.notes}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Sub-Accounts Section for WALLET accounts */}
      {account.type === 'WALLET' && (
        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold uppercase label-uppercase tracking-wider">Sub-Accounts / Apps</CardTitle>
              <CardDescription>Manage individual wallets and charging apps</CardDescription>
            </div>
            <Button onClick={handleOpenAddSubAccount} size="sm" className="h-8 gap-1.5 rounded-xl gradient-primary text-white font-semibold shadow-md">
              <Plus className="h-3.5 w-3.5" />
              Add App
            </Button>
          </CardHeader>
          <CardContent>
            {(!account.subAccounts || account.subAccounts.length === 0) ? (
              <div className="flex flex-col items-center justify-center h-32 text-sm text-muted-foreground">
                <Zap className="h-8 w-8 mb-2 opacity-40" />
                <p>No sub-accounts yet. Add your first charging app!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {account.subAccounts.map((sa) => {
                  let creds: any = null;
                  try { creds = sa.credentials ? JSON.parse(sa.credentials) : null; } catch {}
                  const isRevealed = revealedCredentials[sa.id] || false;
                  return (
                    <div key={sa.id} className="flex items-center gap-4 p-4 rounded-xl border border-border/40 bg-card/30 hover:bg-card/50 transition-colors">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: sa.color }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm">{sa.name}</span>
                          {!sa.isActive && <Badge variant="outline" className="text-[9px]">Inactive</Badge>}
                        </div>
                        {sa.notes && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{sa.notes}</p>}
                        {creds && (
                          <div className="mt-1.5 flex items-center gap-2">
                            <button
                              onClick={() => setRevealedCredentials(prev => ({ ...prev, [sa.id]: !prev[sa.id] }))}
                              className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                            >
                              {isRevealed ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                              {isRevealed ? 'Hide' : 'Show'} credentials
                            </button>
                            {isRevealed && (
                              <span className="text-[10px] font-mono text-muted-foreground">
                                {creds.username && <span>{creds.username}</span>}
                                {creds.password && <span className="ml-2">/ {creds.password}</span>}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="font-bold tabular-nums text-sm">
                          {formatCurrency(sa.balance, account.currency)}
                        </div>
                        <div className="text-[10px] text-muted-foreground">balance</div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenEditSubAccount(sa)}>
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDeleteSubAccount(sa.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Sub-Account Add/Edit Dialog */}
      <Dialog open={isSubAccountDialogOpen} onOpenChange={setIsSubAccountDialogOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">{editingSubAccount ? 'Edit Sub-Account' : 'Add Sub-Account'}</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">Add a charging app or wallet with optional login credentials.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">App Name</Label>
                <Input value={saName} onChange={(e) => setSaName(e.target.value)} placeholder="e.g. Zeon" className="h-10 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Color</Label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={saColor} onChange={(e) => setSaColor(e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer border-0" />
                  <Input value={saColor} onChange={(e) => setSaColor(e.target.value)} className="h-10 rounded-xl font-mono text-xs flex-1" />
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="label-uppercase text-muted-foreground">Current Balance (₹)</Label>
              <Input type="number" value={saBalance} onChange={(e) => setSaBalance(e.target.value)} placeholder="0" className="h-10 rounded-xl font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label className="label-uppercase text-muted-foreground">Notes</Label>
              <Input value={saNotes} onChange={(e) => setSaNotes(e.target.value)} placeholder="Optional notes..." className="h-10 rounded-xl" />
            </div>
            <div className="space-y-3 p-3.5 rounded-xl border border-dashed border-border/40 bg-muted/20">
              <Label className="label-uppercase text-muted-foreground text-[10px] font-bold">Login Credentials (Optional)</Label>
              <div className="grid grid-cols-2 gap-3">
                <Input value={saCredUsername} onChange={(e) => setSaCredUsername(e.target.value)} placeholder="Username / Email" className="h-9 rounded-lg text-xs" />
                <Input value={saCredPassword} onChange={(e) => setSaCredPassword(e.target.value)} placeholder="Password" type="password" className="h-9 rounded-lg text-xs" />
              </div>
              <Input value={saCredNotes} onChange={(e) => setSaCredNotes(e.target.value)} placeholder="Additional notes (e.g. phone number)" className="h-9 rounded-lg text-xs" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSubAccountDialogOpen(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleSaveSubAccount} disabled={isPending} className="rounded-xl gradient-primary text-white font-semibold">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingSubAccount ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
