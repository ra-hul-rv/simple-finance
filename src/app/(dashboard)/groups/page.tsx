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
import {
  Plus,
  Search,
  FolderKanban,
  ChevronDown,
  ChevronUp,
  Users,
  Calendar,
  Loader2,
  Edit2,
  Trash2,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  CheckCircle2,
  Clock,
  XCircle,
  Receipt,
  Tag,
  DollarSign,
  Target,
  MapPin,
  StickyNote,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency, formatDate } from '@/lib/format';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';

interface CategoryBreakdown {
  name: string;
  amount: number;
  color: string;
}

interface TagTransaction {
  id: string;
  date: string;
  amount: number;
  type: string;
  description: string;
  merchant: string | null;
  notes?: string | null;
  account?: { id: string; name: string } | null;
  category: { id: string; name: string; color: string; parent: { name: string } | null } | null;
  splitCount?: number | null;
  splitType?: string | null;
}

interface TagGroup {
  id: string;
  name: string;
  color: string;
  icon: string;
  description: string | null;
  budget: number | null;
  peopleCount: number | null;
  people: string | null;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  transactionCount: number;
  totalIncome: number;
  totalExpense: number;
  netAmount: number;
  amountYouOwe?: number;
  amountYouAreOwed?: number;
  categoryBreakdown: CategoryBreakdown[];
  transactions?: TagTransaction[];
}

type SortField = 'name' | 'totalExpense' | 'createdAt' | 'transactionCount';
type SortDir = 'asc' | 'desc';

