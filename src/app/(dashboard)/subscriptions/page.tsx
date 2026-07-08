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
import { Badge } from '@/components/ui/badge';
import { Plus, Edit2, Trash2, Calendar, LinkIcon, Loader2, Tv } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency, formatDate } from '@/lib/format';

interface Subscription {
  id: string;
  service: string;
  monthlyCost: number;
  annualCost: number | null;
  renewalDate: string;
  status: string;
  description: string | null;
  url: string | null;
  color: string | null;
  account: { id: string; name: string } | null;
  category: { id: string; name: string } | null;
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
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<Subscription | null>(null);
  const [isPending, startTransition] = useTransition();

  const [service, setService] = useState('');
  const [monthlyCost, setMonthlyCost] = useState('');
  const [renewalDate, setRenewalDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState('ACTIVE');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');

  const fetchSubscriptions = async () => {
    try {
      const res = await fetch('/api/subscriptions');
      const data = await res.json();
      setSubs(data);

      const accRes = await fetch('/api/accounts');
      const accData = await accRes.json();
      setAccounts(accData);
      setAccountId(accData[0]?.id || '');

      const catRes = await fetch('/api/categories');
      const catData = await catRes.json();
      setCategories(catData.filter((c: any) => c.type === 'EXPENSE'));
      setCategoryId(catData[0]?.id || '');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const handleOpenAddDialog = () => {
    setEditingSub(null);
    setService('');
    setMonthlyCost('');
    setRenewalDate(new Date().toISOString().split('T')[0]);
    setStatus('ACTIVE');
    setDescription('');
    setUrl('');
    setColor('#6366f1');
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (sub: Subscription) => {
    setEditingSub(sub);
    setService(sub.service);
    setMonthlyCost(sub.monthlyCost.toString());
    setRenewalDate(new Date(sub.renewalDate).toISOString().split('T')[0]);
    setStatus(sub.status);
    setDescription(sub.description || '');
    setUrl(sub.url || '');
    setColor(sub.color || '#6366f1');
    setAccountId(sub.account?.id || '');
    setCategoryId(sub.category?.id || '');
    setIsDialogOpen(true);
  };

  const handleSaveSub = () => {
    if (!service.trim()) {
      toast.error('Please enter a service name');
      return;
    }
    if (!monthlyCost || parseFloat(monthlyCost) <= 0) {
      toast.error('Please enter a valid positive cost');
      return;
    }

    const payload = {
      service,
      monthlyCost: parseFloat(monthlyCost),
      annualCost: parseFloat(monthlyCost) * 12,
      renewalDate,
      status,
      description: description || null,
      url: url || null,
      color,
      accountId: accountId || null,
      categoryId: categoryId || null,
    };

    startTransition(async () => {
      try {
        const urlStr = editingSub ? `/api/subscriptions/${editingSub.id}` : '/api/subscriptions';
        const method = editingSub ? 'PUT' : 'POST';

        const res = await fetch(urlStr, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to save subscription');
        }

        toast.success(editingSub ? 'Subscription updated' : 'Subscription active');
        setIsDialogOpen(false);
        fetchSubscriptions();
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || 'Failed to save subscription');
      }
    });
  };

  const handleDeleteSub = (id: string) => {
    if (!confirm('Are you sure you want to delete this subscription?')) return;

    startTransition(async () => {
      try {
        const res = await fetch(`/api/subscriptions/${id}`, {
          method: 'DELETE',
        });

        if (!res.ok) throw new Error('Failed to delete');
        toast.success('Subscription deleted successfully');
        fetchSubscriptions();
      } catch (err) {
        console.error(err);
        toast.error('Failed to delete subscription');
      }
    });
  };

  const totalMonthly = subs.filter(s => s.status === 'ACTIVE').reduce((sum, s) => sum + s.monthlyCost, 0);
  const totalAnnual = totalMonthly * 12;

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Subscriptions Hub" description="Track monthly outlays, recurring SaaS renewals, and details" />
        <Button onClick={handleOpenAddDialog} className="gradient-primary text-white font-semibold">
          <Plus className="mr-1.5 h-4 w-4" />
          Add Subscription
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Active SaaS renewals"
          value={subs.filter(s => s.status === 'ACTIVE').length}
          prefix=""
          icon={<Tv className="h-4 w-4 text-primary" />}
        />
        <StatCard
          title="Monthly SaaS Cost"
          value={totalMonthly}
          prefix="₹"
          icon={<Calendar className="h-4 w-4 text-success" />}
        />
        <StatCard
          title="Annual SaaS Cost"
          value={totalAnnual}
          prefix="₹"
          icon={<Calendar className="h-4 w-4 text-destructive" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {subs.map((sub) => (
          <Card key={sub.id} className="glass relative overflow-hidden border-border bg-card/60 backdrop-blur-xl transition-all duration-200 card-hover">
            <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: sub.color || '#6366f1' }} />
            <CardHeader className="flex flex-row items-start justify-between pb-2 pl-6">
              <div className="space-y-1">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  {sub.service}
                  {sub.url && (
                    <a href={sub.url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground">
                      <LinkIcon className="h-3 w-3" />
                    </a>
                  )}
                </CardTitle>
                <CardDescription className="text-xs">{sub.description || 'Auto-renewal schedule'}</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => handleOpenEditDialog(sub)}>
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteSub(sub.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pl-6 flex flex-row items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Renewal Date</p>
                <p className="text-sm font-semibold">{formatDate(sub.renewalDate)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Monthly Cost</p>
                <p className="text-lg font-bold text-foreground">{formatCurrency(sub.monthlyCost)}</p>
              </div>
            </CardContent>
          </Card>
        ))}
        {subs.length === 0 && (
          <div className="col-span-2 text-center py-10 text-muted-foreground text-sm">
            No subscriptions tracked yet. Click "Add Subscription" to register your plans.
          </div>
        )}
      </div>

      {/* Add/Edit Subscription Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px] glass border-border bg-card/90 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle>{editingSub ? 'Update Subscription' : 'Track Subscription'}</DialogTitle>
            <DialogDescription>
              Provide SaaS billing details for monthly projections.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="label-uppercase text-muted-foreground">Service Name</Label>
              <Input
                placeholder="e.g. Netflix Premium"
                value={service}
                onChange={(e) => setService(e.target.value)}
                disabled={isPending}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Monthly Cost (₹)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 649"
                  value={monthlyCost}
                  onChange={(e) => setMonthlyCost(e.target.value)}
                  disabled={isPending}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Renewal Date</Label>
                <Input
                  type="date"
                  value={renewalDate}
                  onChange={(e) => setRenewalDate(e.target.value)}
                  disabled={isPending}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Account Payment</Label>
                <Select value={accountId} onValueChange={(val) => setAccountId(val || '')} disabled={isPending}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Account">
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
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Category</Label>
                <Select value={categoryId} onValueChange={(val) => setCategoryId(val || '')} disabled={isPending}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Category">
                      {categories.find(c => c.id === categoryId)?.name || 'Select Category'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Status</Label>
                <Select value={status} onValueChange={(val) => setStatus(val || 'ACTIVE')} disabled={isPending}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Status">
                      {status === 'ACTIVE' ? 'Active' : status === 'PAUSED' ? 'Paused' : status === 'CANCELLED' ? 'Cancelled' : status === 'EXPIRED' ? 'Expired' : status}
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Theme Color</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="color"
                    className="w-12 h-9 p-0.5 border rounded-lg cursor-pointer bg-background"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    disabled={isPending}
                  />
                  <span className="text-xs font-mono">{color}</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Private description</Label>
                <Input
                  placeholder="Optional details..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isPending}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)} disabled={isPending}>Cancel</Button>
            <Button onClick={handleSaveSub} disabled={isPending} className="gradient-primary text-white font-semibold">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Subscription'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
