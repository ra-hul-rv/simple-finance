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
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Edit2,
  Trash2,
  Receipt,
  Calendar,
  Loader2,
  Search,
  Filter,
  DollarSign,
  TrendingUp,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency, formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

interface Subscription {
  id: string;
  service: string;
  monthlyCost: number;
  annualCost: number | null;
  renewalDate: string;
  status: 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'EXPIRED';
  description: string | null;
  url: string | null;
  icon: string | null;
  color: string | null;
  accountId: string | null;
  categoryId: string | null;
  account?: { name: string } | null;
  category?: { name: string } | null;
}

interface Account {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
}

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Dialog forms
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [isPending, startTransition] = useTransition();

  // Form states
  const [service, setService] = useState('');
  const [monthlyCost, setMonthlyCost] = useState('');
  const [annualCost, setAnnualCost] = useState('');
  const [renewalDate, setRenewalDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'EXPIRED'>('ACTIVE');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');

  const fetchSubscriptions = async () => {
    try {
      const res = await fetch('/api/subscriptions');
      if (!res.ok) throw new Error('Failed to load subscriptions');
      const data = await res.json();
      setSubscriptions(data);

      const [accRes, catRes] = await Promise.all([
        fetch('/api/accounts'),
        fetch('/api/categories'),
      ]);
      if (accRes.ok) setAccounts(await accRes.json());
      if (catRes.ok) setCategories(await catRes.json());
    } catch (err) {
      console.error(err);
      toast.error('Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const handleOpenAddDialog = () => {
    setEditingSubscription(null);
    setService('');
    setMonthlyCost('');
    setAnnualCost('');
    setRenewalDate(new Date().toISOString().split('T')[0]);
    setStatus('ACTIVE');
    setDescription('');
    setUrl('');
    setColor('#6366f1');
    setAccountId('');
    setCategoryId('');
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (sub: Subscription) => {
    setEditingSubscription(sub);
    setService(sub.service);
    setMonthlyCost(sub.monthlyCost.toString());
    setAnnualCost(sub.annualCost?.toString() || '');
    setRenewalDate(new Date(sub.renewalDate).toISOString().split('T')[0]);
    setStatus(sub.status);
    setDescription(sub.description || '');
    setUrl(sub.url || '');
    setColor(sub.color || '#6366f1');
    setAccountId(sub.accountId || '');
    setCategoryId(sub.categoryId || '');
    setIsDialogOpen(true);
  };

  const handleSaveSubscription = () => {
    if (!service.trim()) {
      toast.error('Please enter a service name');
      return;
    }
    if (!monthlyCost || parseFloat(monthlyCost) <= 0) {
      toast.error('Please enter a valid monthly cost');
      return;
    }

    const payload = {
      service,
      monthlyCost: parseFloat(monthlyCost),
      annualCost: annualCost ? parseFloat(annualCost) : null,
      renewalDate: new Date(renewalDate).toISOString(),
      status,
      description: description.trim() || null,
      url: url.trim() || null,
      color,
      accountId: accountId || null,
      categoryId: categoryId || null,
    };

    startTransition(async () => {
      try {
        const fetchUrl = editingSubscription ? `/api/subscriptions/${editingSubscription.id}` : '/api/subscriptions';
        const method = editingSubscription ? 'PUT' : 'POST';

        const res = await fetch(fetchUrl, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) throw new Error('Failed to save subscription');

        toast.success(editingSubscription ? 'Subscription updated' : 'Subscription added');
        setIsDialogOpen(false);
        fetchSubscriptions();
      } catch (err) {
        console.error(err);
        toast.error('Failed to save subscription');
      }
    });
  };

  const handleDeleteSubscription = async (id: string) => {
    if (!confirm('Are you sure you want to delete this subscription?')) {
      return;
    }

    try {
      const res = await fetch(`/api/subscriptions/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete subscription');
      toast.success('Subscription deleted');
      fetchSubscriptions();
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete subscription');
    }
  };

  const filteredSubs = subscriptions.filter((sub) => {
    const matchesSearch = sub.service.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (sub.description && sub.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'ALL' || sub.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalMonthlySpend = filteredSubs
    .filter((s) => s.status === 'ACTIVE')
    .reduce((sum, s) => sum + s.monthlyCost, 0);

  const totalAnnualSpend = filteredSubs
    .filter((s) => s.status === 'ACTIVE')
    .reduce((sum, s) => sum + (s.annualCost || (s.monthlyCost * 12)), 0);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <PageHeader title="Subscriptions Manager" description="Track monthly/yearly recurring service charges and automated bill renewals">
        <Button onClick={handleOpenAddDialog} className="h-9 gap-1.5 px-4 rounded-xl gradient-primary text-white font-semibold shadow-md">
          <Plus className="h-4 w-4" />
          Add Subscription
        </Button>
      </PageHeader>

      {/* Aggregate Overview Card */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Monthly Subscription Costs" value={totalMonthlySpend} variant="glass" />
        <StatCard title="Annual Projected Outflow" value={totalAnnualSpend} prefix="₹" icon={<TrendingUp className="h-4 w-4 text-primary" />} />
        <StatCard title="Active Services Count" value={filteredSubs.filter(s => s.status === 'ACTIVE').length} prefix="" icon={<Receipt className="h-4 w-4 text-success" />} />
      </div>

      {/* Filters and Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card/30 p-4 rounded-xl border border-border/40 backdrop-blur-md">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search subscription services..." 
            className="pl-10 bg-background/30 border-border/40 h-10 rounded-xl"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val || 'ALL')}>
            <SelectTrigger className="w-[150px] bg-background/30 border-border/40 h-10 rounded-xl">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="PAUSED">Paused</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
              <SelectItem value="EXPIRED">Expired</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSubs.map((sub) => {
            const statusColors = {
              ACTIVE: 'bg-success/15 text-success border-success/30',
              PAUSED: 'bg-warning/15 text-warning border-warning/30',
              CANCELLED: 'bg-muted text-muted-foreground border-border/40',
              EXPIRED: 'bg-destructive/15 text-destructive border-destructive/30',
            };

            const displayRenewal = new Date(sub.renewalDate);

            return (
              <Card
                key={sub.id}
                className="relative overflow-hidden transition-all duration-200 card-hover border border-border/40 rounded-xl bg-card"
              >
                <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: sub.color || '#6366f1' }} />
                <CardHeader className="flex flex-row items-start justify-between pb-3 pl-6">
                  <div className="space-y-1">
                    <Badge variant="outline" className={cn("text-[9px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full border", statusColors[sub.status])}>
                      {sub.status}
                    </Badge>
                    <CardTitle className="text-base font-bold truncate max-w-[180px] pt-1">
                      {sub.service}
                    </CardTitle>
                    {sub.description && (
                      <CardDescription className="text-xs truncate max-w-[200px]">
                        {sub.description}
                      </CardDescription>
                    )}
                  </div>
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-white font-bold"
                    style={{ backgroundColor: sub.color || '#6366f1' }}
                  >
                    <Receipt className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent className="pl-6 space-y-4">
                  <div className="flex justify-between items-baseline border-t border-border/30 pt-3">
                    <span className="text-xs text-muted-foreground">Monthly Cost</span>
                    <span className="text-lg font-bold tabular-nums tracking-tight text-foreground">
                      {formatCurrency(sub.monthlyCost, 'INR')}
                    </span>
                  </div>

                  <div className="flex justify-between items-baseline text-xs text-muted-foreground">
                    <span>Renewal Date</span>
                    <span className="font-semibold flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDate(sub.renewalDate, 'dd MMM yyyy')}
                    </span>
                  </div>

                  {sub.account && (
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Paid Via</span>
                      <span className="font-semibold text-foreground truncate max-w-[150px]">{sub.account.name}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center border-t border-border/30 pt-3">
                    {sub.url ? (
                      <a
                        href={sub.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-primary hover:underline flex items-center gap-0.5"
                      >
                        Visit Service
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground/40 italic">No link</span>
                    )}
                    <div className="flex gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 rounded-lg hover:bg-accent"
                        onClick={() => handleOpenEditDialog(sub)}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteSubscription(sub.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {filteredSubs.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center border border-dashed rounded-xl p-12 text-center bg-card/20 border-border/40">
              <Receipt className="h-10 w-10 text-muted-foreground/60 mb-2" />
              <p className="text-sm font-semibold">No subscriptions found</p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">Add your streaming services, cloud storage, or domain subscriptions to track billing</p>
              <Button size="sm" onClick={handleOpenAddDialog} className="rounded-xl h-9">
                Add Subscription
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Subscription Dialog - Spacious and Premium */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="form-spacious sm:max-w-[480px] lg:max-w-[600px] lg:p-8">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight">
              {editingSubscription ? 'Edit Subscription Details' : 'Add Recurring Subscription'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Define the recurring subscription charge, service, cycle date, and status.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Service Name</Label>
                <Input
                  placeholder="e.g. Netflix, Spotify"
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                  disabled={isPending}
                  className="h-11 px-4 rounded-xl border-border/40 bg-background/20"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Billing Status</Label>
                <Select value={status} onValueChange={(val: any) => setStatus(val as any)} disabled={isPending}>
                  <SelectTrigger className="bg-background/20 border-border/40 h-11 rounded-xl">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Monthly Cost (₹)</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={monthlyCost}
                  onChange={(e) => setMonthlyCost(e.target.value)}
                  disabled={isPending}
                  className="h-11 px-4 rounded-xl border-border/40 bg-background/20 font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Annual Cost (Opt)</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={annualCost}
                  onChange={(e) => setAnnualCost(e.target.value)}
                  disabled={isPending}
                  className="h-11 px-4 rounded-xl border-border/40 bg-background/20 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Renewal Date</Label>
                <Input
                  type="date"
                  value={renewalDate}
                  onChange={(e) => setRenewalDate(e.target.value)}
                  disabled={isPending}
                  className="h-11 px-4 rounded-xl border-border/40 bg-background/20 font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Service Web URL</Label>
                <Input
                  placeholder="https://..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={isPending}
                  className="h-11 px-4 rounded-xl border-border/40 bg-background/20"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Auto Pay Via Ledger</Label>
                <Select value={accountId} onValueChange={(val: any) => setAccountId(val || '')} disabled={isPending}>
                  <SelectTrigger className="bg-background/20 border-border/40 h-11 rounded-xl">
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
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Theme Color</Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="color"
                    className="w-14 h-11 p-1 border rounded-xl cursor-pointer border-border/40 transition-colors"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    disabled={isPending}
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-sm font-mono text-muted-foreground">{color}</span>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="label-uppercase text-muted-foreground">Private Notes</Label>
              <Textarea
                placeholder="Share passwords, describe family plan splits, include next billing cancellation reminder details..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isPending}
                className="bg-background/20 border-border/40 min-h-[60px] rounded-xl px-4 py-2"
              />
            </div>
          </div>
          <DialogFooter className="gap-3 pt-3 border-t border-border/30">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isPending} className="rounded-xl h-11">
              Cancel
            </Button>
            <Button onClick={handleSaveSubscription} disabled={isPending} className="gradient-primary text-white font-semibold rounded-xl h-11 px-6 shadow-md">
              {isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Subscription'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
