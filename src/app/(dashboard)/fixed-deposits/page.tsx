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
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Landmark, Plus, Calendar, Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency, formatDate } from '@/lib/format';

interface FixedDeposit {
  id: string;
  bankName: string;
  principal: number;
  interestRate: number;
  startDate: string;
  maturityDate: string;
  interestEarned: number;
  maturityAmount: number;
  autoRenewal: boolean;
  notes: string | null;
}

export default function FixedDepositsPage() {
  const [fds, setFds] = useState<FixedDeposit[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [bankName, setBankName] = useState('');
  const [principal, setPrincipal] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [maturityDate, setMaturityDate] = useState(new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]);
  const [interestEarned, setInterestEarned] = useState('');
  const [maturityAmount, setMaturityAmount] = useState('');
  const [autoRenewal, setAutoRenewal] = useState(false);
  const [notes, setNotes] = useState('');

  const fetchFDs = async () => {
    try {
      const res = await fetch('/api/fixed-deposits');
      const data = await res.json();
      setFds(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFDs();
  }, []);

  // Auto-calculate interest and maturity when inputs change
  useEffect(() => {
    const p = parseFloat(principal);
    const r = parseFloat(interestRate);
    if (!isNaN(p) && !isNaN(r)) {
      const durationYears = (new Date(maturityDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      if (durationYears > 0) {
        // Simple compound quarterly formula commonly used by banks: A = P(1 + r/400)^(4n)
        const a = p * Math.pow(1 + r / 400, 4 * durationYears);
        const earned = a - p;
        setMaturityAmount(a.toFixed(2));
        setInterestEarned(earned.toFixed(2));
      }
    }
  }, [principal, interestRate, startDate, maturityDate]);

  const handleOpenAddDialog = () => {
    setBankName('');
    setPrincipal('');
    setInterestRate('');
    setStartDate(new Date().toISOString().split('T')[0]);
    setMaturityDate(new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]);
    setInterestEarned('');
    setMaturityAmount('');
    setAutoRenewal(false);
    setNotes('');
    setIsDialogOpen(true);
  };

  const handleCreateFD = () => {
    if (!bankName.trim()) {
      toast.error('Please enter a bank/institution name');
      return;
    }
    if (!principal || parseFloat(principal) <= 0) {
      toast.error('Please enter a valid principal');
      return;
    }
    if (!interestRate || parseFloat(interestRate) <= 0) {
      toast.error('Please enter an interest rate');
      return;
    }

    const payload = {
      bankName,
      principal: parseFloat(principal),
      interestRate: parseFloat(interestRate),
      startDate,
      maturityDate,
      interestEarned: parseFloat(interestEarned || '0'),
      maturityAmount: parseFloat(maturityAmount || '0'),
      autoRenewal,
      notes: notes || null,
    };

    startTransition(async () => {
      try {
        const res = await fetch('/api/fixed-deposits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to create fixed deposit');
        }

        toast.success('Fixed Deposit ledger logged successfully');
        setIsDialogOpen(false);
        fetchFDs();
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || 'Failed to save fixed deposit');
      }
    });
  };

  const totalPrincipal = fds.reduce((sum, f) => sum + f.principal, 0);
  const totalInterest = fds.reduce((sum, f) => sum + f.interestEarned, 0);
  const totalMaturity = fds.reduce((sum, f) => sum + f.maturityAmount, 0);

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
        <PageHeader title="Fixed Deposits" description="Manage secure low-risk term investments and interest accumulation" />
        <Button onClick={handleOpenAddDialog} className="gradient-primary text-white font-semibold">
          <Plus className="mr-1.5 h-4 w-4" />
          Add Deposit
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Seeded Principal"
          value={totalPrincipal}
          prefix="₹"
          icon={<Landmark className="h-4 w-4 text-primary" />}
        />
        <StatCard
          title="Total Interest Earned"
          value={totalInterest}
          prefix="₹"
          icon={<ArrowRight className="h-4 w-4 text-success" />}
        />
        <StatCard
          title="Total Maturity Value"
          value={totalMaturity}
          prefix="₹"
          icon={<Calendar className="h-4 w-4 text-success" />}
        />
      </div>

      <Card className="glass border-border bg-card/60 backdrop-blur-xl">
        <CardHeader>
          <CardTitle>Active Term Ledgers</CardTitle>
          <CardDescription>Chronological overview of compound contracts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {fds.map((fd) => (
              <div key={fd.id} className="flex flex-col md:flex-row justify-between border-b border-border/40 pb-4 last:border-0 last:pb-0 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-base">{fd.bankName}</span>
                    <Badge variant="outline" className="text-[10px] font-mono">{fd.interestRate}% p.a.</Badge>
                    {fd.autoRenewal && <Badge variant="secondary" className="text-[9px]">Auto-Renew</Badge>}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {formatDate(fd.startDate)}</span>
                    <ArrowRight className="h-3 w-3" />
                    <span>Maturity: {formatDate(fd.maturityDate)}</span>
                  </div>
                  {fd.notes && <p className="text-xs text-muted-foreground/80 italic mt-1">Note: {fd.notes}</p>}
                </div>
                <div className="grid grid-cols-3 gap-4 text-right min-w-[300px]">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Principal</p>
                    <p className="text-sm font-semibold">{formatCurrency(fd.principal)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Interest</p>
                    <p className="text-sm font-semibold text-success">+{formatCurrency(fd.interestEarned)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Maturity</p>
                    <p className="text-sm font-bold text-foreground">{formatCurrency(fd.maturityAmount)}</p>
                  </div>
                </div>
              </div>
            ))}
            {fds.length === 0 && (
              <div className="text-center py-10 text-muted-foreground text-sm">
                No Fixed Deposits logged yet. Click "Add Deposit" to start.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add FD Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="form-spacious sm:max-w-[450px] lg:max-w-[580px] lg:p-8 glass border-border bg-card/90 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle>Log Term Deposit</DialogTitle>
            <DialogDescription>
              Provide FD contract specifications to project maturity figures.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Bank Name</Label>
                <Input
                  placeholder="e.g. SBI Bank"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  disabled={isPending}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Interest (% p.a.)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 6.5"
                  step="0.05"
                  value={interestRate}
                  onChange={(e) => setInterestRate(e.target.value)}
                  disabled={isPending}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Principal (₹)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 100000"
                  value={principal}
                  onChange={(e) => setPrincipal(e.target.value)}
                  disabled={isPending}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Auto Renewal</Label>
                <Select value={autoRenewal ? 'YES' : 'NO'} onValueChange={(val: string | null) => setAutoRenewal(val === 'YES')} disabled={isPending}>
                  <SelectTrigger className="bg-background">
                    <SelectValue>
                      {autoRenewal ? 'Enable Auto-Renew' : 'Disable Auto-Renew'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NO">Disable Auto-Renew</SelectItem>
                    <SelectItem value="YES">Enable Auto-Renew</SelectItem>
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
                <Label className="label-uppercase text-muted-foreground">Maturity Date</Label>
                <Input
                  type="date"
                  value={maturityDate}
                  onChange={(e) => setMaturityDate(e.target.value)}
                  disabled={isPending}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Projected Interest (₹)</Label>
                <Input
                  type="number"
                  readOnly
                  className="bg-muted/55 cursor-not-allowed"
                  value={interestEarned}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Maturity Value (₹)</Label>
                <Input
                  type="number"
                  readOnly
                  className="bg-muted/55 cursor-not-allowed"
                  value={maturityAmount}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="label-uppercase text-muted-foreground">Notes</Label>
              <Input
                placeholder="Write any account details or branch location..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isPending}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)} disabled={isPending}>Cancel</Button>
            <Button onClick={handleCreateFD} disabled={isPending} className="gradient-primary text-white font-semibold">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Log Contract'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
