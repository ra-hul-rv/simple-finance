'use client';

import React, { useEffect, useState, useTransition } from 'react';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, CreditCard, ChevronDown, ChevronRight, CheckCircle2, Clock, Calendar, Users, IndianRupee, Trash2, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency, formatDate } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';

export default function EMIsPage() {
  const [emis, setEmis] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [people, setPeople] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Sorting
  const [sortBy, setSortBy] = useState<'startDate' | 'totalAmount' | 'itemName'>('startDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [expandedEmiId, setExpandedEmiId] = useState<string | null>(null);

  // Payment Dialog States
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [selectedEmiPersonId, setSelectedEmiPersonId] = useState<string | null>(null);
  const [paymentSource, setPaymentSource] = useState<'SELF' | 'FRIEND'>('SELF');
  const [paymentSourceAccountId, setPaymentSourceAccountId] = useState('');

  // Form states
  const [itemName, setItemName] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [totalMonths, setTotalMonths] = useState('');

  const [principalAmount, setPrincipalAmount] = useState('');
  const [interestAmount, setInterestAmount] = useState('');
  const [taxOnInterest, setTaxOnInterest] = useState('');
  const [processingFee, setProcessingFee] = useState('');
  const [taxOnProcessingFee, setTaxOnProcessingFee] = useState('');
  const [billingDate, setBillingDate] = useState('1');

  useEffect(() => {
    if (interestAmount && !isNaN(Number(interestAmount))) {
      setTaxOnInterest((parseFloat(interestAmount) * 0.18).toFixed(2));
    } else {
      setTaxOnInterest('');
    }
  }, [interestAmount]);

  useEffect(() => {
    if (processingFee && !isNaN(Number(processingFee))) {
      setTaxOnProcessingFee((parseFloat(processingFee) * 0.18).toFixed(2));
    } else {
      setTaxOnProcessingFee('');
    }
  }, [processingFee]);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [accountId, setAccountId] = useState('');
  const [personId, setPersonId] = useState('');
  const [notes, setNotes] = useState('');

  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [sortBy, sortOrder]);

  const toggleSort = (column: 'startDate' | 'totalAmount' | 'itemName') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const renderSortIcon = (column: 'startDate' | 'totalAmount' | 'itemName') => {
    if (sortBy !== column) return <ArrowUpDown className="ml-1 h-3 w-3 inline opacity-50" />;
    return sortOrder === 'asc' ? <ArrowUp className="ml-1 h-3 w-3 inline" /> : <ArrowDown className="ml-1 h-3 w-3 inline" />;
  };

  const fetchData = async () => {
    try {
      const [emiRes, accRes, pplRes] = await Promise.all([
        fetch(`/api/emis?sortBy=${sortBy}&sortOrder=${sortOrder}`),
        fetch('/api/accounts'),
        fetch('/api/people'),
      ]);
      if (emiRes.ok) setEmis(await emiRes.json());
      if (accRes.ok) setAccounts(await accRes.json());
      if (pplRes.ok) setPeople(await pplRes.json());
    } catch (error) {
      toast.error('Failed to load EMIs');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDialog = () => {
    setItemName('');
    setTotalAmount('');
    setTotalMonths('');

    setPrincipalAmount('');
    setInterestAmount('');
    setTaxOnInterest('');
    setProcessingFee('');
    setTaxOnProcessingFee('');
    setBillingDate('1');
    setStartDate(new Date().toISOString().split('T')[0]);
    setAccountId(accounts[0]?.id || '');
    setPersonId('');
    setNotes('');
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!itemName || !totalAmount || !totalMonths || !principalAmount || !accountId) {
      toast.error('Please fill all required fields');
      return;
    }

    startTransition(async () => {
      try {
        const payload = {
          itemName,
          totalAmount: parseFloat(totalAmount),
          totalMonths: parseInt(totalMonths),
          principalAmount: parseFloat(principalAmount),
          interestAmount: interestAmount ? parseFloat(interestAmount) : null,
          taxOnInterest: taxOnInterest ? parseFloat(taxOnInterest) : null,
          processingFee: processingFee ? parseFloat(processingFee) : null,
          taxOnProcessingFee: taxOnProcessingFee ? parseFloat(taxOnProcessingFee) : null,
          billingDate: parseInt(billingDate),
          startDate: new Date(startDate).toISOString(),
          accountId,
          personId: personId || null,
          notes: notes || null,
        };

        const res = await fetch('/api/emis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) throw new Error(await res.text());

        toast.success('EMI Track created successfully!');
        setIsDialogOpen(false);
        fetchData();
      } catch (error: any) {
        toast.error(error.message || 'Failed to create EMI');
      }
    });
  };

  const handleOpenPaymentDialog = (paymentId: string, personId: string | null) => {
    setSelectedPaymentId(paymentId);
    setSelectedEmiPersonId(personId);
    setPaymentSource('SELF');
    setPaymentSourceAccountId(accounts.find(a => ['SAVINGS', 'CURRENT', 'CASH', 'OTHER'].includes(a.type))?.id || '');
    setIsPaymentDialogOpen(true);
  };

  const handleMarkPaymentSubmit = async () => {
    if (!selectedPaymentId || !paymentSourceAccountId) return;
    try {
      const res = await fetch(`/api/emis/payments/${selectedPaymentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'PAID',
          paidDate: new Date().toISOString(),
          paymentSource,
          sourceAccountId: paymentSourceAccountId,
        }),
      });

      if (!res.ok) throw new Error('Failed to update payment');
      
      toast.success('Payment marked as paid');
      setIsPaymentDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to record payment');
    }
  };

  const handleRevertPayment = async (paymentId: string) => {
    try {
      const res = await fetch(`/api/emis/payments/${paymentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PENDING' }),
      });

      if (!res.ok) throw new Error('Failed to revert payment');
      
      toast.success('Reverted to pending');
      fetchData();
    } catch (error) {
      toast.error('Failed to revert payment status');
    }
  };

  const handleDeleteEmi = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/emis/${deleteId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('EMI deleted');
      setDeleteId(null);
      fetchData();
    } catch (error) {
      toast.error('Failed to delete EMI');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader 
          title="EMI Tracker" 
          description="Track your EMIs, splits, taxes, and friends' EMIs"
        />
        <Button onClick={handleOpenDialog} className="rounded-xl shadow-sm">
          <Plus className="mr-2 h-4 w-4" /> Add EMI
        </Button>
      </div>

      <Card className="rounded-2xl border-border/60 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-10"></TableHead>
                <TableHead 
                  className="cursor-pointer select-none"
                  onClick={() => toggleSort('itemName')}
                >
                  Item Name {renderSortIcon('itemName')}
                </TableHead>
                <TableHead>Card/Account</TableHead>
                <TableHead>Friend/Person</TableHead>
                <TableHead 
                  className="cursor-pointer select-none"
                  onClick={() => toggleSort('totalAmount')}
                >
                  Total Amt {renderSortIcon('totalAmount')}
                </TableHead>
                <TableHead>Progress</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {emis.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-16 text-muted-foreground border-0">
                    No EMIs found. Add one to start tracking.
                  </TableCell>
                </TableRow>
              ) : (
                emis.map((emi) => (
                  <React.Fragment key={emi.id}>
                    <TableRow 
                      className="cursor-pointer hover:bg-muted/30 transition-colors border-border/40"
                      onClick={() => setExpandedEmiId(expandedEmiId === emi.id ? null : emi.id)}
                    >
                      <TableCell className="pl-4">
                        {expandedEmiId === emi.id ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell className="font-semibold">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <CreditCard className="h-4 w-4 text-primary" />
                          </div>
                          {emi.itemName}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{emi.account?.name}</TableCell>
                      <TableCell>
                        {emi.person ? (
                          <Badge variant="secondary" className="bg-orange-500/10 text-orange-600 border-orange-500/20">
                            {emi.person.name}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground/50 text-sm">Self</span>
                        )}
                      </TableCell>
                      <TableCell className="font-bold tabular-nums">
                        {formatCurrency(emi.totalAmount, 'INR')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden w-24">
                            <div 
                              className="h-full bg-primary transition-all" 
                              style={{ width: `${(emi.monthsPaid / emi.totalMonths) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {emi.monthsPaid} / {emi.totalMonths}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteId(emi.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>

                    {/* Expandable Row for Schedule */}
                    {expandedEmiId === emi.id && (
                      <TableRow className="bg-muted/10 border-border/40 hover:bg-muted/10">
                        <TableCell colSpan={7} className="p-0 border-0">
                          <div className="p-6 pt-4 animate-in fade-in slide-in-from-top-2">
                            <div className="flex items-start gap-12 mb-6 text-sm">
                              <div className="space-y-1">
                                <span className="text-muted-foreground text-xs uppercase font-bold">Monthly Principal</span>
                                <p className="font-semibold">{formatCurrency(emi.principalAmount, 'INR')}</p>
                              </div>
                              <div className="space-y-1">
                                <span className="text-muted-foreground text-xs uppercase font-bold">Monthly Installment</span>
                                <p className="font-semibold">{formatCurrency((emi.principalAmount + (emi.interestAmount || 0) + (emi.taxOnInterest || 0)), 'INR')}</p>
                              </div>
                              <div className="space-y-1">
                                <span className="text-muted-foreground text-xs uppercase font-bold">Bill Date</span>
                                <p className="font-semibold">Day {emi.billingDate}</p>
                              </div>
                              {emi.interestAmount > 0 && (
                                <div className="space-y-1">
                                  <span className="text-muted-foreground text-xs uppercase font-bold">Monthly Interest</span>
                                  <p className="font-semibold">{formatCurrency(emi.interestAmount, 'INR')}</p>
                                </div>
                              )}
                              {emi.taxOnInterest > 0 && (
                                <div className="space-y-1">
                                  <span className="text-muted-foreground text-xs uppercase font-bold">Monthly Tax on Int.</span>
                                  <p className="font-semibold">{formatCurrency(emi.taxOnInterest, 'INR')}</p>
                                </div>
                              )}
                              {emi.processingFee > 0 && (
                                <div className="space-y-1">
                                  <span className="text-muted-foreground text-xs uppercase font-bold">Processing Fee</span>
                                  <p className="font-semibold">{formatCurrency(emi.processingFee, 'INR')}</p>
                                </div>
                              )}
                              {emi.taxOnProcessingFee > 0 && (
                                <div className="space-y-1">
                                  <span className="text-muted-foreground text-xs uppercase font-bold">Tax on Proc. Fee</span>
                                  <p className="font-semibold">{formatCurrency(emi.taxOnProcessingFee, 'INR')}</p>
                                </div>
                              )}
                            </div>
                            
                            <div className="border border-border/40 rounded-xl overflow-hidden bg-background shadow-sm">
                              <Table>
                                <TableHeader className="bg-muted/20">
                                  <TableRow>
                                    <TableHead className="w-16 text-center">Month</TableHead>
                                    <TableHead>Due Date</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {emi.payments?.map((payment: any) => (
                                    <TableRow key={payment.id} className={payment.status === 'PAID' ? 'bg-success/5' : ''}>
                                      <TableCell className="text-center font-medium">#{payment.monthNumber}</TableCell>
                                      <TableCell className="text-muted-foreground">
                                        {formatDate(payment.dueDate, 'dd MMM yyyy')}
                                      </TableCell>
                                      <TableCell className="font-bold tabular-nums">
                                        {formatCurrency(payment.amount, 'INR')}
                                        {payment.isFirstMonth && (emi.firstTimeFee > 0 || emi.processingFee > 0 || emi.taxOnProcessingFee > 0) && (
                                          <span className="text-[10px] text-muted-foreground ml-2">(incl. fee)</span>
                                        )}
                                      </TableCell>
                                      <TableCell>
                                        {payment.status === 'PAID' ? (
                                          <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                                            Paid {payment.paidDate && formatDate(payment.paidDate, 'dd MMM')}
                                          </Badge>
                                        ) : (
                                          <Badge variant="outline" className="text-muted-foreground">
                                            Pending
                                          </Badge>
                                        )}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        {payment.status === 'PENDING' ? (
                                          <Button 
                                            size="sm" 
                                            variant="secondary"
                                            className="h-8 text-xs font-semibold"
                                            onClick={() => handleOpenPaymentDialog(payment.id, emi.personId)}
                                          >
                                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Mark Paid
                                          </Button>
                                        ) : (
                                          <Button 
                                            size="sm" 
                                            variant="ghost"
                                            className="h-8 text-xs text-muted-foreground"
                                            onClick={() => handleRevertPayment(payment.id)}
                                          >
                                            Revert
                                          </Button>
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="form-spacious sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Add New EMI</DialogTitle>
            <DialogDescription>Enter the details of the EMI including taxes and splits.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="label-uppercase text-muted-foreground">Item Name *</Label>
              <Input 
                value={itemName} 
                onChange={e => setItemName(e.target.value)} 
                placeholder="iPhone 15, Laptop..." 
                className="h-11 bg-background/50"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Total Purchase Amt *</Label>
                <Input 
                  type="number" 
                  value={totalAmount} 
                  onChange={e => setTotalAmount(e.target.value)} 
                  placeholder="0.00" 
                  className="h-11 bg-background/50"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Total Months (Tenure) *</Label>
                <Input 
                  type="number" 
                  value={totalMonths} 
                  onChange={e => setTotalMonths(e.target.value)} 
                  placeholder="e.g. 6" 
                  className="h-11 bg-background/50"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 p-4 rounded-xl border border-primary/20 bg-primary/5">
              <div className="col-span-2 text-xs font-semibold uppercase text-muted-foreground mb-1">EMI Breakdown</div>
              
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground text-[10px]">Monthly Principal *</Label>
                <Input 
                  type="number" 
                  value={principalAmount} 
                  onChange={e => setPrincipalAmount(e.target.value)} 
                  placeholder="0.00" 
                  className="h-10 text-sm bg-background/80"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground text-[10px]">Monthly Interest (Opt)</Label>
                <Input 
                  type="number" 
                  value={interestAmount} 
                  onChange={e => setInterestAmount(e.target.value)} 
                  placeholder="0.00" 
                  className="h-10 text-sm bg-background/50"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground text-[10px]">Monthly Tax on Int. 18% (Opt)</Label>
                <Input 
                  type="number" 
                  value={taxOnInterest} 
                  onChange={e => setTaxOnInterest(e.target.value)} 
                  placeholder="Auto-calculated" 
                  className="h-10 text-sm bg-background/50"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground text-[10px]">Processing Fee 1st mo (Opt)</Label>
                <Input 
                  type="number" 
                  value={processingFee} 
                  onChange={e => setProcessingFee(e.target.value)} 
                  placeholder="0.00" 
                  className="h-10 text-sm bg-background/50"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground text-[10px]">Tax on Proc. Fee 18% (Opt)</Label>
                <Input 
                  type="number" 
                  value={taxOnProcessingFee} 
                  onChange={e => setTaxOnProcessingFee(e.target.value)} 
                  placeholder="Auto-calculated" 
                  className="h-10 text-sm bg-background/50"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground text-[10px]">Billing Date (1-31) *</Label>
                <Input 
                  type="number" 
                  value={billingDate} 
                  onChange={e => setBillingDate(e.target.value)} 
                  min="1" max="31"
                  className="h-10 text-sm bg-background/50"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground text-[10px]">Start Date *</Label>
                <Input 
                  type="date" 
                  value={startDate} 
                  onChange={e => setStartDate(e.target.value)} 
                  className="h-10 text-sm bg-background/50"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Account/Card *</Label>
                <Select value={accountId} onValueChange={setAccountId}>
                  <SelectTrigger className="h-11 bg-background/50">
                    <SelectValue placeholder="Select Account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map(acc => (
                      <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" /> Person (If for friend)
                </Label>
                <Select value={personId || "none"} onValueChange={(val: any) => setPersonId(val === 'none' ? '' : val)}>
                  <SelectTrigger className="h-11 bg-background/50">
                    <SelectValue placeholder="Self" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Self</SelectItem>
                    {people.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-1.5">
              <Label className="label-uppercase text-muted-foreground">Notes</Label>
              <Input 
                value={notes} 
                onChange={e => setNotes(e.target.value)} 
                placeholder="Order ID, reasons, etc." 
                className="h-11 bg-background/50"
              />
            </div>
          </div>

          <DialogFooter className="border-t border-border/30 pt-4 mt-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl h-11">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isPending} className="rounded-xl h-11 shadow-md px-6">
              Create EMI
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Mark Payment as Paid</DialogTitle>
            <DialogDescription>
              How was this EMI payment funded? This will automatically update your ledger balances.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-6 py-4">
            <div className="space-y-4">
              <Label>Payment Source</Label>
              <div className="grid grid-cols-2 gap-4">
                <Button 
                  type="button"
                  variant={paymentSource === 'SELF' ? 'default' : 'outline'}
                  onClick={() => setPaymentSource('SELF')}
                >
                  Self Transfer
                </Button>
                {selectedEmiPersonId ? (
                  <Button 
                    type="button"
                    variant={paymentSource === 'FRIEND' ? 'default' : 'outline'}
                    onClick={() => setPaymentSource('FRIEND')}
                  >
                    Paid by Friend
                  </Button>
                ) : (
                  <Button type="button" variant="outline" disabled className="opacity-50">
                    Paid by Friend
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>{paymentSource === 'SELF' ? 'Source Bank Account' : 'Receiving Bank Account'}</Label>
              <Select value={paymentSourceAccountId} onValueChange={setPaymentSourceAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.filter(a => ['SAVINGS', 'CURRENT', 'CASH', 'OTHER'].includes(a.type)).map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name} ({account.currency === 'INR' ? '₹' : '$'}{account.balance})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleMarkPaymentSubmit}>Confirm Payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDeleteEmi}
        title="Delete EMI"
        description="Are you sure you want to delete this EMI tracker? Payments marked as paid will also be deleted from this view (actual ledger transactions are safe)."
        confirmLabel="Delete EMI"
        variant="destructive"
      />
    </div>
  );
}
