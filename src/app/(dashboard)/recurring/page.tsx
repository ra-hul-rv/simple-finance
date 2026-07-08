'use client';

import { useEffect, useState, useTransition } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { CategorySelector } from '@/components/shared/category-selector';
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
import { Repeat, Calendar, Plus, Loader2, ArrowUpRight } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency, formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

interface RecurringRule {
  id: string;
  name: string;
  amount: number;
  type: string;
  frequency: string;
  startDate: string;
  nextDate: string;
  isActive: boolean;
  account: { name: string };
  category: { name: string } | null;
}

interface Account {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
}

export default function RecurringPage() {
  const [rules, setRules] = useState<RecurringRule[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('EXPENSE');
  const [frequency, setFrequency] = useState('MONTHLY');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [isPending, startTransition] = useTransition();

  const fetchRecurring = async () => {
    try {
      const res = await fetch('/api/recurring');
      const data = await res.json();
      setRules(data);

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
    fetchRecurring();
  }, []);

  const handleOpenAddDialog = () => {
    setName('');
    setAmount('');
    setIsDialogOpen(true);
  };

  const handleCreateRecurring = () => {
    if (!name.trim()) {
      toast.error('Please enter a rule name');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid positive amount');
      return;
    }
    if (!accountId) {
      toast.error('Please select a payment account');
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch('/api/recurring', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            amount: parseFloat(amount),
            type,
            frequency,
            startDate,
            accountId,
            categoryId: categoryId || null,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to create recurring rule');
        }

        toast.success('Recurring transaction rule active');
        setIsDialogOpen(false);
        fetchRecurring();
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || 'Failed to create recurring rule');
      }
    });
  };

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
        <PageHeader title="Recurring Bills" description="Track auto-debits, bill cycles, and scheduled items" />
        <Button onClick={handleOpenAddDialog} className="gradient-primary text-white font-semibold">
          <Plus className="mr-1.5 h-4 w-4" />
          Add Schedule
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Active Schedules"
          value={rules.filter(r => r.isActive).length}
          prefix=""
          icon={<Repeat className="h-4 w-4 text-primary" />}
        />
        <StatCard
          title="Total Scheduled Month"
          value={rules.reduce((sum, r) => sum + r.amount, 0)}
          prefix="₹"
          icon={<ArrowUpRight className="h-4 w-4 text-destructive" />}
        />
        <StatCard
          title="Seeded Transactions"
          value={rules.length}
          prefix=""
          icon={<Calendar className="h-4 w-4 text-success" />}
        />
      </div>

      <Card className="glass border-border bg-card/60 backdrop-blur-xl">
        <CardHeader>
          <CardTitle>Schedule Matrix</CardTitle>
          <CardDescription>Rules defining automated cash flow items</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {rules.map((rule) => (
              <div key={rule.id} className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border/40 pb-4 last:border-0 last:pb-0 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{rule.name}</span>
                    <Badge variant="outline" className="text-[10px] uppercase font-mono">{rule.frequency}</Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Account: {rule.account.name}</span>
                    <span>•</span>
                    <span>Category: {rule.category?.name || 'Unassigned'}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-6">
                  <div className="text-left sm:text-right">
                    <p className="text-sm font-semibold">{formatCurrency(rule.amount)}</p>
                    <p className="text-[10px] text-muted-foreground">Next: {formatDate(rule.nextDate)}</p>
                  </div>
                  <Badge className={cn("text-xs font-semibold text-white", rule.isActive ? "bg-success" : "bg-muted")}>
                    {rule.isActive ? 'Active' : 'Paused'}
                  </Badge>
                </div>
              </div>
            ))}
            {rules.length === 0 && (
              <div className="text-center py-10 text-muted-foreground text-sm">
                No recurring schedules configured. Click "Add Schedule" to configure one.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add Recurring Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px] glass border-border bg-card/90 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle>Configure Recurring Schedule</DialogTitle>
            <DialogDescription>
              Create automated templates for standard inflows or bills.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="label-uppercase text-muted-foreground">Rule Name</Label>
              <Input
                placeholder="e.g. Monthly Rent Inflow"
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
                  placeholder="e.g. 5000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={isPending}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Frequency</Label>
                <Select value={frequency} onValueChange={(val) => setFrequency(val || 'MONTHLY')} disabled={isPending}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select Frequency">
                      {frequency === 'DAILY' ? 'Daily' : frequency === 'WEEKLY' ? 'Weekly' : frequency === 'MONTHLY' ? 'Monthly' : frequency === 'QUARTERLY' ? 'Quarterly' : frequency === 'YEARLY' ? 'Yearly' : frequency}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DAILY">Daily</SelectItem>
                    <SelectItem value="WEEKLY">Weekly</SelectItem>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                    <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                    <SelectItem value="YEARLY">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  disabled={isPending}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Type</Label>
                <Select value={type} onValueChange={(val) => setType(val || 'EXPENSE')} disabled={isPending}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select Type">
                      {type === 'EXPENSE' ? 'Expense' : type === 'INCOME' ? 'Income' : type}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EXPENSE">Expense</SelectItem>
                    <SelectItem value="INCOME">Income</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Source Account</Label>
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
                typeFilter={type as 'INCOME' | 'EXPENSE'}
                disabled={isPending}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)} disabled={isPending}>Cancel</Button>
            <Button onClick={handleCreateRecurring} disabled={isPending} className="gradient-primary text-white font-semibold">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Register Schedule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
