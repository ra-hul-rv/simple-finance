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
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ChartTooltip } from 'recharts';
import { TrendingUp, Plus, Calendar, Loader2, ArrowUpRight, ArrowDownRight, Edit2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency, formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

interface Investment {
  id: string;
  name: string;
  type: string;
  investedAmount: number;
  currentValue: number;
  units: number | null;
  purchaseDate: string;
  platform: string | null;
  notes: string | null;
}

export default function InvestmentsPage() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingInv, setEditingInv] = useState<Investment | null>(null);
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState('');
  const [type, setType] = useState('MUTUAL_FUNDS');
  const [investedAmount, setInvestedAmount] = useState('');
  const [currentValue, setCurrentValue] = useState('');
  const [units, setUnits] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [platform, setPlatform] = useState('');
  const [notes, setNotes] = useState('');

  const fetchInvestments = async () => {
    try {
      const res = await fetch('/api/investments');
      const data = await res.json();
      setInvestments(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvestments();
  }, []);

  const handleOpenAddDialog = () => {
    setEditingInv(null);
    setName('');
    setType('MUTUAL_FUNDS');
    setInvestedAmount('');
    setCurrentValue('');
    setUnits('');
    setPurchaseDate(new Date().toISOString().split('T')[0]);
    setPlatform('');
    setNotes('');
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (inv: Investment) => {
    setEditingInv(inv);
    setName(inv.name);
    setType(inv.type);
    setInvestedAmount(inv.investedAmount.toString());
    setCurrentValue(inv.currentValue.toString());
    setUnits(inv.units ? inv.units.toString() : '');
    setPurchaseDate(new Date(inv.purchaseDate).toISOString().split('T')[0]);
    setPlatform(inv.platform || '');
    setNotes(inv.notes || '');
    setIsDialogOpen(true);
  };

  const handleSaveInvestment = () => {
    if (!name.trim()) {
      toast.error('Please enter an investment name');
      return;
    }
    if (!investedAmount || parseFloat(investedAmount) <= 0) {
      toast.error('Please enter a valid invested amount');
      return;
    }
    if (!currentValue || parseFloat(currentValue) < 0) {
      toast.error('Please enter a valid current value');
      return;
    }

    const payload = {
      name,
      type,
      investedAmount: parseFloat(investedAmount),
      currentValue: parseFloat(currentValue),
      units: units ? parseFloat(units) : null,
      purchaseDate,
      platform: platform || null,
      notes: notes || null,
    };

    startTransition(async () => {
      try {
        const url = editingInv ? `/api/investments/${editingInv.id}` : '/api/investments';
        const method = editingInv ? 'PUT' : 'POST';

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to save investment');
        }

        toast.success(editingInv ? 'Asset updated' : 'Asset linked successfully');
        setIsDialogOpen(false);
        fetchInvestments();
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || 'Failed to save asset');
      }
    });
  };

  const handleDeleteInv = (id: string) => {
    if (!confirm('Are you sure you want to delete this asset?')) return;

    startTransition(async () => {
      try {
        const res = await fetch(`/api/investments/${id}`, {
          method: 'DELETE',
        });

        if (!res.ok) throw new Error('Failed to delete');
        toast.success('Asset deleted successfully');
        fetchInvestments();
      } catch (err) {
        console.error(err);
        toast.error('Failed to delete asset');
      }
    });
  };

  const totalInvested = investments.reduce((sum, inv) => sum + inv.investedAmount, 0);
  const totalCurrent = investments.reduce((sum, inv) => sum + inv.currentValue, 0);
  const totalGain = totalCurrent - totalInvested;
  const gainPct = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;

  // Chart data
  const chartMap: Record<string, number> = {};
  investments.forEach((inv) => {
    chartMap[inv.type] = (chartMap[inv.type] || 0) + inv.currentValue;
  });
  const chartData = Object.entries(chartMap).map(([name, value]) => ({ name, value }));

  const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#a855f7', '#ec4899', '#06b6d4'];

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
        <PageHeader title="Investments Ledger" description="Track stocks, mutual funds, and crypto asset returns" />
        <Button onClick={handleOpenAddDialog} className="gradient-primary text-white font-semibold">
          <Plus className="mr-1.5 h-4 w-4" />
          Link Asset
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Seeded Capital"
          value={totalInvested}
          prefix="₹"
          icon={<TrendingUp className="h-4 w-4 text-primary" />}
        />
        <StatCard
          title="Current Portfolio Value"
          value={totalCurrent}
          prefix="₹"
          icon={<Calendar className="h-4 w-4 text-success" />}
        />
        <StatCard
          title="Total Net Return"
          value={`${totalGain >= 0 ? '+' : ''}${formatCurrency(totalGain)} (${gainPct.toFixed(1)}%)`}
          prefix=""
          icon={totalGain >= 0 ? <ArrowUpRight className="h-4 w-4 text-success" /> : <ArrowDownRight className="h-4 w-4 text-destructive" />}
          className={cn(totalGain >= 0 ? "border-l-4 border-success" : "border-l-4 border-destructive")}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="glass col-span-2 border-border bg-card/60 backdrop-blur-xl">
          <CardHeader>
            <CardTitle>Asset Holds</CardTitle>
            <CardDescription>Individual positions ledger</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {investments.map((inv) => {
                const gain = inv.currentValue - inv.investedAmount;
                const pct = inv.investedAmount > 0 ? (gain / inv.investedAmount) * 100 : 0;
                return (
                  <div key={inv.id} className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border/40 pb-4 last:border-0 last:pb-0 gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-base">{inv.name}</span>
                        <Badge variant="outline" className="text-[10px] uppercase font-mono">{inv.type}</Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Platform: {inv.platform || 'Unspecified'}</span>
                        <span>•</span>
                        <span>Date: {formatDate(inv.purchaseDate)}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-6">
                      <div className="text-left sm:text-right">
                        <p className="text-sm font-semibold">{formatCurrency(inv.currentValue)}</p>
                        <p className={cn("text-xs font-semibold", gain >= 0 ? "text-success" : "text-destructive")}>
                          {gain >= 0 ? '+' : ''}{pct.toFixed(1)}% ({formatCurrency(gain)})
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => handleOpenEditDialog(inv)}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteInv(inv.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {investments.length === 0 && (
                <div className="text-center py-10 text-muted-foreground text-sm">
                  No assets tracked yet. Click "Link Asset" to start.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-border bg-card/60 backdrop-blur-xl">
          <CardHeader>
            <CardTitle>Asset Allocation</CardTitle>
            <CardDescription>Breakdown by current asset value</CardDescription>
          </CardHeader>
          <CardContent className="h-64 flex flex-col items-center justify-center">
            {chartData.length > 0 ? (
              <div className="w-full h-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip
                      contentStyle={{ backgroundColor: 'rgba(23, 23, 23, 0.9)', borderColor: 'rgba(255, 255, 255, 0.1)', borderRadius: '8px' }}
                      labelStyle={{ color: '#fff' }}
                      formatter={(val: any) => [`₹${Number(val).toLocaleString()}`, 'Value']}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                  <p className="text-xs text-muted-foreground uppercase">Total Value</p>
                  <p className="text-base font-bold text-foreground">{formatCurrency(totalCurrent)}</p>
                </div>
              </div>
            ) : (
              <div className="text-muted-foreground text-sm">No allocation data</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Link Asset Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="form-spacious sm:max-w-[425px] lg:max-w-[550px] lg:p-8 glass border-border bg-card/90 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle>{editingInv ? 'Modify Hold Details' : 'Link Investment Asset'}</DialogTitle>
            <DialogDescription>
              Assign capital allocation for portfolio value summaries.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="label-uppercase text-muted-foreground">Asset Name</Label>
              <Input
                placeholder="e.g. BTC, Reliance Share, etc."
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isPending}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Capital Invested (₹)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 50000"
                  value={investedAmount}
                  onChange={(e) => setInvestedAmount(e.target.value)}
                  disabled={isPending}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Current Value (₹)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 62000"
                  value={currentValue}
                  onChange={(e) => setCurrentValue(e.target.value)}
                  disabled={isPending}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Type</Label>
                <Select value={type} onValueChange={(val) => setType(val || 'MUTUAL_FUNDS')} disabled={isPending}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select type">
                      {type === 'MUTUAL_FUNDS' ? 'Mutual Funds' : type === 'STOCKS' ? 'Stocks' : type === 'CRYPTO' ? 'Crypto' : type === 'GOLD' ? 'Gold' : type === 'BONDS' ? 'Bonds' : type === 'OTHER' ? 'Other Assets' : type}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STOCKS">Stocks</SelectItem>
                    <SelectItem value="MUTUAL_FUNDS">Mutual Funds</SelectItem>
                    <SelectItem value="CRYPTO">Crypto</SelectItem>
                    <SelectItem value="GOLD">Gold</SelectItem>
                    <SelectItem value="BONDS">Bonds</SelectItem>
                    <SelectItem value="OTHER">Other Assets</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Purchase Date</Label>
                <Input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  disabled={isPending}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Units Held (optional)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 1.25"
                  step="0.00001"
                  value={units}
                  onChange={(e) => setUnits(e.target.value)}
                  disabled={isPending}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Platform Broker</Label>
                <Input
                  placeholder="e.g. Zerodha, Coin"
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  disabled={isPending}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="label-uppercase text-muted-foreground">Private Notes</Label>
              <Input
                placeholder="Optional descriptions..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isPending}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)} disabled={isPending}>Cancel</Button>
            <Button onClick={handleSaveInvestment} disabled={isPending} className="gradient-primary text-white font-semibold">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Log Asset'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
