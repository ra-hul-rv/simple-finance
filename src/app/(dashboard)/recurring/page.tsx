'use client';

import { useEffect, useState, useTransition } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { CategorySelector } from '@/components/shared/category-selector';
import { StatCard } from '@/components/shared/stat-card';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { Badge } from '@/components/ui/badge';
import {
  Repeat,
  Calendar,
  Plus,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Edit2,
  Trash2,
  Tv,
  LinkIcon,
  Search,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency, formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from 'recharts';

interface Account {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
  type: string;
}

interface UnifiedItem {
  id: string;
  source: 'subscription' | 'recurring';
  name: string;
  amount: number; // Displays the user's entered original amount
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'SEMI_ANNUALLY' | 'YEARLY';
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'INVESTMENT';
  status: 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'EXPIRED';
  nextDate: string;
  startDate: string;
  endDate?: string | null;
  accountId?: string | null;
  accountName?: string;
  categoryId?: string | null;
  categoryName?: string;
  description?: string | null; // serves as notes
  url?: string | null;
  color?: string | null;
}

export default function BillsAndRecurringPage() {
  const [items, setItems] = useState<UnifiedItem[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showCharts, setShowCharts] = useState(true);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSource, setFilterSource] = useState<'ALL' | 'SUBSCRIPTION' | 'RECURRING'>('ALL');
  const [filterType, setFilterType] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [filterFrequency, setFilterFrequency] = useState<'ALL' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'SEMI_ANNUALLY' | 'YEARLY'>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'EXPIRED'>('ALL');

  // Dialog forms
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<UnifiedItem | null>(null);
  const [isPending, startTransition] = useTransition();

  // Form states
  const [formSource, setFormSource] = useState<'subscription' | 'recurring'>('subscription');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'SEMI_ANNUALLY' | 'YEARLY'>('MONTHLY');
  const [type, setType] = useState<'INCOME' | 'EXPENSE' | 'TRANSFER' | 'INVESTMENT'>('EXPENSE');
  const [status, setStatus] = useState<'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'EXPIRED'>('ACTIVE');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState(''); // notes
  const [url, setUrl] = useState('');
  const [color, setColor] = useState('#6366f1');

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch settings to check chart toggle
      const settingsRes = await fetch('/api/settings');
      if (settingsRes.ok) {
        const settings = await settingsRes.json();
        setShowCharts(settings.showBillsCharts ?? true);
      }

      // Fetch accounts & categories
      const accRes = await fetch('/api/accounts');
      const accData = await accRes.json();
      setAccounts(accData);

      const catRes = await fetch('/api/categories');
      const catData = await catRes.json();
      setCategories(catData);

      // Fetch recurring rules
      const recRes = await fetch('/api/recurring');
      const recData = await recRes.json();

      // Fetch subscriptions
      const subRes = await fetch('/api/subscriptions');
      const subData = await subRes.json();

      // Normalize recurring items (with metadata fallback)
      const normalizedRecurring = recData.map((r: any) => {
        let notes = r.description || '';
        let color = '#6366f1';
        let url = '';
        if (r.description && r.description.startsWith('{')) {
          try {
            const parsed = JSON.parse(r.description);
            notes = parsed.notes || '';
            color = parsed.color || '#6366f1';
            url = parsed.url || '';
          } catch (e) {}
        }
        return {
          id: r.id,
          source: 'recurring' as const,
          name: r.name,
          amount: Number(r.amount),
          frequency: r.frequency,
          type: r.type,
          status: r.isActive ? 'ACTIVE' as const : 'PAUSED' as const,
          nextDate: r.nextDate,
          startDate: r.startDate,
          endDate: r.endDate,
          accountId: r.accountId,
          accountName: r.account?.name || 'Unknown',
          categoryId: r.categoryId,
          categoryName: r.category?.name || 'Unassigned',
          description: notes,
          url,
          color,
        };
      });

      // Normalize subscriptions (with metadata fallback)
      const normalizedSubs = subData.map((s: any) => {
        let notes = s.description || '';
        let freq: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'SEMI_ANNUALLY' | 'YEARLY' = 'MONTHLY';
        let endDate = null;
        let originalAmount = Number(s.monthlyCost);
        let direction: 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'INVESTMENT' = 'EXPENSE';

        if (s.description && s.description.startsWith('{')) {
          try {
            const parsed = JSON.parse(s.description);
            notes = parsed.notes || '';
            freq = parsed.frequency || 'MONTHLY';
            endDate = parsed.endDate || null;
            originalAmount = parsed.originalAmount !== undefined ? Number(parsed.originalAmount) : Number(s.monthlyCost);
            direction = parsed.type || 'EXPENSE';
          } catch (e) {}
        }

        return {
          id: s.id,
          source: 'subscription' as const,
          name: s.service,
          amount: originalAmount,
          frequency: freq,
          type: direction,
          status: s.status,
          nextDate: s.renewalDate,
          startDate: s.renewalDate,
          endDate,
          accountId: s.accountId,
          accountName: s.account?.name || 'Unknown',
          categoryId: s.categoryId,
          categoryName: s.category?.name || 'Unassigned',
          description: notes,
          url: s.url,
          color: s.color || '#6366f1',
        };
      });

      setItems([...normalizedRecurring, ...normalizedSubs]);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load recurring bills & subscriptions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenAddDialog = () => {
    setEditingItem(null);
    setFormSource('subscription');
    setName('');
    setAmount('');
    setFrequency('MONTHLY');
    setType('EXPENSE');
    setStatus('ACTIVE');
    setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate('');
    setAccountId(accounts[0]?.id || '');
    setCategoryId('');
    setDescription('');
    setUrl('');
    setColor('#6366f1');
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (item: UnifiedItem) => {
    setEditingItem(item);
    setFormSource(item.source);
    setName(item.name);
    setAmount(item.amount.toString());
    setFrequency(item.frequency);
    setType(item.type as any);
    setStatus(item.status);
    setStartDate(new Date(item.startDate || item.nextDate).toISOString().split('T')[0]);
    setEndDate(item.endDate ? new Date(item.endDate).toISOString().split('T')[0] : '');
    setAccountId(item.accountId || '');
    setCategoryId(item.categoryId || '');
    setDescription(item.description || '');
    setUrl(item.url || '');
    setColor(item.color || '#6366f1');
    setIsDialogOpen(true);
  };

  const calculateMonthlyEquivalent = (val: number, freq: string) => {
    switch (freq) {
      case 'DAILY':
        return val * 30;
      case 'WEEKLY':
        return val * 4.33;
      case 'MONTHLY':
        return val;
      case 'QUARTERLY':
        return val / 3;
      case 'SEMI_ANNUALLY':
        return val / 6;
      case 'YEARLY':
        return val / 12;
      default:
        return val;
    }
  };

  const handleSaveItem = () => {
    if (!name.trim()) {
      toast.error('Please enter a name');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid positive amount');
      return;
    }

    startTransition(async () => {
      try {
        let res;
        const inputAmount = parseFloat(amount);

        if (formSource === 'subscription') {
          // Calculate monthlyCost equivalent to save inside Subscription model standard column
          const monthlyCostEquivalent = calculateMonthlyEquivalent(inputAmount, frequency);

          // Package all additional metadata directly into the description column
          const metadataDescription = JSON.stringify({
            notes: description,
            frequency,
            endDate: endDate || null,
            originalAmount: inputAmount,
            type
          });

          const payload = {
            service: name,
            monthlyCost: monthlyCostEquivalent,
            annualCost: monthlyCostEquivalent * 12,
            renewalDate: startDate,
            status: status,
            description: metadataDescription,
            url: url || null,
            color: color,
            accountId: accountId || null,
            categoryId: categoryId || null,
          };

          const method = editingItem ? 'PUT' : 'POST';
          const endpoint = editingItem ? `/api/subscriptions/${editingItem.id}` : '/api/subscriptions';

          res = await fetch(endpoint, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
        } else {
          // recurring
          // Package theme color & url inside description JSON
          const metadataDescription = JSON.stringify({
            notes: description,
            color,
            url: url || null
          });

          const payload = {
            name,
            amount: inputAmount,
            type,
            frequency,
            startDate,
            endDate: endDate || null,
            isActive: status === 'ACTIVE',
            accountId,
            categoryId: categoryId || null,
            description: metadataDescription,
          };

          const method = editingItem ? 'PUT' : 'POST';
          const endpoint = editingItem ? `/api/recurring/${editingItem.id}` : '/api/recurring';

          res = await fetch(endpoint, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
        }

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to save item');
        }

        toast.success(editingItem ? 'Updated successfully' : 'Created successfully');
        setIsDialogOpen(false);
        fetchData();
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || 'Error occurred while saving');
      }
    });
  };

  const handleDeleteItem = (item: UnifiedItem) => {
    if (!confirm(`Are you sure you want to delete this ${item.source === 'subscription' ? 'subscription' : 'recurring rule'}?`)) return;

    startTransition(async () => {
      try {
        const endpoint = item.source === 'subscription' 
          ? `/api/subscriptions/${item.id}` 
          : `/api/recurring/${item.id}`;

        const res = await fetch(endpoint, { method: 'DELETE' });

        if (!res.ok) throw new Error('Delete request failed');

        toast.success('Successfully deleted');
        fetchData();
      } catch (err) {
        console.error(err);
        toast.error('Failed to delete item');
      }
    });
  };

  const getMonthlyEquivalent = (item: UnifiedItem) => {
    if (item.status === 'CANCELLED' || item.status === 'EXPIRED' || item.status === 'PAUSED') return 0;
    const factor = item.type === 'INCOME' ? 1 : -1;
    switch (item.frequency) {
      case 'DAILY':
        return item.amount * 30 * factor;
      case 'WEEKLY':
        return item.amount * 4.33 * factor;
      case 'MONTHLY':
        return item.amount * factor;
      case 'QUARTERLY':
        return (item.amount / 3) * factor;
      case 'SEMI_ANNUALLY':
        return (item.amount / 6) * factor;
      case 'YEARLY':
        return (item.amount / 12) * factor;
      default:
        return item.amount * factor;
    }
  };

  // Filtered lists
  const filteredItems = items.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesSource = filterSource === 'ALL' || item.source.toUpperCase() === filterSource;
    const matchesType = filterType === 'ALL' || item.type === filterType;
    const matchesFrequency = filterFrequency === 'ALL' || item.frequency === filterFrequency;
    const matchesStatus = filterStatus === 'ALL' || item.status === filterStatus;

    return matchesSearch && matchesSource && matchesType && matchesFrequency && matchesStatus;
  });

  // Aggregated Stats
  const activeSchedules = items.filter(i => i.status === 'ACTIVE').length;
  
  // Total Expenses monthly
  const monthlyExpenses = items
    .filter(i => i.status === 'ACTIVE' && i.type === 'EXPENSE')
    .reduce((sum, i) => sum + Math.abs(getMonthlyEquivalent(i)), 0);

  // Total Inflow monthly
  const monthlyIncome = items
    .filter(i => i.status === 'ACTIVE' && i.type === 'INCOME')
    .reduce((sum, i) => sum + Math.abs(getMonthlyEquivalent(i)), 0);

  // Monthly Outflow chart data (Top 5 items + "Others")
  const activeExpenses = filteredItems.filter(i => i.type === 'EXPENSE' && i.status === 'ACTIVE');
  const sortedExpenses = [...activeExpenses].sort((a, b) => Math.abs(getMonthlyEquivalent(b)) - Math.abs(getMonthlyEquivalent(a)));
  const topExpenses = sortedExpenses.slice(0, 5);
  const otherExpensesSum = sortedExpenses.slice(5).reduce((sum, i) => sum + Math.abs(getMonthlyEquivalent(i)), 0);
  
  const chartData = topExpenses.map(i => ({
    name: i.name.substring(0, 12),
    amount: Math.abs(getMonthlyEquivalent(i))
  }));
  if (otherExpensesSum > 0) {
    chartData.push({ name: 'Others', amount: otherExpensesSum });
  }

  // Category breakdown data
  const categoryMap: { [key: string]: { value: number; color: string } } = {};
  activeExpenses.forEach(i => {
    const name = i.categoryName || 'Unassigned';
    const val = Math.abs(getMonthlyEquivalent(i));
    const color = i.color || '#6366f1';
    if (!categoryMap[name]) {
      categoryMap[name] = { value: 0, color };
    }
    categoryMap[name].value += val;
  });

  const pieData = Object.keys(categoryMap).map(k => ({
    name: k,
    value: categoryMap[k].value,
    color: categoryMap[k].color
  }));

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Bills & Subscriptions" description="Track monthly outlays, recurring contracts, and cash flow schedules">
        <Button onClick={handleOpenAddDialog} className="gradient-primary text-white font-semibold h-8 gap-1 rounded-lg text-xs">
          <Plus className="h-4 w-4" />
          Add Bill / Sub
        </Button>
      </PageHeader>

      {/* Aggregate Overview Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Active Schedules"
          value={activeSchedules}
          prefix=""
          icon={<Repeat className="h-4 w-4 text-primary" />}
        />
        <StatCard
          title="Monthly Commitment"
          value={monthlyExpenses}
          prefix="₹"
          icon={<ArrowUpRight className="h-4 w-4 text-destructive" />}
        />
        <StatCard
          title="Monthly Expected Inflows"
          value={monthlyIncome}
          prefix="₹"
          icon={<ArrowDownRight className="h-4 w-4 text-success" />}
        />
      </div>

      {/* Charts Section */}
      {showCharts && chartData.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="glass md:col-span-2">
            <CardHeader>
              <CardTitle className="text-base font-bold uppercase label-uppercase">Monthly Commitment breakdown</CardTitle>
              <CardDescription>Visual comparison of largest monthly outlays</CardDescription>
            </CardHeader>
            <CardContent className="h-[260px] pl-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val}`} />
                  <Tooltip formatter={(val) => `₹${Number(val).toLocaleString('en-IN')}`} labelStyle={{ color: 'var(--foreground)' }} contentStyle={{ backgroundColor: 'var(--popover)', borderColor: 'var(--border)' }} />
                  <Bar dataKey="amount" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardHeader>
              <CardTitle className="text-base font-bold uppercase label-uppercase">Commitment by Category</CardTitle>
              <CardDescription>Breakdown of active contracts</CardDescription>
            </CardHeader>
            <CardContent className="h-[260px] flex flex-col justify-center relative">
              {pieData.length === 0 ? (
                <div className="text-center text-xs text-muted-foreground">No category data</div>
              ) : (
                <div className="relative h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val) => `₹${Number(val).toLocaleString('en-IN')}`} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Total</span>
                    <span className="text-lg font-extrabold tracking-tight">
                      ₹{monthlyExpenses.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters & Search controls */}
      <Card className="glass border-border bg-card/40 backdrop-blur-xl">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, notes..."
                className="pl-9 h-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {/* Source Filter */}
              <Select value={filterSource} onValueChange={(val: any) => setFilterSource(val)}>
                <SelectTrigger className="h-9 w-[130px]">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Sources</SelectItem>
                  <SelectItem value="SUBSCRIPTION">Subscriptions</SelectItem>
                  <SelectItem value="RECURRING">Recurring Bills</SelectItem>
                </SelectContent>
              </Select>

              {/* Inflow/Outflow Type Filter */}
              <Select value={filterType} onValueChange={(val: any) => setFilterType(val)}>
                <SelectTrigger className="h-9 w-[110px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Types</SelectItem>
                  <SelectItem value="INCOME">Income</SelectItem>
                  <SelectItem value="EXPENSE">Expense</SelectItem>
                </SelectContent>
              </Select>

              {/* Frequency Filter */}
              <Select value={filterFrequency} onValueChange={(val: any) => setFilterFrequency(val)}>
                <SelectTrigger className="h-9 w-[120px]">
                  <SelectValue placeholder="Frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Freq</SelectItem>
                  <SelectItem value="DAILY">Daily</SelectItem>
                  <SelectItem value="WEEKLY">Weekly</SelectItem>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                  <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                  <SelectItem value="SEMI_ANNUALLY">6 Months</SelectItem>
                  <SelectItem value="YEARLY">Yearly</SelectItem>
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select value={filterStatus} onValueChange={(val: any) => setFilterStatus(val)}>
                <SelectTrigger className="h-9 w-[120px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="PAUSED">Paused</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  <SelectItem value="EXPIRED">Expired</SelectItem>
                </SelectContent>
              </Select>

              {/* Clear filters shortcut */}
              {(searchQuery || filterSource !== 'ALL' || filterType !== 'ALL' || filterFrequency !== 'ALL' || filterStatus !== 'ALL') && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-9 w-9" 
                  onClick={() => {
                    setSearchQuery('');
                    setFilterSource('ALL');
                    setFilterType('ALL');
                    setFilterFrequency('ALL');
                    setFilterStatus('ALL');
                  }}
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grid of normalized Cards */}
      <div className="grid gap-6 lg:grid-cols-2">
        {filteredItems.map((item) => (
          <Card key={item.id} className="glass relative overflow-hidden border-border bg-card/60 backdrop-blur-xl transition-all duration-200 card-hover">
            <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: item.color || '#6366f1' }} />
            <CardHeader className="flex flex-row items-start justify-between pb-2 pl-6">
              <div className="space-y-1">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  {item.name}
                  {item.url && (
                    <a href={item.url.startsWith('http') ? item.url : `https://${item.url}`} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground">
                      <LinkIcon className="h-3 w-3" />
                    </a>
                  )}
                  <Badge variant="outline" className="text-[9px] uppercase tracking-wider font-mono h-4">
                    {item.source === 'subscription' ? 'SaaS' : 'Recurring'}
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs min-h-[16px] truncate max-w-[280px]">
                  {item.description || 'No notes added'}
                </CardDescription>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground rounded hover:bg-accent" onClick={() => handleOpenEditDialog(item)}>
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded" onClick={() => handleDeleteItem(item)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pl-6 pt-2 space-y-3">
              <div className="flex flex-row items-center justify-between text-sm">
                <div className="space-y-0.5">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Frequency & Type</p>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold capitalize">{item.frequency.toLowerCase()}</span>
                    <span className="text-muted-foreground">•</span>
                    <span className={cn("text-xs font-semibold px-2 py-0.2 rounded-full", item.type === 'INCOME' ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive")}>
                      {item.type}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Commitment</p>
                  <p className="text-lg font-bold text-foreground">{formatCurrency(item.amount)}</p>
                </div>
              </div>

              <div className="border-t border-border/20 pt-2 flex flex-row items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-foreground">Ledger:</span>
                  <span>{item.accountName}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-foreground">Category:</span>
                  <span>{item.categoryName}</span>
                </div>
                <Badge className={cn("text-[9px] font-semibold text-white", item.status === 'ACTIVE' ? "bg-success" : "bg-muted")}>
                  {item.status}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredItems.length === 0 && (
          <div className="col-span-2 text-center py-10 text-muted-foreground text-sm">
            No matching items found. Click "Add Bill / Sub" to set up your expenses.
          </div>
        )}
      </div>

      {/* Add/Edit Subscription & Recurring Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="form-spacious sm:max-w-[480px] lg:max-w-[600px] lg:p-8 glass border-border bg-card/90 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Scheduled Item' : 'New Scheduled Item'}</DialogTitle>
            <DialogDescription>
              Configure monthly outlays, recurring contracts, and income cycles.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {!editingItem && (
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Flow Structure Type</Label>
                <Select value={formSource} onValueChange={(val: any) => setFormSource(val)}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select type">
                      {formSource === 'subscription' ? 'Subscription (Fixed SaaS)' : formSource === 'recurring' ? 'General Recurring Rule' : 'Select type'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="subscription">Subscription (Fixed recurring service / SaaS)</SelectItem>
                    <SelectItem value="recurring">Recurring payment/inflow (General rule)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="label-uppercase text-muted-foreground">Name / Service</Label>
              <Input
                placeholder={formSource === 'subscription' ? 'e.g. YouTube Premium' : 'e.g. House Rent Payment'}
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isPending}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Amount (₹)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 149"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={isPending}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Frequency</Label>
                <Select value={frequency} onValueChange={(val: any) => setFrequency(val)} disabled={isPending}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select Frequency">
                      {frequency === 'DAILY' ? 'Daily' : frequency === 'WEEKLY' ? 'Weekly' : frequency === 'MONTHLY' ? 'Monthly' : frequency === 'QUARTERLY' ? 'Quarterly' : frequency === 'SEMI_ANNUALLY' ? '6 Months' : frequency === 'YEARLY' ? 'Yearly' : 'Select Frequency'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DAILY">Daily</SelectItem>
                    <SelectItem value="WEEKLY">Weekly</SelectItem>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                    <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                    <SelectItem value="SEMI_ANNUALLY">6 Months</SelectItem>
                    <SelectItem value="YEARLY">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Start / Next Due Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  disabled={isPending}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">End Date (Optional)</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  disabled={isPending}
                  placeholder="Never ends"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Flow Direction</Label>
                <Select value={type} onValueChange={(val: any) => setType(val)} disabled={isPending}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Direction">
                      {type === 'EXPENSE' ? 'Expense (Outflow)' : type === 'INCOME' ? 'Income (Inflow)' : type === 'TRANSFER' ? 'Transfer' : type === 'INVESTMENT' ? 'Investment' : 'Direction'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EXPENSE">Expense (Outflow)</SelectItem>
                    <SelectItem value="INCOME">Income (Inflow)</SelectItem>
                    <SelectItem value="TRANSFER">Transfer</SelectItem>
                    <SelectItem value="INVESTMENT">Investment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Status</Label>
                <Select value={status} onValueChange={(val: any) => setStatus(val)} disabled={isPending}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Status">
                      {status === 'ACTIVE' ? 'Active' : status === 'PAUSED' ? 'Paused' : status === 'CANCELLED' ? 'Cancelled' : 'Expired'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="PAUSED">Paused</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    <SelectItem value="EXPIRED">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Source Ledger Account</Label>
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
            </div>

            <div className="grid grid-cols-1 gap-4">
              <CategorySelector
                categories={categories as any}
                value={categoryId}
                onChange={setCategoryId}
                typeFilter={type === 'INCOME' ? 'INCOME' : 'EXPENSE'}
                disabled={isPending}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Theme Color</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="color"
                    className="w-14 h-11 p-1 border rounded-xl cursor-pointer border-border/40 transition-colors"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    disabled={isPending}
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-xs font-mono">{color}</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Service URL</Label>
                <Input
                  placeholder="e.g. netflix.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={isPending}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="label-uppercase text-muted-foreground">Notes</Label>
              <Textarea
                placeholder="Optional details, billing cycle info..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isPending}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)} disabled={isPending}>Cancel</Button>
            <Button onClick={handleSaveItem} disabled={isPending} className="gradient-primary text-white font-semibold">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save scheduled item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