export default function GroupsPage() {
  const [tags, setTags] = useState<TagGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedData, setExpandedData] = useState<TagGroup | null>(null);
  const [expandLoading, setExpandLoading] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'>('ALL');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Dialog
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<TagGroup | null>(null);
  const [formName, setFormName] = useState('');
  const [formColor, setFormColor] = useState('#6366f1');
  const [formDescription, setFormDescription] = useState('');
  const [formBudget, setFormBudget] = useState('');
  const [formPeopleCount, setFormPeopleCount] = useState('');
  const [formPeople, setFormPeople] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formStatus, setFormStatus] = useState('ACTIVE');

  // Delete
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Split Transaction
  const [splitDialogOpen, setSplitDialogOpen] = useState(false);
  const [splittingTx, setSplittingTx] = useState<TagTransaction | null>(null);
  const [splitCountForm, setSplitCountForm] = useState('');
  const [splitTypeForm, setSplitTypeForm] = useState<'MULTIPLY' | 'DIVIDE'>('DIVIDE');

  const [isPending, startTransition] = useTransition();

  const fetchTags = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tags?details=false');
      if (res.ok) setTags(await res.json());
    } catch {
      toast.error('Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTags(); }, []);

  const handleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setExpandedData(null);
      return;
    }
    setExpandedId(id);
    setExpandLoading(true);
    try {
      const res = await fetch(`/api/tags/${id}`);
      if (res.ok) setExpandedData(await res.json());
    } catch {
      toast.error('Failed to load group details');
    } finally {
      setExpandLoading(false);
    }
  };

  // ── Form handlers ──
  const resetForm = () => {
    setFormName('');
    setFormColor('#6366f1');
    setFormDescription('');
    setFormBudget('');
    setFormPeopleCount('');
    setFormPeople('');
    setFormStartDate('');
    setFormEndDate('');
    setFormNotes('');
    setFormStatus('ACTIVE');
  };

  const handleOpenAdd = () => {
    setEditingTag(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (tag: TagGroup) => {
    setEditingTag(tag);
    setFormName(tag.name);
    setFormColor(tag.color);
    setFormDescription(tag.description || '');
    setFormBudget(tag.budget ? tag.budget.toString() : '');
    setFormPeopleCount(tag.peopleCount ? tag.peopleCount.toString() : '');
    setFormPeople(tag.people ? (() => { try { return JSON.parse(tag.people).join(', '); } catch { return tag.people; } })() : '');
    setFormStartDate(tag.startDate ? tag.startDate.split('T')[0] : '');
    setFormEndDate(tag.endDate ? tag.endDate.split('T')[0] : '');
    setFormNotes(tag.notes || '');
    setFormStatus(tag.status);
    setIsDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) { toast.error('Name is required'); return; }

    startTransition(async () => {
      try {
        const peopleArr = formPeople.trim()
          ? JSON.stringify(formPeople.split(',').map(s => s.trim()).filter(Boolean))
          : null;

        const payload: any = {
          name: formName.trim(),
          color: formColor,
          description: formDescription.trim() || null,
          budget: formBudget ? parseFloat(formBudget) : null,
          peopleCount: formPeopleCount ? parseInt(formPeopleCount) : null,
          people: peopleArr,
          startDate: formStartDate || null,
          endDate: formEndDate || null,
          notes: formNotes.trim() || null,
          status: formStatus,
        };

        const url = editingTag ? `/api/tags/${editingTag.id}` : '/api/tags';
        const method = editingTag ? 'PUT' : 'POST';

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed');
        }

        toast.success(editingTag ? 'Group updated' : 'Group created');
        setIsDialogOpen(false);
        fetchTags();
        // Refresh expanded data if we edited the expanded tag
        if (editingTag && expandedId === editingTag.id) {
          handleExpand(editingTag.id);
        }
      } catch (err: any) {
        toast.error(err.message || 'Failed to save group');
      }
    });
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/tags/${deleteId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Group deleted');
      setDeleteId(null);
      if (expandedId === deleteId) { setExpandedId(null); setExpandedData(null); }
      fetchTags();
    } catch {
      toast.error('Failed to delete group');
    }
  };

  const handleOpenSplit = (tx: TagTransaction) => {
    setSplittingTx(tx);
    setSplitCountForm(tx.splitCount ? tx.splitCount.toString() : '');
    setSplitTypeForm((tx.splitType as 'MULTIPLY' | 'DIVIDE') || 'DIVIDE');
    setSplitDialogOpen(true);
  };

  const handleSaveSplit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!splittingTx) return;
    
    startTransition(async () => {
      try {
        const payload = {
          splitCount: splitCountForm ? parseInt(splitCountForm) : null,
          splitType: splitCountForm ? splitTypeForm : null,
        };
        const res = await fetch(`/api/transactions/${splittingTx.id}/split`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error();
        
        toast.success('Transaction split updated');
        setSplitDialogOpen(false);
        // Refresh expanded data
        if (expandedId) {
          handleExpand(expandedId);
          fetchTags(); // Also refresh main list to update group totals
        }
      } catch {
        toast.error('Failed to update split');
      }
    });
  };

  // ── Filtering & sorting ──
  const filteredTags = useMemo(() => {
    let result = tags;

    if (statusFilter !== 'ALL') {
      result = result.filter(t => t.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t =>
        t.name.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q))
      );
    }

    result = [...result].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortField === 'totalExpense') cmp = a.totalExpense - b.totalExpense;
      else if (sortField === 'transactionCount') cmp = a.transactionCount - b.transactionCount;
      else cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortDir === 'desc' ? -cmp : cmp;
    });

    return result;
  }, [tags, statusFilter, searchQuery, sortField, sortDir]);

  // ── Aggregate stats ──
  const totalSpend = tags.reduce((s, t) => s + t.totalExpense, 0);
  const totalIncome = tags.reduce((s, t) => s + t.totalIncome, 0);
  const activeCount = tags.filter(t => t.status === 'ACTIVE').length;
  const allCategoryBreakdown = useMemo(() => {
    const map = new Map<string, { name: string; amount: number; color: string }>();
    tags.forEach(t => t.categoryBreakdown.forEach(cb => {
      const ex = map.get(cb.name) || { name: cb.name, amount: 0, color: cb.color };
      ex.amount += cb.amount;
      map.set(cb.name, ex);
    }));
    return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
  }, [tags]);

  const statusIcon = (s: string) => {
    if (s === 'COMPLETED') return <CheckCircle2 className="h-3 w-3" />;
    if (s === 'CANCELLED') return <XCircle className="h-3 w-3" />;
    return <Clock className="h-3 w-3" />;
  };

  const statusColor = (s: string) => {
    if (s === 'COMPLETED') return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
    if (s === 'CANCELLED') return 'bg-red-500/10 border-red-500/20 text-red-400';
    return 'bg-amber-500/10 border-amber-500/20 text-amber-400';
  };

  // ── Render ──
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Groups" description="Track group expenses for trips, events, renovations, and more">
        <Button onClick={handleOpenAdd} className="h-8 gap-1 gradient-primary text-xs font-semibold">
          <Plus className="h-3.5 w-3.5" /> New Group
        </Button>
      </PageHeader>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="glass-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Total Groups</p>
                <h3 className="text-xl font-bold mt-1 text-foreground">{tags.length}</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">{activeCount} active</p>
              </div>
              <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20 text-primary">
                <FolderKanban className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Total Spend</p>
                <h3 className="text-xl font-bold mt-1 text-red-400">{formatCurrency(totalSpend)}</h3>
              </div>
              <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
                <TrendingDown className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Total Income</p>
                <h3 className="text-xl font-bold mt-1 text-emerald-400">{formatCurrency(totalIncome)}</h3>
              </div>
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Net Position</p>
                <h3 className={`text-xl font-bold mt-1 ${totalIncome - totalSpend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatCurrency(totalIncome - totalSpend)}
                </h3>
              </div>
              <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20 text-primary">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Distribution Chart */}
      {allCategoryBreakdown.length > 0 && (
        <Card className="glass-card">
          <CardContent className="p-5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Spending by Category (All Groups)</h4>
            <div className="space-y-2.5">
              {allCategoryBreakdown.slice(0, 8).map((cb) => {
                const pct = totalSpend > 0 ? (cb.amount / totalSpend) * 100 : 0;
                return (
                  <div key={cb.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground">{cb.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{pct.toFixed(0)}%</span>
                        <span className="font-bold text-foreground">{formatCurrency(cb.amount)}</span>
                      </div>
                    </div>
                    <div className="h-2 w-full bg-muted/60 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.max(3, pct)}%`, backgroundColor: cb.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search groups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
          <SelectTrigger className="w-[130px] h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="glass-select">
            <SelectItem value="ALL" className="text-xs">All Status</SelectItem>
            <SelectItem value="ACTIVE" className="text-xs">Active</SelectItem>
            <SelectItem value="COMPLETED" className="text-xs">Completed</SelectItem>
            <SelectItem value="CANCELLED" className="text-xs">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortField} onValueChange={(v: any) => setSortField(v)}>
          <SelectTrigger className="w-[150px] h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="glass-select">
            <SelectItem value="createdAt" className="text-xs">Date Created</SelectItem>
            <SelectItem value="name" className="text-xs">Name</SelectItem>
            <SelectItem value="totalExpense" className="text-xs">Total Spent</SelectItem>
            <SelectItem value="transactionCount" className="text-xs">Transactions</SelectItem>
          </SelectContent>
        </Select>

        <Button
          size="icon"
          variant="outline"
          className="h-9 w-9"
          onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
        >
          <ArrowUpDown className="h-4 w-4" />
        </Button>
      </div>

      {/* Group Cards */}
      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredTags.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <div className="p-5 rounded-2xl bg-primary/10 mb-4">
              <FolderKanban className="h-10 w-10 text-primary" />
            </div>
            <p className="text-lg font-bold text-foreground mb-1">
              {tags.length === 0 ? 'No groups yet' : 'No matching groups'}
            </p>
            <p className="text-sm text-muted-foreground max-w-sm mb-6">
              {tags.length === 0
                ? 'Create a group to track expenses for trips, events, or projects. Tag your transactions to see them here.'
                : 'Try adjusting your search or filters.'}
            </p>
            {tags.length === 0 && (
              <Button onClick={handleOpenAdd} className="gap-1 gradient-primary text-xs font-semibold">
                <Plus className="h-3.5 w-3.5" /> Create Your First Group
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredTags.map((tag) => {
            const isExpanded = expandedId === tag.id;
            const budgetPct = tag.budget && tag.budget > 0 ? Math.min(100, (tag.totalExpense / tag.budget) * 100) : null;
            let peopleParsed: string[] = [];
            try { if (tag.people) peopleParsed = JSON.parse(tag.people); } catch {}

            return (
              <Card key={tag.id} className={`glass-card hover-border relative overflow-hidden group ${isExpanded ? 'ring-1 ring-primary/30' : ''}`}>
                <CardContent className="p-0">
                  {/* Main row */}
                  <div
                    className="p-5 cursor-pointer flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                    onClick={() => handleExpand(tag.id)}
                  >
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="h-3.5 w-3.5 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
                        <h4 className="font-bold text-foreground text-base">{tag.name}</h4>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border flex items-center gap-1 ${statusColor(tag.status)}`}>
                          {statusIcon(tag.status)} {tag.status}
                        </span>
                        {tag.transactionCount > 0 && (
                          <span className="text-[10px] font-semibold bg-muted px-2 py-0.5 rounded text-muted-foreground">
                            {tag.transactionCount} txns
                          </span>
                        )}
                      </div>
                      {tag.description && <p className="text-xs text-muted-foreground line-clamp-1">{tag.description}</p>}
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
                        {(tag.startDate || tag.endDate) && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {tag.startDate ? formatDate(tag.startDate) : '?'} — {tag.endDate ? formatDate(tag.endDate) : 'Ongoing'}
                          </span>
                        )}
                        {tag.peopleCount && (
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {tag.peopleCount} people
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Budget progress */}
                    {budgetPct !== null && (
                      <div className="flex-1 max-w-[200px] space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-semibold">
                          <span className="text-muted-foreground">Budget</span>
                          <span className={budgetPct > 90 ? 'text-red-400' : 'text-foreground'}>{budgetPct.toFixed(0)}%</span>
                        </div>
                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${budgetPct > 90 ? 'bg-red-500' : budgetPct > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                            style={{ width: `${budgetPct}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                          <span>{formatCurrency(tag.totalExpense)}</span>
                          <span>{formatCurrency(tag.budget!)}</span>
                        </div>
                      </div>
                    )}

                    {/* Amounts + actions */}
                    <div className="flex items-center gap-4 justify-between lg:justify-end shrink-0">
                      <div className="text-right">
                        <p className="text-[10px] uppercase font-semibold text-muted-foreground">Total Spent</p>
                        <p className="text-lg font-bold text-red-400 mt-0.5">{formatCurrency(tag.totalExpense)}</p>
                        {tag.totalIncome > 0 && (
                          <p className="text-[10px] text-emerald-400 font-semibold">+{formatCurrency(tag.totalIncome)} recovered</p>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <Button size="icon" variant="outline" className="h-8 w-8 hover:bg-amber-500/10 hover:text-amber-400" onClick={() => handleOpenEdit(tag)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="outline" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => setDeleteId(tag.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* ── Expanded Section ── */}
                  {isExpanded && (
                    <div className="border-t border-border/40 bg-muted/10">
                      {expandLoading ? (
                        <div className="flex items-center justify-center py-12">
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                      ) : expandedData ? (
                        <div className="p-5 space-y-6">
                          {/* Details Row */}
                          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            {expandedData.description && (
                              <div className="space-y-1">
                                <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1"><StickyNote className="h-3 w-3" /> Description</p>
                                <p className="text-xs text-foreground">{expandedData.description}</p>
                              </div>
                            )}
                            {expandedData.budget && (
                              <div className="space-y-1">
                                <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1"><Target className="h-3 w-3" /> Budget</p>
                                <p className="text-sm font-bold text-foreground">{formatCurrency(expandedData.budget)}</p>
                                <p className="text-[10px] text-muted-foreground">
                                  {expandedData.totalExpense <= expandedData.budget
                                    ? `${formatCurrency(expandedData.budget - expandedData.totalExpense)} remaining`
                                    : `${formatCurrency(expandedData.totalExpense - expandedData.budget)} over budget`}
                                </p>
                              </div>
                            )}
                            {peopleParsed.length > 0 && (
                              <div className="space-y-1">
                                <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" /> People</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {peopleParsed.map((p, i) => (
                                    <span key={i} className="text-[10px] font-semibold bg-muted/80 border border-border/30 px-2 py-0.5 rounded">{p}</span>
                                  ))}
                                </div>
                                {expandedData.peopleCount && expandedData.totalExpense > 0 && (
                                  <p className="text-[10px] text-muted-foreground mt-1">
                                    Per person: ~{formatCurrency(expandedData.totalExpense / expandedData.peopleCount)}
                                  </p>
                                )}
                              </div>
                            )}
                            {expandedData.notes && (
                              <div className="space-y-1">
                                <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> Notes</p>
                                <p className="text-xs text-foreground whitespace-pre-wrap">{expandedData.notes}</p>
                              </div>
                            )}
                          </div>

                          {/* Category Breakdown + Summary */}
                          <div className="grid gap-4 md:grid-cols-2">
                            {/* Category bars */}
                            {expandedData.categoryBreakdown.length > 0 && (
                              <Card className="glass-card">
                                <CardContent className="p-4">
                                  <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Category Breakdown</h5>
                                  <div className="space-y-2.5">
                                    {expandedData.categoryBreakdown.map((cb) => {
                                      const pct = expandedData.totalExpense > 0 ? (cb.amount / expandedData.totalExpense) * 100 : 0;
                                      return (
                                        <div key={cb.name} className="space-y-1">
                                          <div className="flex items-center justify-between text-xs">
                                            <span className="font-semibold text-foreground">{cb.name}</span>
                                            <span className="font-bold text-foreground">{formatCurrency(cb.amount)}</span>
                                          </div>
                                          <div className="h-1.5 w-full bg-muted/60 rounded-full overflow-hidden">
                                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(3, pct)}%`, backgroundColor: cb.color }} />
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </CardContent>
                              </Card>
                            )}

                            {/* Financial Summary */}
                            <Card className="glass-card">
                              <CardContent className="p-4">
                                <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Financial Summary</h5>
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-muted-foreground">Total Expense</span>
                                    <span className="text-sm font-bold text-red-400">{formatCurrency(expandedData.totalExpense)}</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-muted-foreground">Total Income / Splits Received</span>
                                    <span className="text-sm font-bold text-emerald-400">{formatCurrency(expandedData.totalIncome)}</span>
                                  </div>
                                  <div className="border-t border-border/30 pt-2 flex items-center justify-between">
                                    <span className="text-xs font-semibold text-foreground">Net Cost</span>
                                    <span className={`text-sm font-bold ${expandedData.netAmount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                      {formatCurrency(Math.abs(expandedData.netAmount))}
                                    </span>
                                  </div>
                                  {(expandedData.amountYouOwe ?? 0) > 0 && (
                                    <div className="flex items-center justify-between bg-red-500/10 p-2 rounded border border-red-500/20">
                                      <span className="text-xs text-red-500 font-semibold">You Owe (Multiply Splits)</span>
                                      <span className="text-sm font-bold text-red-500">{formatCurrency(expandedData.amountYouOwe!)}</span>
                                    </div>
                                  )}
                                  {(expandedData.amountYouAreOwed ?? 0) > 0 && (
                                    <div className="flex items-center justify-between bg-emerald-500/10 p-2 rounded border border-emerald-500/20">
                                      <span className="text-xs text-emerald-500 font-semibold">You Are Owed (Divide Splits)</span>
                                      <span className="text-sm font-bold text-emerald-500">{formatCurrency(expandedData.amountYouAreOwed!)}</span>
                                    </div>
                                  )}
                                  {expandedData.peopleCount && expandedData.peopleCount > 0 && (
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs text-muted-foreground">Per Person Share</span>
                                      <span className="text-sm font-bold text-foreground">{formatCurrency(expandedData.totalExpense / expandedData.peopleCount)}</span>
                                    </div>
                                  )}
                                  {expandedData.budget && (
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs text-muted-foreground">Budget Remaining</span>
                                      <span className={`text-sm font-bold ${expandedData.budget - expandedData.totalExpense >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {formatCurrency(expandedData.budget - expandedData.totalExpense)}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          </div>

                          {/* Transaction List */}
                          {expandedData.transactions && expandedData.transactions.length > 0 ? (
                            <div>
                              <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                                <Receipt className="h-4 w-4" />
                                Transactions ({expandedData.transactions.length})
                              </h5>
                              <div className="glass-card rounded-xl overflow-hidden border border-border/20">
                                <Table>
                                  <TableHeader className="bg-background/50">
                                    <TableRow>
                                      <TableHead className="text-xs font-semibold py-2">Date</TableHead>
                                      <TableHead className="text-xs font-semibold py-2">Description</TableHead>
                                      <TableHead className="text-xs font-semibold py-2">Category</TableHead>
                                      <TableHead className="text-xs font-semibold py-2">Type</TableHead>
                                      <TableHead className="text-xs font-semibold text-right py-2">Amount</TableHead>
                                      <TableHead className="text-xs font-semibold py-2 w-10"></TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {expandedData.transactions.map((tx) => (
                                      <TableRow key={tx.id} className="hover:bg-muted/40">
                                        <TableCell className="py-2 text-xs font-medium">{formatDate(tx.date)}</TableCell>
                                        <TableCell className="py-2 text-xs">
                                          {tx.description}
                                          {tx.merchant && <span className="text-muted-foreground ml-1">· {tx.merchant}</span>}
                                        </TableCell>
                                        <TableCell className="py-2 text-xs">
                                          {tx.category ? (
                                            <span className="flex items-center gap-1.5">
                                              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tx.category.color }} />
                                              {tx.category.parent ? `${tx.category.parent.name} > ` : ''}{tx.category.name}
                                            </span>
                                          ) : (
                                            <span className="text-muted-foreground">—</span>
                                          )}
                                        </TableCell>
                                        <TableCell className="py-2 text-xs">
                                          <span className={`px-2 py-0.5 rounded font-semibold ${tx.type === 'INCOME' || tx.type === 'REFUND' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                            {tx.type}
                                          </span>
                                        </TableCell>
                                        <TableCell className={`py-2 text-xs font-bold text-right ${tx.type === 'INCOME' || tx.type === 'REFUND' ? 'text-emerald-400' : 'text-red-400'}`}>
                                          {tx.splitCount ? (
                                            <div className="flex flex-col items-end">
                                              <span className="text-[10px] text-muted-foreground font-normal line-through mb-0.5">
                                                {tx.type === 'INCOME' || tx.type === 'REFUND' ? '+' : '-'}{formatCurrency(tx.amount)}
                                              </span>
                                              <span>
                                                {tx.type === 'INCOME' || tx.type === 'REFUND' ? '+' : '-'}
                                                {formatCurrency(tx.splitType === 'MULTIPLY' ? tx.amount * tx.splitCount : tx.amount)}
                                              </span>
                                              <span className="text-[9px] font-normal text-muted-foreground">
                                                (Split {tx.splitType === 'MULTIPLY' ? '*' : '/'} {tx.splitCount})
                                              </span>
                                            </div>
                                          ) : (
                                            <>
                                              {tx.type === 'INCOME' || tx.type === 'REFUND' ? '+' : '-'}{formatCurrency(tx.amount)}
                                            </>
                                          )}
                                        </TableCell>
                                        <TableCell className="py-2 text-right">
                                          <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => handleOpenSplit(tx)}>
                                            <Edit2 className="h-3 w-3" />
                                          </Button>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-8 glass-card rounded-xl">
                              <Receipt className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
                              <p className="text-xs text-muted-foreground">No transactions tagged to this group yet.</p>
                              <p className="text-[10px] text-muted-foreground mt-1">Tag transactions with &quot;{expandedData.name}&quot; from the Transactions page.</p>
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Create/Edit Dialog ── */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="form-spacious glass-dialog sm:max-w-[500px] lg:max-w-[600px] lg:p-8 max-h-[85vh] overflow-y-auto">
          <form onSubmit={handleSave} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-foreground">
                {editingTag ? 'Edit Group' : 'Create New Group'}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Track a group of related expenses. Most fields are optional.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Name + Color */}
              <div className="grid grid-cols-[1fr_auto] gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Name *</Label>
                  <Input placeholder="e.g. Munnar Trip" value={formName} onChange={(e) => setFormName(e.target.value)} className="h-9 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Color</Label>
                  <div className="flex items-center gap-1.5">
                    <input type="color" value={formColor} onChange={(e) => setFormColor(e.target.value)} className="w-[42px] h-9 p-0.5 border rounded-lg cursor-pointer border-border/40" />
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <Label className="text-xs">Description</Label>
                <Input placeholder="e.g. Family trip to Munnar - 3 nights" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} className="h-9 text-xs" />
              </div>

              {/* Budget + People Count */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Budget (optional)</Label>
                  <Input type="number" step="0.01" placeholder="e.g. 25000" value={formBudget} onChange={(e) => setFormBudget(e.target.value)} className="h-9 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Number of People</Label>
                  <Input type="number" min="1" placeholder="e.g. 4" value={formPeopleCount} onChange={(e) => setFormPeopleCount(e.target.value)} className="h-9 text-xs" />
                </div>
              </div>

              {/* People Names */}
              <div className="space-y-1">
                <Label className="text-xs">People Names (comma-separated)</Label>
                <Input placeholder="e.g. Rahul, Arun, Priya, Deepa" value={formPeople} onChange={(e) => setFormPeople(e.target.value)} className="h-9 text-xs" />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Start Date</Label>
                  <Input type="date" value={formStartDate} onChange={(e) => setFormStartDate(e.target.value)} className="h-9 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">End Date</Label>
                  <Input type="date" value={formEndDate} onChange={(e) => setFormEndDate(e.target.value)} className="h-9 text-xs" />
                </div>
              </div>

              {/* Status */}
              <div className="space-y-1">
                <Label className="text-xs">Status</Label>
                <Select value={formStatus} onValueChange={setFormStatus}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-select">
                    <SelectItem value="ACTIVE" className="text-xs">Active</SelectItem>
                    <SelectItem value="COMPLETED" className="text-xs">Completed</SelectItem>
                    <SelectItem value="CANCELLED" className="text-xs">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <Label className="text-xs">Notes</Label>
                <Textarea placeholder="Any additional details..." value={formNotes} onChange={(e) => setFormNotes(e.target.value)} className="min-h-[60px] text-xs resize-none" />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="h-9 text-xs">Cancel</Button>
              <Button type="submit" disabled={isPending} className="h-9 text-xs gradient-primary font-semibold">
                {isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                {editingTag ? 'Save Changes' : 'Create Group'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Split Transaction Dialog ── */}
      <Dialog open={splitDialogOpen} onOpenChange={setSplitDialogOpen}>
        <DialogContent className="form-spacious glass-dialog sm:max-w-[400px]">
          <form onSubmit={handleSaveSplit} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-foreground">Configure Split</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Set how this transaction is split among the group.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Number of People</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="e.g. 3 (leave blank for no split)"
                  value={splitCountForm}
                  onChange={(e) => setSplitCountForm(e.target.value)}
                  className="h-10 px-3 rounded-xl border-border/40 bg-background/20 font-mono text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Split Logic</Label>
                <Select value={splitTypeForm} onValueChange={(val: any) => setSplitTypeForm(val)}>
                  <SelectTrigger className="bg-background/20 border-border/40 h-10 rounded-xl text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DIVIDE" className="text-xs text-emerald-500 font-semibold">Divide (They owe me money)</SelectItem>
                    <SelectItem value="MULTIPLY" className="text-xs text-red-500 font-semibold">Multiply (I owe them money)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSplitDialogOpen(false)} className="h-9 text-xs">
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} className="h-9 text-xs gradient-primary">
                {isPending ? 'Saving...' : 'Save Split'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Group"
        description="This will delete the tag and remove it from all associated transactions. The transactions themselves won't be deleted."
      />
    </div>
  );
}
