'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
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
import { Loader2, Mail, XCircle, Check, Clock, Bot, Edit2 } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/format';
import { toast } from 'sonner';

interface InboxEvent {
  id: string;
  source: string;
  payload: any;
  status: 'PENDING' | 'PROCESSED' | 'DISMISSED';
  createdAt: string;
}

export default function InboxPage() {
  const [events, setEvents] = useState<InboxEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<InboxEvent | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editType, setEditType] = useState('EXPENSE');
  const [editDate, setEditDate] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editMerchant, setEditMerchant] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const fetchEvents = async () => {
    try {
      const res = await fetch('/api/inbox');
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load inbox events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleDismiss = async (id: string) => {
    try {
      const res = await fetch(`/api/inbox/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'DISMISSED' })
      });
      if (res.ok) {
        toast.success('Event dismissed');
        setEvents(events.filter(e => e.id !== id));
      } else {
        throw new Error('Failed to dismiss');
      }
    } catch (err) {
      toast.error('Failed to dismiss event');
    }
  };

  const handleOpenEdit = (event: InboxEvent) => {
    const p = event.payload;
    setEditingEvent(event);
    setEditAmount(p.amount ? String(p.amount) : '');
    setEditType(p.type || 'EXPENSE');
    setEditDate(p.date || new Date().toISOString().split('T')[0]);
    setEditDescription(p.description || '');
    setEditMerchant(p.merchant || '');
    setEditNotes(p.notes || '');
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingEvent) return;
    startTransition(async () => {
      try {
        const updatedPayload = {
          ...editingEvent.payload,
          amount: parseFloat(editAmount) || 0,
          type: editType,
          date: editDate,
          description: editDescription,
          merchant: editMerchant,
          notes: editNotes,
        };

        const res = await fetch(`/api/inbox/${editingEvent.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payload: updatedPayload })
        });

        if (!res.ok) throw new Error('Failed to update');

        // Update local state
        setEvents(prev => prev.map(e =>
          e.id === editingEvent.id
            ? { ...e, payload: updatedPayload }
            : e
        ));
        setEditDialogOpen(false);
        toast.success('Event updated successfully');
      } catch (err) {
        toast.error('Failed to update event');
      }
    });
  };

  const handleProcess = async (event: InboxEvent) => {
    const p = event.payload;
    
    // Map payload to our draft format
    const draft = {
      amount: p.amount ? String(p.amount) : '',
      txType: p.type || 'EXPENSE',
      date: p.date || new Date().toISOString().split('T')[0],
      description: p.description || '',
      merchant: p.merchant || '',
      notes: (p.notes || '') + (p.extra_info ? `\n\n--- Extra Details ---\n${JSON.stringify(p.extra_info, null, 2)}` : ''),
    };

    // Save to draft and redirect
    localStorage.setItem('sf_draft_transaction', JSON.stringify(draft));
    
    // Mark as processed in the background
    try {
      await fetch(`/api/inbox/${event.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PROCESSED' })
      });
    } catch (e) {
      console.error('Failed to mark processed', e);
    }

    toast.success('Draft loaded. Please verify and save.');
    router.push('/transactions?action=new');
  };

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
        description="Review transactions extracted by AI from your emails (n8n integration)" 
      />

      {events.length === 0 ? (
        <Card className="glass border-dashed border-2 bg-background/50 flex flex-col items-center justify-center h-64 text-center">
          <Mail className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold text-foreground">Inbox is empty</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            When your n8n AI extracts transactions from emails, they will appear here for your review.
          </p>
        </Card>
      ) : (
        <Card className="glass border-border/50 bg-card/60 backdrop-blur-xl overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-background/50">
                  <TableRow>
                    <TableHead className="w-10 text-center">AI</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="w-[250px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event) => {
                    const p = event.payload;
                    return (
                      <TableRow key={event.id} className="hover:bg-muted/40 transition-colors">
                        <TableCell className="text-center">
                          <div className="mx-auto w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Bot className="h-4 w-4 text-primary" />
                          </div>
                        </TableCell>
                        <TableCell className="font-medium whitespace-nowrap">
                          {p.date ? formatDate(p.date) : <span className="text-muted-foreground italic">Missing Date</span>}
                          <div className="flex items-center text-[10px] text-muted-foreground mt-1">
                            <Clock className="mr-1 h-3 w-3" />
                            {new Date(event.createdAt).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{p.merchant || p.description || 'Unknown'}</div>
                          {p.merchant && p.description && (
                            <div className="text-xs text-muted-foreground line-clamp-1">{p.description}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-xs text-muted-foreground max-w-[200px] line-clamp-2">
                            {p.notes || <span className="italic opacity-50">No additional notes</span>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={p.type === 'INCOME' ? 'default' : 'secondary'} className={p.type === 'INCOME' ? 'bg-emerald-500/15 text-emerald-600' : 'bg-rose-500/15 text-rose-600'}>
                            {p.type || 'EXPENSE'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {p.amount ? formatCurrency(p.amount, 'INR') : <span className="text-muted-foreground font-normal">Unknown</span>}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleOpenEdit(event)}
                            >
                              <Edit2 className="mr-1.5 h-3.5 w-3.5" />
                              Edit
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="border-rose-500/20 text-rose-500 hover:bg-rose-500/10"
                              onClick={() => handleDismiss(event.id)}
                            >
                              <XCircle className="mr-1.5 h-3.5 w-3.5" />
                              Dismiss
                            </Button>
                            <Button 
                              size="sm" 
                              className="gradient-primary text-white"
                              onClick={() => handleProcess(event)}
                            >
                              <Check className="mr-1.5 h-3.5 w-3.5" />
                              Process
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

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="form-spacious sm:max-w-[500px] max-h-[90vh] overflow-y-auto scrollbar-thin">
          <DialogHeader>
            <DialogTitle>Edit AI Transaction</DialogTitle>
            <DialogDescription>Review and correct the AI-extracted details before processing.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Amount */}
            <div className="space-y-1.5">
              <Label className="label-uppercase text-muted-foreground">Amount</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
              />
            </div>

            {/* Type */}
            <div className="space-y-1.5">
              <Label className="label-uppercase text-muted-foreground">Type</Label>
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
                  <SelectItem value="INTEREST">Interest</SelectItem>
                  <SelectItem value="DIVIDEND">Dividend</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date */}
            <div className="space-y-1.5">
              <Label className="label-uppercase text-muted-foreground">Date</Label>
              <Input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="label-uppercase text-muted-foreground">Description</Label>
              <Input
                placeholder="What was this for?"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            </div>

            {/* Merchant */}
            <div className="space-y-1.5">
              <Label className="label-uppercase text-muted-foreground">Merchant</Label>
              <Input
                placeholder="Store / vendor name"
                value={editMerchant}
                onChange={(e) => setEditMerchant(e.target.value)}
              />
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label className="label-uppercase text-muted-foreground">Notes</Label>
              <Textarea
                placeholder="Extra details..."
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={isPending} className="gradient-primary text-white">
              {isPending ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />Saving...</> : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
