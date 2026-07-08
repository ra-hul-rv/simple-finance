'use client';

import { useEffect, useState, useTransition } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import {
  Plus,
  Edit2,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  Search,
  Filter,
  Loader2,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency, formatDate } from '@/lib/format';

interface Transaction {
  id: string;
  date: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'INVESTMENT' | 'CREDIT_CARD_PAYMENT' | 'REFUND' | 'INTEREST' | 'DIVIDEND';
  description: string;
  merchant: string | null;
  location: string | null;
  notes: string | null;
  accountId: string;
  categoryId: string | null;
  transferToAccountId: string | null;
  account: { name: string; color: string };
  category: { name: string; color: string } | null;
  transferToAccount: { name: string; color: string } | null;
}

interface Account {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
  type: 'INCOME' | 'EXPENSE';
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination & Filtering
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [accountFilter, setAccountFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Dialog forms
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isPending, startTransition] = useTransition();

  // Form states
  const [amount, setAmount] = useState('');
  const [txType, setTxType] = useState<'INCOME' | 'EXPENSE' | 'TRANSFER' | 'INVESTMENT' | 'CREDIT_CARD_PAYMENT' | 'REFUND' | 'INTEREST' | 'DIVIDEND'>('EXPENSE');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [merchant, setMerchant] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [transferToAccountId, setTransferToAccountId] = useState('');

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      let url = `/api/transactions?page=${page}&limit=15`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (typeFilter !== 'ALL') url += `&type=${typeFilter}`;
      if (accountFilter !== 'ALL') url += `&accountId=${accountFilter}`;
      if (categoryFilter !== 'ALL') url += `&categoryId=${categoryFilter}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to load transactions');
      const data = await res.json();
      setTransactions(data.transactions);
      setTotalPages(data.pagination.totalPages);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const fetchFilters = async () => {
    try {
      const [accRes, catRes] = await Promise.all([
        fetch('/api/accounts'),
        fetch('/api/categories'),
      ]);
      if (accRes.ok) setAccounts(await accRes.json());
      if (catRes.ok) setCategories(await catRes.json());
    } catch (err) {
      console.error('Failed to fetch filters:', err);
    }
  };

  useEffect(() => {
    fetchFilters();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && accounts.length > 0) {
      const urlParams = new URLSearchParams(window.location.search);
      const action = urlParams.get('action');
      if (action === 'transfer') {
        setEditingTransaction(null);
        setAmount('');
        setTxType('TRANSFER');
        setDate(new Date().toISOString().split('T')[0]);
        setDescription('Fund Transfer');
        setMerchant('');
        setLocation('');
        setNotes('');
        setAccountId(accounts[0]?.id || '');
        setCategoryId('');
        setTransferToAccountId(accounts[1]?.id || accounts[0]?.id || '');
        setIsDialogOpen(true);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [accounts]);

  useEffect(() => {
    fetchTransactions();
  }, [page, search, typeFilter, accountFilter, categoryFilter]);

  const handleOpenAddDialog = () => {
    setEditingTransaction(null);
    setAmount('');
    setTxType('EXPENSE');
    setDate(new Date().toISOString().split('T')[0]);
    setDescription('');
    setMerchant('');
    setLocation('');
    setNotes('');
    setAccountId(accounts[0]?.id || '');
    setCategoryId('');
    setTransferToAccountId('');
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (tx: Transaction) => {
    setEditingTransaction(tx);
    setAmount(tx.amount.toString());
    setTxType(tx.type);
    setDate(new Date(tx.date).toISOString().split('T')[0]);
    setDescription(tx.description);
    setMerchant(tx.merchant || '');
    setLocation(tx.location || '');
    setNotes(tx.notes || '');
    setAccountId(tx.accountId);
    setCategoryId(tx.categoryId || '');
    setTransferToAccountId(tx.transferToAccountId || '');
    setIsDialogOpen(true);
  };

  const handleSaveTransaction = () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid positive amount');
      return;
    }
    if (!description.trim()) {
      toast.error('Please enter a description');
      return;
    }
    if (!accountId) {
      toast.error('Please select an account');
      return;
    }
    if ((txType === 'TRANSFER' || txType === 'CREDIT_CARD_PAYMENT') && !transferToAccountId) {
      toast.error('Please select a destination account');
      return;
    }

    startTransition(async () => {
      try {
        const payload = {
          amount: parseFloat(amount),
          type: txType,
          date: new Date(date).toISOString(),
          description: description.trim(),
          merchant: merchant.trim() || null,
          location: location.trim() || null,
          notes: notes.trim() || null,
          accountId,
          categoryId: categoryId || null,
          transferToAccountId: transferToAccountId || null,
        };

        const url = editingTransaction ? `/api/transactions/${editingTransaction.id}` : '/api/transactions';
        const method = editingTransaction ? 'PUT' : 'POST';

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Failed to save transaction');
        }

        toast.success(editingTransaction ? 'Transaction updated' : 'Transaction created');
        setIsDialogOpen(false);
        setPage(1);
        fetchTransactions();
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || 'Failed to save transaction');
      }
    });
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!confirm('Are you sure you want to delete this transaction? Account balances will be recalculated.')) {
      return;
    }

    try {
      const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete transaction');
      toast.success('Transaction deleted');
      fetchTransactions();
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete transaction');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Transactions ledger" description="Detailed double-entry transactional record book">
        <Button size="sm" onClick={handleOpenAddDialog} className="h-8 gap-1 gradient-primary">
          <Plus className="h-4 w-4" />
          Add Transaction
        </Button>
      </PageHeader>

      {/* Toolbar filters */}
      <Card className="glass border-border/40 p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="relative flex-grow max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search statements..."
              className="pl-9 bg-background/30 h-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
            {/* Type */}
            <Select value={typeFilter} onValueChange={(val) => { setTypeFilter(val || 'ALL'); setPage(1); }}>
              <SelectTrigger className="h-9 min-w-[120px] bg-background/30">
                <SelectValue placeholder="Type">
                  {typeFilter === 'ALL' ? 'All Types' : typeFilter === 'INCOME' ? 'Income' : typeFilter === 'EXPENSE' ? 'Expense' : typeFilter === 'TRANSFER' ? 'Transfer' : typeFilter === 'INVESTMENT' ? 'Investment' : typeFilter === 'CREDIT_CARD_PAYMENT' ? 'CC Payment' : typeFilter}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Types</SelectItem>
                <SelectItem value="INCOME">Income</SelectItem>
                <SelectItem value="EXPENSE">Expense</SelectItem>
                <SelectItem value="TRANSFER">Transfer</SelectItem>
                <SelectItem value="INVESTMENT">Investment</SelectItem>
                <SelectItem value="CREDIT_CARD_PAYMENT">CC Payment</SelectItem>
              </SelectContent>
            </Select>

            {/* Account */}
            <Select value={accountFilter} onValueChange={(val) => { setAccountFilter(val || 'ALL'); setPage(1); }}>
              <SelectTrigger className="h-9 min-w-[140px] bg-background/30">
                <SelectValue placeholder="Account">
                  {accountFilter === 'ALL' ? 'All Accounts' : accounts.find(a => a.id === accountFilter)?.name || accountFilter}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Accounts</SelectItem>
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Category */}
            <Select value={categoryFilter} onValueChange={(val) => { setCategoryFilter(val || 'ALL'); setPage(1); }}>
              <SelectTrigger className="h-9 min-w-[140px] bg-background/30">
                <SelectValue placeholder="Category">
                  {categoryFilter === 'ALL' ? 'All Categories' : categories.find(c => c.id === categoryFilter)?.name || categoryFilter}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button size="sm" variant="outline" onClick={() => {
              setSearch('');
              setTypeFilter('ALL');
              setAccountFilter('ALL');
              setCategoryFilter('ALL');
              setPage(1);
            }} className="h-9">
              Clear Filters
            </Button>
          </div>
        </div>
      </Card>

      {/* Ledger Table */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <Card className="glass overflow-hidden border-border/40">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="label-uppercase text-[10px] pl-6">Date</TableHead>
                  <TableHead className="label-uppercase text-[10px]">Description</TableHead>
                  <TableHead className="label-uppercase text-[10px]">Account</TableHead>
                  <TableHead className="label-uppercase text-[10px]">Location</TableHead>
                  <TableHead className="label-uppercase text-[10px]">Category</TableHead>
                  <TableHead className="text-right label-uppercase text-[10px] pr-6">Amount</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id} className="hover:bg-accent/10">
                    <TableCell className="text-xs text-muted-foreground pl-6">
                      {formatDate(tx.date, 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-sm">{tx.description}</div>
                      {tx.merchant && (
                        <div className="text-[10px] text-muted-foreground mt-0.5">{tx.merchant}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs font-semibold">
                      {tx.type === 'TRANSFER' || tx.type === 'CREDIT_CARD_PAYMENT' ? (
                        <span className="flex items-center gap-1">
                          <span className="truncate">{tx.account.name}</span>
                          <ArrowLeftRight className="h-3 w-3 text-muted-foreground inline" />
                          <span className="truncate text-primary">{tx.transferToAccount?.name || 'External'}</span>
                        </span>
                      ) : (
                        tx.account.name
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground italic">
                      {tx.location || '—'}
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
                          {tx.type}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className={`text-right font-bold tabular-nums text-sm pr-6 ${
                      tx.type === 'INCOME' || tx.type === 'REFUND' || tx.type === 'INTEREST' || tx.type === 'DIVIDEND'
                        ? 'text-success'
                        : 'text-foreground'
                    }`}>
                      {tx.type === 'INCOME' || tx.type === 'REFUND' || tx.type === 'INTEREST' || tx.type === 'DIVIDEND' ? '+' : '-'}
                      {formatCurrency(tx.amount, 'INR')}
                    </TableCell>
                    <TableCell className="pr-6">
                      <div className="flex items-center gap-1 justify-end">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 rounded hover:bg-accent"
                          onClick={() => handleOpenEditDialog(tx)}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteTransaction(tx.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {transactions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-sm text-muted-foreground">
                      No matching records found in this cycle.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination buttons */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border/30 px-6 py-4">
              <span className="text-xs text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Prev
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8"
                  disabled={page === totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Add / Edit Transaction Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>{editingTransaction ? 'Edit Transaction' : 'Record Transaction'}</DialogTitle>
            <DialogDescription>
              Submit ledger records for accounts updates.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Amount (INR)</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={isPending}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Record Date</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  disabled={isPending}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Flow Type</Label>
                <Select value={txType} onValueChange={(val) => setTxType((val || 'EXPENSE') as any)} disabled={isPending}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Type">
                      {txType === 'EXPENSE' ? 'Expense' : txType === 'INCOME' ? 'Income' : txType === 'TRANSFER' ? 'Transfer' : txType === 'INVESTMENT' ? 'Investment' : txType === 'CREDIT_CARD_PAYMENT' ? 'CC Payment' : txType === 'REFUND' ? 'Refund' : txType === 'INTEREST' ? 'Interest Earned' : txType === 'DIVIDEND' ? 'Dividend Credit' : txType}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EXPENSE">Expense</SelectItem>
                    <SelectItem value="INCOME">Income</SelectItem>
                    <SelectItem value="TRANSFER">Transfer</SelectItem>
                    <SelectItem value="INVESTMENT">Investment</SelectItem>
                    <SelectItem value="CREDIT_CARD_PAYMENT">CC Payment</SelectItem>
                    <SelectItem value="REFUND">Refund</SelectItem>
                    <SelectItem value="INTEREST">Interest Earned</SelectItem>
                    <SelectItem value="DIVIDEND">Dividend Credit</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Source Account</Label>
                <Select value={accountId} onValueChange={(val) => setAccountId(val || '')} disabled={isPending}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select Account">
                      {accounts.find(a => a.id === accountId)?.name || 'Select Account'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {/* Category selector for standard transactions */}
              {txType !== 'TRANSFER' && txType !== 'CREDIT_CARD_PAYMENT' ? (
                <div className="space-y-1.5">
                  <Label className="label-uppercase text-muted-foreground">Category Category</Label>
                  <Select value={categoryId} onValueChange={(val) => setCategoryId(val || '')} disabled={isPending}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select Category">
                        {categoryId === 'NONE' || !categoryId ? 'No Category' : categories.find(c => c.id === categoryId)?.name || 'Select Category'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">No Category</SelectItem>
                      {categories
                        .filter((c) => c.type === (txType === 'INCOME' || txType === 'REFUND' || txType === 'INTEREST' || txType === 'DIVIDEND' ? 'INCOME' : 'EXPENSE'))
                        .map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                // Transfer destination selector
                <div className="space-y-1.5">
                  <Label className="label-uppercase text-muted-foreground">Destination Account</Label>
                  <Select value={transferToAccountId} onValueChange={(val) => setTransferToAccountId(val || '')} disabled={isPending}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select Destination">
                        {accounts.find(a => a.id === transferToAccountId)?.name || 'Select Destination'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {accounts
                        .filter((a) => a.id !== accountId)
                        .map((acc) => (
                          <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="label-uppercase text-muted-foreground">Ledger Title (Description)</Label>
              <Input
                placeholder="e.g. Weekly grocery shopping at Zepto"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isPending}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Merchant / Entity</Label>
                <Input
                  placeholder="e.g. Zepto"
                  value={merchant}
                  onChange={(e) => setMerchant(e.target.value)}
                  disabled={isPending}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Location (Opt)</Label>
                <Input
                  placeholder="e.g. Bangalore"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  disabled={isPending}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="label-uppercase text-muted-foreground">Private Notes</Label>
              <Textarea
                placeholder="Add receipt detail, split ratios, tags, etc..."
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
            <Button onClick={handleSaveTransaction} disabled={isPending} className="gradient-primary">
              {isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Record'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
