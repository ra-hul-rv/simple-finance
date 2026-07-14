'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Mail, CheckCircle2, XCircle, ArrowRight, Clock } from 'lucide-react';
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
      // If we don't have accountId/categoryId, it will fall back to defaults in the form
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => {
            const p = event.payload;
            return (
              <Card key={event.id} className="glass border-border/50 bg-card/60 backdrop-blur-xl hover:border-primary/30 transition-all">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <Badge variant={p.type === 'INCOME' ? 'default' : 'secondary'} className={p.type === 'INCOME' ? 'bg-emerald-500/15 text-emerald-600' : 'bg-rose-500/15 text-rose-600'}>
                      {p.type || 'EXPENSE'}
                    </Badge>
                    <span className="flex items-center text-[10px] text-muted-foreground font-medium">
                      <Clock className="mr-1 h-3 w-3" />
                      {new Date(event.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <CardTitle className="text-2xl mt-2 font-bold tracking-tight">
                    {p.amount ? formatCurrency(p.amount, 'INR') : 'Unknown Amount'}
                  </CardTitle>
                  <CardDescription className="text-sm font-medium text-foreground">
                    {p.merchant || p.description || 'No description provided'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground space-y-1.5 pb-4">
                  {p.date && (
                    <div className="flex justify-between">
                      <span className="font-semibold">Date:</span>
                      <span>{formatDate(p.date, 'dd/MM/yyyy')}</span>
                    </div>
                  )}
                  {p.notes && (
                    <div className="mt-2 pt-2 border-t border-border/40 line-clamp-2 italic">
                      "{p.notes}"
                    </div>
                  )}
                  {p.extra_info && (
                    <div className="mt-2 pt-2 border-t border-border/40 font-mono text-[10px] text-primary/70 break-all">
                      Additional Info: {JSON.stringify(p.extra_info)}
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex gap-2 pt-3 border-t border-border/20">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 border-rose-500/20 text-rose-500 hover:bg-rose-500/10"
                    onClick={() => handleDismiss(event.id)}
                  >
                    <XCircle className="mr-1.5 h-4 w-4" />
                    Dismiss
                  </Button>
                  <Button 
                    size="sm" 
                    className="flex-1 gradient-primary text-white"
                    onClick={() => handleProcess(event)}
                  >
                    Process
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
