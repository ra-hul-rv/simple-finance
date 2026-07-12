'use client';

import { useEffect, useState, useTransition } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { CategorySelector } from '@/components/shared/category-selector';
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
import { FileUpload } from '@/components/shared/file-upload';
import { ImageLightbox } from '@/components/shared/image-lightbox';
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
  Eye,
  EyeOff,
  Image as ImageIcon,
  FileText,
  X,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency, formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

interface Attachment {
  id: string;
  fileName: string;
  fileType: string;
  filePath: string;
  fileSize: number;
}

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
  attachments?: Attachment[];
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
  
  // Advanced filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Global attachments show/hide toggle
  const [showAttachmentsOnList, setShowAttachmentsOnList] = useState(true);

  // Lightbox state
  const [lightboxSrc, setLightboxSrc] = useState('');
  const [lightboxIsPdf, setLightboxIsPdf] = useState(false);
  const [lightboxIsOpen, setLightboxIsOpen] = useState(false);

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
  
  // File Upload states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [existingAttachmentUrl, setExistingAttachmentUrl] = useState('');
  const [existingAttachmentId, setExistingAttachmentId] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      let url = `/api/transactions?page=${page}&limit=15`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (typeFilter !== 'ALL') url += `&type=${typeFilter}`;
      if (accountFilter !== 'ALL') url += `&accountId=${accountFilter}`;
      if (categoryFilter !== 'ALL') url += `&categoryId=${categoryFilter}`;
      if (startDate) url += `&startDate=${startDate}`;
      if (endDate) url += `&endDate=${endDate}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to load transactions');
      const data = await res.json();

      let filtered = data.transactions;

      // Client side amount filtering
      if (minAmount) {
        filtered = filtered.filter((tx: Transaction) => tx.amount >= parseFloat(minAmount));
      }
      if (maxAmount) {
        filtered = filtered.filter((tx: Transaction) => tx.amount <= parseFloat(maxAmount));
      }

      setTransactions(filtered);
      setTotalPages(data.pagination.totalPages);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load transactions ledger');
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
        setSelectedFile(null);
        setExistingAttachmentUrl('');
        setExistingAttachmentId('');
        setIsDialogOpen(true);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [accounts]);

  useEffect(() => {
    fetchTransactions();
  }, [page, search, typeFilter, accountFilter, categoryFilter, startDate, endDate, minAmount, maxAmount]);

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
    setSelectedFile(null);
    setExistingAttachmentUrl('');
    setExistingAttachmentId('');
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

    setSelectedFile(null);
    if (tx.attachments && tx.attachments.length > 0) {
      const first = tx.attachments[0];
      setExistingAttachmentUrl(first.filePath);
      setExistingAttachmentId(first.id);
    } else {
      setExistingAttachmentUrl('');
      setExistingAttachmentId('');
    }

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

        const savedTx = await res.json();

        // Handle attachment file upload if selected
        if (selectedFile) {
          setIsUploading(true);
          const formData = new FormData();
          formData.append('file', selectedFile);

          const uploadUrl = `/api/transactions/${savedTx.id}/attachments`;
          const uploadRes = await fetch(uploadUrl, {
            method: 'POST',
            body: formData,
          });

          if (!uploadRes.ok) {
            const uploadErr = await uploadRes.json();
            toast.error(uploadErr.error || 'Failed to upload attachment file');
          } else {
            toast.success('Attachment uploaded successfully');
          }
        } else if (!existingAttachmentUrl && existingAttachmentId && editingTransaction) {
          // User removed the existing attachment
          const deleteUrl = `/api/transactions/${editingTransaction.id}/attachments?attachmentId=${existingAttachmentId}`;
          await fetch(deleteUrl, { method: 'DELETE' });
        }

        toast.success(editingTransaction ? 'Ledger record updated' : 'Ledger record added');
        setIsDialogOpen(false);
        setPage(1);
        fetchTransactions();
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || 'Failed to write transaction');
      } finally {
        setIsUploading(false);
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
      toast.success('Transaction record deleted');
      fetchTransactions();
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete transaction');
    }
  };

  const handleOpenLightbox = (path: string, type: string) => {
    setLightboxSrc(path);
    setLightboxIsPdf(type.includes('pdf'));
    setLightboxIsOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <PageHeader title="Transactions Ledger" description="Detailed statement entries and double-entry transaction record list">
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowAttachmentsOnList(!showAttachmentsOnList)} 
            className="h-9 px-3 rounded-xl border-border/40 text-xs font-semibold gap-1.5"
          >
            {showAttachmentsOnList ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showAttachmentsOnList ? 'Hide Receipts' : 'Show Receipts'}
          </Button>
          <Button onClick={handleOpenAddDialog} className="h-9 gap-1.5 px-4 rounded-xl gradient-primary text-white font-semibold shadow-md">
            <Plus className="h-4 w-4" />
            Add Transaction
          </Button>
        </div>
      </PageHeader>

      {/* Spacious Toolbar filters */}
      <Card className="glass border-border/40 p-5 rounded-xl">
        <div className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-grow max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search ledger by description, notes, merchant..."
                className="pl-10 bg-background/30 h-11 border-border/40 rounded-xl text-sm"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center">
              {/* Type */}
              <Select value={typeFilter} onValueChange={(val) => { setTypeFilter(val || 'ALL'); setPage(1); }}>
                <SelectTrigger className="h-11 min-w-[130px] bg-background/30 border-border/40 rounded-xl text-sm">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Types</SelectItem>
                  <SelectItem value="INCOME">Income</SelectItem>
                  <SelectItem value="EXPENSE">Expense</SelectItem>
                  <SelectItem value="TRANSFER">Transfer</SelectItem>
                  <SelectItem value="INVESTMENT">Investment</SelectItem>
                  <SelectItem value="CREDIT_CARD_PAYMENT">CC Payment</SelectItem>
                  <SelectItem value="REFUND">Refund</SelectItem>
                  <SelectItem value="INTEREST">Interest</SelectItem>
                  <SelectItem value="DIVIDEND">Dividend</SelectItem>
                </SelectContent>
              </Select>

              {/* Account */}
              <Select value={accountFilter} onValueChange={(val) => { setAccountFilter(val || 'ALL'); setPage(1); }}>
                <SelectTrigger className="h-11 min-w-[150px] bg-background/30 border-border/40 rounded-xl text-sm">
                  <SelectValue placeholder="Account" />
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
                <SelectTrigger className="h-11 min-w-[150px] bg-background/30 border-border/40 rounded-xl text-sm">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="ghost"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={cn("h-11 text-xs font-semibold rounded-xl border border-border/40", showAdvancedFilters && "bg-primary/10 text-primary border-primary/20")}
              >
                <Filter className="h-3.5 w-3.5 mr-1" />
                Filters
              </Button>
            </div>
          </div>

          {/* Advanced filter panels */}
          {showAdvancedFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 border border-border/30 rounded-xl bg-background/20 animate-fade-up">
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground text-[10px]">Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-10 bg-background/20 border-border/40 rounded-xl text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground text-[10px]">End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-10 bg-background/20 border-border/40 rounded-xl text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground text-[10px]">Min Amount (₹)</Label>
                <Input
                  type="number"
                  placeholder="Min"
                  value={minAmount}
                  onChange={(e) => setMinAmount(e.target.value)}
                  className="h-10 bg-background/20 border-border/40 rounded-xl text-xs font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground text-[10px]">Max Amount (₹)</Label>
                <Input
                  type="number"
                  placeholder="Max"
                  value={maxAmount}
                  onChange={(e) => setMaxAmount(e.target.value)}
                  className="h-10 bg-background/20 border-border/40 rounded-xl text-xs font-mono"
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-4 flex justify-end gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSearch('');
                    setTypeFilter('ALL');
                    setAccountFilter('ALL');
                    setCategoryFilter('ALL');
                    setStartDate('');
                    setEndDate('');
                    setMinAmount('');
                    setMaxAmount('');
                    setPage(1);
                  }}
                  className="rounded-xl h-9"
                >
                  Clear All Filters
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Ledger Table */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <Card className="glass overflow-hidden border-border/40 rounded-xl shadow-md">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/40 hover:bg-transparent">
                  <TableHead className="label-uppercase text-[10px] pl-6 h-12">Date</TableHead>
                  <TableHead className="label-uppercase text-[10px] h-12">Description</TableHead>
                  <TableHead className="label-uppercase text-[10px] h-12">Ledger Source</TableHead>
                  <TableHead className="label-uppercase text-[10px] h-12">Location</TableHead>
                  <TableHead className="label-uppercase text-[10px] h-12">Category</TableHead>
                  {showAttachmentsOnList && <TableHead className="label-uppercase text-[10px] h-12">Receipt</TableHead>}
                  <TableHead className="text-right label-uppercase text-[10px] pr-6 h-12">Amount</TableHead>
                  <TableHead className="w-[100px] h-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id} className="border-border/20 hover:bg-accent/15 transition-colors">
                    <TableCell className="text-xs text-muted-foreground pl-6 font-medium">
                      {formatDate(tx.date, 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-sm text-foreground">{tx.description}</div>
                      {tx.merchant && (
                        <div className="text-[10px] text-muted-foreground mt-0.5 font-medium">{tx.merchant}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs font-semibold">
                      {tx.type === 'TRANSFER' || tx.type === 'CREDIT_CARD_PAYMENT' ? (
                        <span className="flex items-center gap-1.5">
                          <span className="truncate">{tx.account.name}</span>
                          <ArrowLeftRight className="h-3 w-3 text-muted-foreground inline shrink-0" />
                          <span className="truncate text-primary">{tx.transferToAccount?.name || 'External'}</span>
                        </span>
                      ) : (
                        tx.account.name
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground italic font-medium">
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
                          {tx.type.replace('_', ' ')}
                        </span>
                      )}
                    </TableCell>
                    {showAttachmentsOnList && (
                      <TableCell>
                        {tx.attachments && tx.attachments.length > 0 ? (
                          <div className="flex items-center gap-1.5">
                            {tx.attachments.map((att) => {
                              const isImage = att.fileType.startsWith('image/');
                              return (
                                <button
                                  key={att.id}
                                  onClick={() => handleOpenLightbox(att.filePath, att.fileType)}
                                  className="h-8 w-8 rounded-lg overflow-hidden border border-border/30 hover:border-primary/50 transition-colors flex items-center justify-center bg-background/40 hover:bg-background/80 shrink-0 cursor-pointer"
                                  title={att.fileName}
                                >
                                  {isImage ? (
                                    <img
                                      src={att.filePath}
                                      alt={att.fileName}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <FileText className="h-3.5 w-3.5 text-primary" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground/40 font-medium">—</span>
                        )}
                      </TableCell>
                    )}
                    <TableCell className={cn(
                      "text-right font-bold tabular-nums text-sm pr-6",
                      ['INCOME', 'REFUND', 'INTEREST', 'DIVIDEND'].includes(tx.type)
                        ? 'text-success'
                        : 'text-foreground'
                    )}>
                      {['INCOME', 'REFUND', 'INTEREST', 'DIVIDEND'].includes(tx.type) ? '+' : '-'}
                      {formatCurrency(tx.amount, 'INR')}
                    </TableCell>
                    <TableCell className="pr-6">
                      <div className="flex items-center gap-1 justify-end">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 rounded-lg hover:bg-accent"
                          onClick={() => handleOpenEditDialog(tx)}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
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
                    <TableCell colSpan={showAttachmentsOnList ? 8 : 7} className="text-center py-16 text-sm text-muted-foreground border-0">
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
              <span className="text-xs text-muted-foreground font-semibold">
                Page {page} of {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 rounded-xl"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Prev
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 rounded-xl"
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

      {/* Add / Edit Transaction Dialog - Spacious and Premium */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="form-spacious sm:max-w-[500px] lg:max-w-[620px] max-h-[90vh] lg:max-h-[92vh] overflow-y-auto scrollbar-thin lg:p-8">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold tracking-tight">
              {editingTransaction ? 'Edit Transaction Details' : 'Record Transaction Entry'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Submit double-entry transaction values to update assets or credit accounts.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4.5 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Amount (₹)</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={isPending}
                  className="h-11 px-4 rounded-xl border-border/40 bg-background/20 font-mono text-base"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Transaction Date</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  disabled={isPending}
                  className="h-11 px-4 rounded-xl border-border/40 bg-background/20"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Flow Type</Label>
                <Select value={txType} onValueChange={(val) => setTxType((val || 'EXPENSE') as any)} disabled={isPending}>
                  <SelectTrigger className="bg-background/20 border-border/40 h-11 rounded-xl text-sm">
                    <SelectValue placeholder="Type">
                      {txType === 'EXPENSE' ? 'Expense' : txType === 'INCOME' ? 'Income' : txType === 'TRANSFER' ? 'Transfer Fund' : txType === 'INVESTMENT' ? 'Investment' : txType === 'CREDIT_CARD_PAYMENT' ? 'Credit Card Pay' : txType === 'REFUND' ? 'Refund' : txType === 'INTEREST' ? 'Interest Earned' : 'Dividend Credit'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EXPENSE">Expense</SelectItem>
                    <SelectItem value="INCOME">Income</SelectItem>
                    <SelectItem value="TRANSFER">Transfer Fund</SelectItem>
                    <SelectItem value="INVESTMENT">Investment</SelectItem>
                    <SelectItem value="CREDIT_CARD_PAYMENT">Credit Card Pay</SelectItem>
                    <SelectItem value="REFUND">Refund</SelectItem>
                    <SelectItem value="INTEREST">Interest Earned</SelectItem>
                    <SelectItem value="DIVIDEND">Dividend Credit</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Ledger Account</Label>
                <Select value={accountId} onValueChange={(val) => setAccountId(val || '')} disabled={isPending}>
                  <SelectTrigger className="bg-background/20 border-border/40 h-11 rounded-xl text-sm">
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

            <div className="grid grid-cols-1">
              {txType !== 'TRANSFER' && txType !== 'CREDIT_CARD_PAYMENT' ? (
                <CategorySelector
                  categories={categories as any}
                  value={categoryId}
                  onChange={setCategoryId}
                  typeFilter={['INCOME', 'REFUND', 'INTEREST', 'DIVIDEND'].includes(txType) ? 'INCOME' : 'EXPENSE'}
                  disabled={isPending}
                />
              ) : (
                <div className="space-y-1.5">
                  <Label className="label-uppercase text-muted-foreground">Destination Account</Label>
                  <Select value={transferToAccountId} onValueChange={(val) => setTransferToAccountId(val || '')} disabled={isPending}>
                    <SelectTrigger className="bg-background/20 border-border/40 h-11 rounded-xl text-sm">
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
              <Label className="label-uppercase text-muted-foreground">Title (Description)</Label>
              <Input
                placeholder="e.g. Shopping details or transfer note"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isPending}
                className="h-11 px-4 rounded-xl border-border/40 bg-background/20"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Merchant / Store</Label>
                <Input
                  placeholder="e.g. Zepto"
                  value={merchant}
                  onChange={(e) => setMerchant(e.target.value)}
                  disabled={isPending}
                  className="h-11 px-4 rounded-xl border-border/40 bg-background/20"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Location (Opt)</Label>
                <Input
                  placeholder="e.g. Bangalore"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  disabled={isPending}
                  className="h-11 px-4 rounded-xl border-border/40 bg-background/20"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="label-uppercase text-muted-foreground">Private Notes</Label>
              <Textarea
                placeholder="Add split ratios, tags, warranty details, etc..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isPending}
                className="bg-background/20 border-border/40 min-h-[60px] rounded-xl px-4 py-2"
              />
            </div>

            {/* Receipt upload - spacious and visual */}
            <div className="space-y-2 border-t border-border/30 pt-4">
              <Label className="label-uppercase text-muted-foreground flex items-center gap-1.5">
                <ImageIcon className="h-4 w-4" /> Transaction Attachment (Receipt / PDF)
              </Label>
              <FileUpload
                onFileSelect={(file) => setSelectedFile(file)}
                onRemove={() => { setSelectedFile(null); setExistingAttachmentUrl(''); }}
                selectedFile={selectedFile}
                existingUrl={existingAttachmentUrl}
                disabled={isPending || isUploading}
              />
            </div>
          </div>
          <DialogFooter className="gap-3 pt-3 border-t border-border/30">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isPending || isUploading} className="rounded-xl h-11">
              Cancel
            </Button>
            <Button onClick={handleSaveTransaction} disabled={isPending || isUploading} className="gradient-primary text-white font-semibold rounded-xl h-11 px-6 shadow-md">
              {isPending || isUploading ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Saving record...
                </>
              ) : (
                'Save Transaction'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lightbox / PDF Viewer modal */}
      <ImageLightbox
        src={lightboxSrc}
        isOpen={lightboxIsOpen}
        onClose={() => setLightboxIsOpen(false)}
        isPdf={lightboxIsPdf}
      />
    </div>
  );
}
