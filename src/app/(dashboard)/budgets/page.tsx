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
import { Progress, ProgressTrack, ProgressIndicator } from '@/components/ui/progress';
import { PiggyBank, Plus, Edit2, Loader2, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface Category {
  id: string;
  name: string;
  type: string;
}

interface Budget {
  id: string;
  amount: number;
  spent: number;
  month: number;
  year: number;
  categoryId: string;
  category: Category;
}

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog configurations
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [isPending, startTransition] = useTransition();

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const fetchBudgets = async () => {
    try {
      const budgetRes = await fetch(`/api/budgets?month=${currentMonth}&year=${currentYear}`);
      const budgetData = await budgetRes.json();
      setBudgets(budgetData);

      const catRes = await fetch('/api/categories');
      const catData = await catRes.json();
      setCategories(catData.filter((c: any) => c.type === 'EXPENSE'));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBudgets();
  }, []);

  const handleOpenAddDialog = () => {
    setAmount('');
    setSelectedCategoryId(categories[0]?.id || '');
    setIsDialogOpen(true);
  };

  const handleSaveBudget = () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid positive budget limit');
      return;
    }
    if (!selectedCategoryId) {
      toast.error('Please select a category');
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch('/api/budgets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: parseFloat(amount),
            categoryId: selectedCategoryId,
            month: currentMonth,
            year: currentYear,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to save budget');
        }

        toast.success('Budget limit configured successfully');
        setIsDialogOpen(false);
        fetchBudgets();
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || 'Failed to save budget');
      }
    });
  };

  const totalLimit = budgets.reduce((sum, b) => sum + b.amount, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
  const totalPercentage = totalLimit > 0 ? (totalSpent / totalLimit) * 100 : 0;

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
        <PageHeader title="Budgets Planner" description="Manage monthly thresholds and track category consumption" />
        <Button onClick={handleOpenAddDialog} className="gradient-primary text-white font-semibold">
          <Plus className="mr-1.5 h-4 w-4" />
          Setup Budget
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Total Budget Limit"
          value={totalLimit}
          prefix="₹"
          icon={<PiggyBank className="h-4 w-4 text-primary" />}
        />
        <StatCard
          title="Consumed Amount"
          value={totalSpent}
          prefix="₹"
          icon={<Calendar className="h-4 w-4 text-success" />}
        />
        <StatCard
          title="Spent Percentage"
          value={`${totalPercentage.toFixed(1)}%`}
          prefix=""
          icon={<Calendar className="h-4 w-4 text-destructive" />}
        />
      </div>

      <Card className="glass border-border bg-card/60 backdrop-blur-xl">
        <CardHeader>
          <CardTitle>Category Enforcements</CardTitle>
          <CardDescription>Target limits vs actual expenditures</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {budgets.map((b) => {
            const pct = b.amount > 0 ? (b.spent / b.amount) * 100 : 0;
            return (
              <div key={b.id} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{b.category.name}</span>
                    <Badge variant="secondary" className="text-[10px] uppercase">
                      {pct > 100 ? 'Overspent' : pct > 80 ? 'Warning' : 'Healthy'}
                    </Badge>
                  </div>
                  <span className="text-muted-foreground font-mono">
                    {formatCurrency(b.spent)} / {formatCurrency(b.amount)}
                  </span>
                </div>
                <Progress value={Math.min(pct, 100)} className="w-full">
                  <ProgressTrack className="h-2 bg-muted rounded-full overflow-hidden w-full">
                    <ProgressIndicator
                      className={cn(
                        "h-full transition-all",
                        pct > 100 ? "bg-destructive animate-pulse" : pct > 80 ? "bg-amber-500" : "bg-primary"
                      )}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </ProgressTrack>
                </Progress>
              </div>
            );
          })}
          {budgets.length === 0 && (
            <div className="text-center py-10 text-muted-foreground text-sm">
              No category budgets configured yet. Click "Setup Budget" to start.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Setup Budget Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="form-spacious sm:max-w-[425px] lg:max-w-[550px] lg:p-8 glass border-border bg-card/90 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle>Configure Budget Limit</DialogTitle>
            <DialogDescription>
              Set the monthly spending threshold for a category.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="label-uppercase text-muted-foreground">Category</Label>
              <Select value={selectedCategoryId} onValueChange={(val) => setSelectedCategoryId(val || '')} disabled={isPending}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select category">
                    {categories.find(c => c.id === selectedCategoryId)?.name || 'Select category'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="label-uppercase text-muted-foreground">Monthly Limit (₹)</Label>
              <Input
                type="number"
                placeholder="e.g. 15000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={isPending}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)} disabled={isPending}>Cancel</Button>
            <Button onClick={handleSaveBudget} disabled={isPending} className="gradient-primary text-white font-semibold">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply Limit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
