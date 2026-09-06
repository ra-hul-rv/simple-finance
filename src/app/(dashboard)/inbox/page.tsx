'use client';

import { useEffect, useState, useTransition, useMemo } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Loader2,
  MessageSquare,
  Trash2,
  Check,
  Clock,
  Bot,
  Edit2,
  AlertTriangle,
  Smartphone,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/format';
import { toast } from 'sonner';

interface InboxEvent {
  id: string;
  source: string;
  payload: any;
  status: 'PENDING' | 'PROCESSED' | 'DISMISSED';
  createdAt: string;
}

// Helper: extract the parsed transaction data from any payload shape
function getParsed(event: InboxEvent) {
  return event.payload?.parsed || event.payload || {};
}

export default function InboxPage() {
  const [events, setEvents] = useState<InboxEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const [categories, setCategories] = useState<{ id: string; name: string; type: string }[]>([]);
  const [accounts, setAccounts] = useState<{ id: string; name: string; type: string }[]>([]);

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<InboxEvent | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editType, setEditType] = useState('EXPENSE');
  const [editDate, setEditDate] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editMerchant, setEditMerchant] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editAccountId, setEditAccountId] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');

  // Lookup maps for showing names instead of IDs in the table
  const accountMap = useMemo(() => {
    const m: Record<string, string> = {};
    accounts.forEach(a => { m[a.id] = a.name; });
    return m;
  }, [accounts]);

  const categoryMap = useMemo(() => {
    const m: Record<string, string> = {};
    categories.forEach(c => { m[c.id] = c.name; });
    return m;
  }, [categories]);

  const fetchData = async () => {
    try {
      const [eventsRes, catsRes, accsRes] = await Promise.all([
        fetch('/api/inbox'),
        fetch('/api/categories'),
        fetch('/api/accounts'),
      ]);
      if (eventsRes.ok) setEvents(await eventsRes.json());
      if (catsRes.ok) setCategories((await catsRes.json()).filter((c: any) => c.isActive));
      if (accsRes.ok) setAccounts(await accsRes.json());
    } catch (err) {
      console.error(err);
      toast.error('Failed to load inbox data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ─── Delete ────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/inbox/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Deleted');
        setEvents(prev => prev.filter(e => e.id !== id));
      } else {
        throw new Error();
      }
    } catch {
      toast.error('Failed to delete');
    }
  };

  // ─── Open Edit Dialog ──────────────────────────────────
  const handleOpenEdit = (event: InboxEvent) => {
    const p = getParsed(event);
    setEditingEvent(event);
    setEditAmount(p.amount ? String(p.amount) : '');
    setEditType(p.type || 'EXPENSE');
    setEditDate(p.date ? String(p.date).split('T')[0] : new Date().toISOString().split('T')[0]);
    setEditDescription(p.description || '');
    setEditMerchant(p.merchant || '');
    setEditNotes(p.notes || '');
    setEditAccountId(p.accountId || '');
    setEditCategoryId(p.categoryId || '');
    setEditDialogOpen(true);
  };

  // ─── Save Edit ─────────────────────────────────────────
  const handleSaveEdit = () => {
    if (!editingEvent) return;
    startTransition(async () => {
      try {
        const updatedParsed = {
          ...getParsed(editingEvent),
          amount: parseFloat(editAmount) || 0,
          type: editType,
          date: editDate,
          description: editDescription,
          merchant: editMerchant,
          notes: editNotes,
          accountId: editAccountId || null,
          categoryId: editCategoryId || null,
        };

        // Keep the wrapper structure (rawMessage etc.) if it exists
        const updatedPayload = editingEvent.payload?.parsed
          ? { ...editingEvent.payload, parsed: updatedParsed }
          : updatedParsed;

        const res = await fetch(`/api/inbox/${editingEvent.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payload: updatedPayload }),
        });

        if (!res.ok) throw new Error('Failed to update');

        setEvents(prev =>
          prev.map(e => (e.id === editingEvent.id ? { ...e, payload: updatedPayload } : e))
        );
        setEditDialogOpen(false);
        toast.success('Updated successfully');
      } catch {
        toast.error('Failed to update');
      }
    });
  };

  // ─── Approve / Process ─────────────────────────────────
  const handleApprove = async (event: InboxEvent) => {
    const p = getParsed(event);

    // Check each required field and collect missing ones
    const missing: string[] = [];
    if (!p.amount || p.amount <= 0) missing.push('Amount');
    if (!p.type) missing.push('Type');
    if (!p.description) missing.push('Description');
    if (!p.accountId) missing.push('Account');

    if (missing.length > 0) {
      toast.error(`Missing required fields: ${missing.join(', ')}. Please edit first.`);
      return;
    }

    startTransition(async () => {
      try {
        // 1. Create the real transaction
        const txRes = await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: Number(p.amount),
            type: p.type,
            date: p.date ? new Date(p.date).toISOString() : new Date().toISOString(),
            description: p.description,
            merchant: p.merchant || undefined,
            notes: p.notes || undefined,
            accountId: p.accountId,
            categoryId: p.categoryId || undefined,
          }),
        });

        if (!txRes.ok) {
          const err = await txRes.json();
          throw new Error(err.error || 'Failed to create transaction');
        }

        // 2. Mark as PROCESSED
        await fetch(`/api/inbox/${event.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'PROCESSED' }),
        });

        toast.success('Transaction approved and created!');
        setEvents(prev => prev.filter(e => e.id !== event.id));
      } catch (e: any) {
        console.error('Approve failed:', e);
        toast.error(`Error: ${e.message}`);
      }
    });
  };

  // ─── Render ────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="AI Inbox"
        description="SMS transactions parsed by AI. Review, edit, and approve to add to your transactions."
      />

      {events.length === 0 ? (
        <Card className="border-dashed border-2 bg-card flex flex-col items-center justify-center h-64 text-center">
          <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold text-foreground">Inbox is empty</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            When your SMS forwarder sends transaction alerts, they will appear here parsed by AI for your review.
          </p>
        </Card>
      ) : (
        <Card className="border-border bg-card overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10 text-center">AI</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>SMS</TableHead>
                    <TableHead className="w-[200px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event) => {
                    const p = getParsed(event);
                    const rawMsg = event.payload?.rawMessage;
                    const rawSender = event.payload?.rawSender;

                    // Check what's missing for visual hints
                    const missingAccount = !p.accountId;
                    const missingDescription = !p.description;

                    return (
                      <TableRow key={event.id} className="hover:bg-muted/40 transition-colors">
                        {/* AI icon */}
                        <TableCell className="text-center">
                          <div className="mx-auto w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            {event.source === 'sms_ai' ? (
                              <Smartphone className="h-4 w-4 text-primary" />
                            ) : (
                              <Bot className="h-4 w-4 text-primary" />
                            )}
                          </div>
                        </TableCell>

                        {/* Date */}
                        <TableCell className="font-medium whitespace-nowrap">
                          {p.date ? (
                            formatDate(p.date)
                          ) : (
                            <span className="text-amber-500 italic text-xs flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" /> Missing
                            </span>
                          )}
                          <div className="flex items-center text-[10px] text-muted-foreground mt-1">
                            <Clock className="mr-1 h-3 w-3" />
                            {new Date(event.createdAt).toLocaleDateString()}
                          </div>
                        </TableCell>

                        {/* Description + Merchant */}
                        <TableCell>
                          {missingDescription ? (
                            <span className="text-amber-500 italic text-xs flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" /> Missing
                            </span>
                          ) : (
                            <div className="font-medium">{p.description}</div>
                          )}
                          {p.merchant && (
                            <div className="text-xs text-muted-foreground line-clamp-1">{p.merchant}</div>
                          )}
                        </TableCell>

                        {/* Account */}
                        <TableCell>
                          {p.accountId ? (
                            <Badge variant="outline" className="text-xs">
                              {accountMap[p.accountId] || 'Unknown'}
                            </Badge>
                          ) : (
                            <span className="text-amber-500 italic text-xs flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" /> Missing
                            </span>
                          )}
                        </TableCell>

                        {/* Category */}
                        <TableCell>
                          {p.categoryId ? (
                            <Badge variant="secondary" className="text-xs">
                              {categoryMap[p.categoryId] || 'Unknown'}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs italic">—</span>
                          )}
                        </TableCell>

                        {/* Type */}
                        <TableCell>
                          <Badge
                            variant={p.type === 'INCOME' ? 'default' : 'secondary'}
                            className={
                              p.type === 'INCOME'
                                ? 'bg-emerald-500/15 text-emerald-600'
                                : 'bg-rose-500/15 text-rose-600'
                            }
                          >
                            {p.type || 'EXPENSE'}
                          </Badge>
                        </TableCell>

                        {/* Amount */}
                        <TableCell className="text-right font-bold tabular-nums">
                          {p.amount ? (
                            formatCurrency(p.amount, p.currency || 'INR')
                          ) : (
                            <span className="text-amber-500 italic text-xs">Missing</span>
                          )}
                        </TableCell>

                        {/* Raw SMS snippet */}
                        <TableCell>
                          {rawMsg ? (
                            <div className="max-w-[180px]">
                              <div className="text-[10px] font-semibold text-muted-foreground">{rawSender || '—'}</div>
                              <div className="text-xs text-muted-foreground line-clamp-2">{rawMsg}</div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs italic">—</span>
                          )}
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenEdit(event)}
                              title="Edit"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-rose-500/20 text-rose-500 hover:bg-rose-500/10"
                              onClick={() => handleDelete(event.id)}
                              title="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleApprove(event)}
                              disabled={isPending}
                              title="Approve & create transaction"
                            >
                              <Check className="mr-1 h-3.5 w-3.5" />
                              Approve
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Edit Dialog ─────────────────────────────────── */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Transaction</DialogTitle>
            <DialogDescription>
              Review and correct the AI-parsed details. Fill in any missing required fields before approving.
            </DialogDescription>
          </DialogHeader>

          {/* Show original SMS for reference */}
          {editingEvent?.payload?.rawMessage && (
            <div className="rounded-lg bg-muted/50 border border-border p-3 text-xs">
              <div className="font-semibold text-muted-foreground mb-1">
                Original SMS from {editingEvent.payload.rawSender || 'Unknown'}
              </div>
              <div className="text-foreground">{editingEvent.payload.rawMessage}</div>
            </div>
          )}

          <div className="space-y-4 py-2">
            {/* Amount */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Amount <span className="text-destructive">*</span>
              </Label>
              <Input
                type="number"
                placeholder="0.00"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
              />
            </div>

            {/* Type */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Type <span className="text-destructive">*</span>
              </Label>
              <Select value={editType} onValueChange={setEditType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EXPENSE">Expense</SelectItem>
                  <SelectItem value="INCOME">Income</SelectItem>
                  <SelectItem value="REFUND">Refund</SelectItem>
                  <SelectItem value="TRANSFER">Transfer</SelectItem>
                  <SelectItem value="INVESTMENT">Investment</SelectItem>
                  <SelectItem value="CREDIT_CARD_PAYMENT">Credit Card Payment</SelectItem>
                  <SelectItem value="INTEREST">Interest</SelectItem>
                  <SelectItem value="DIVIDEND">Dividend</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Account */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Account <span className="text-destructive">*</span>
              </Label>
              <Select value={editAccountId} onValueChange={setEditAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Category
              </Label>
              <Select value={editCategoryId} onValueChange={setEditCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Category (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date</Label>
              <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Description <span className="text-destructive">*</span>
              </Label>
              <Input
                placeholder="What was this for?"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            </div>

            {/* Merchant */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Merchant</Label>
              <Input
                placeholder="Store / vendor name"
                value={editMerchant}
                onChange={(e) => setEditMerchant(e.target.value)}
              />
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notes</Label>
              <Textarea
                placeholder="Extra details..."
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
