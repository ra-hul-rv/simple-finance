'use client';

import { useEffect, useState, useTransition, useMemo } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
  Upload,
  FileText,
  Calendar,
  ShieldCheck,
  CheckCheck,
  RefreshCw,
  FileSpreadsheet,
  Lock,
  Sparkles,
  Server,
  Cloud,
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

  // Import Statement Dialog State
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importTab, setImportTab] = useState<'paste' | 'upload'>('paste');
  const [importRawText, setImportRawText] = useState('');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importAccountId, setImportAccountId] = useState<string>('none');
  const [importStartDate, setImportStartDate] = useState('');
  const [importEndDate, setImportEndDate] = useState('');
  const [importPassword, setImportPassword] = useState('');
  const [importSanitizePii, setImportSanitizePii] = useState(true);
  const [isImporting, setIsImporting] = useState(false);

  // Active AI Engine Provider State (persisted in DB UserSettings)
  const [aiProvider, setAiProvider] = useState<'local' | 'nvidia'>('local');

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
      const [eventsRes, catsRes, accsRes, settingsRes] = await Promise.all([
        fetch('/api/inbox'),
        fetch('/api/categories'),
        fetch('/api/accounts'),
        fetch('/api/settings'),
      ]);
      if (eventsRes.ok) setEvents(await eventsRes.json());
      if (catsRes.ok) setCategories((await catsRes.json()).filter((c: any) => c.isActive));
      if (accsRes.ok) setAccounts(await accsRes.json());
      if (settingsRes.ok) {
        const s = await settingsRes.json();
        if (s.aiProvider === 'nvidia' || s.aiProvider === 'local') {
          setAiProvider(s.aiProvider);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load inbox data');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAiProvider = async (newProvider: 'local' | 'nvidia') => {
    setAiProvider(newProvider);
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aiProvider: newProvider }),
      });
      if (res.ok) {
        toast.success(
          newProvider === 'local'
            ? 'Active Engine: Local Ollama (Qwen 2.5 3B)'
            : 'Active Engine: Nvidia Cloud (Llama 3.2 11B)'
        );
      }
    } catch (err) {
      console.error('Failed to update AI provider:', err);
      toast.error('Failed to save AI engine preference');
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

  // ─── Batch Delete All ──────────────────────────────────
  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to clear all pending inbox items?')) return;
    try {
      await Promise.all(events.map(e => fetch(`/api/inbox/${e.id}`, { method: 'DELETE' })));
      toast.success('Inbox cleared');
      setEvents([]);
    } catch {
      toast.error('Failed to clear some items');
      fetchData();
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

  // ─── Approve Single ────────────────────────────────────
  const handleApprove = async (event: InboxEvent) => {
    const p = getParsed(event);

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

  // ─── Batch Approve All Valid ───────────────────────────
  const handleApproveAll = async () => {
    const validEvents = events.filter(event => {
      const p = getParsed(event);
      return p.amount && p.amount > 0 && p.type && p.description && p.accountId;
    });

    if (validEvents.length === 0) {
      toast.error('No events have all required fields (Amount, Type, Description, Account) filled.');
      return;
    }

    startTransition(async () => {
      let approvedCount = 0;
      for (const event of validEvents) {
        const p = getParsed(event);
        try {
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

          if (txRes.ok) {
            await fetch(`/api/inbox/${event.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'PROCESSED' }),
            });
            approvedCount++;
          }
        } catch (err) {
          console.error('Batch approve error:', err);
        }
      }

      toast.success(`Successfully approved ${approvedCount} transactions!`);
      fetchData();
    });
  };

  // ─── Submit Statement Import ───────────────────────────
  const handleImportSubmit = async () => {
    if (importTab === 'paste' && !importRawText.trim()) {
      toast.error('Please paste transaction text into the text area.');
      return;
    }
    if (importTab === 'upload' && !importFile) {
      toast.error('Please select a PDF, CSV, or TXT file to upload.');
      return;
    }

    setIsImporting(true);
    try {
      let res: Response;

      if (importTab === 'upload' && importFile) {
        const formData = new FormData();
        formData.append('file', importFile);
        if (importAccountId !== 'none') formData.append('accountId', importAccountId);
        if (importStartDate) formData.append('startDate', importStartDate);
        if (importEndDate) formData.append('endDate', importEndDate);
        if (importPassword) formData.append('password', importPassword);
        formData.append('sanitizePii', String(importSanitizePii));

        res = await fetch('/api/inbox/upload-statement', {
          method: 'POST',
          body: formData,
        });
      } else {
        res = await fetch('/api/inbox/upload-statement', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rawText: importRawText,
            accountId: importAccountId !== 'none' ? importAccountId : null,
            startDate: importStartDate || null,
            endDate: importEndDate || null,
            sanitizePii: importSanitizePii,
          }),
        });
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to import transactions');
      }

      if (data.count === 0) {
        toast.info(data.message || 'No transactions matched the criteria.');
      } else {
        toast.success(`Extracted ${data.count} transactions to AI Inbox!`);
        setIsImportOpen(false);
        setImportRawText('');
        setImportFile(null);
        setImportPassword('');
        fetchData();
      }
    } catch (err: any) {
      toast.error(err.message || 'Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  // ─── Render ────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const validPendingCount = events.filter(e => {
    const p = getParsed(e);
    return p.amount && p.amount > 0 && p.type && p.description && p.accountId;
  }).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="AI Inbox"
        description="Transactions parsed by AI from SMS or bank statements. Review, edit, and approve."
      >
        <div className="flex flex-wrap items-center gap-2">
          {/* AI Engine Switcher */}
          <div className="inline-flex items-center p-1 bg-muted/70 rounded-xl border border-border text-xs">
            <button
              type="button"
              onClick={() => handleToggleAiProvider('local')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                aiProvider === 'local'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Use Local Ollama (Qwen 2.5 3B) running on Proxmox"
            >
              <Server className={`h-3.5 w-3.5 ${aiProvider === 'local' ? 'text-emerald-500' : ''}`} />
              <span>Local Ollama</span>
              {aiProvider === 'local' && (
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </button>
            <button
              type="button"
              onClick={() => handleToggleAiProvider('nvidia')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                aiProvider === 'nvidia'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Use Nvidia Cloud (Llama 3.2 11B)"
            >
              <Cloud className={`h-3.5 w-3.5 ${aiProvider === 'nvidia' ? 'text-blue-500' : ''}`} />
              <span>Nvidia Cloud</span>
              {aiProvider === 'nvidia' && (
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
              )}
            </button>
          </div>

          <Button onClick={fetchData} variant="outline" size="sm" className="gap-1.5 h-9">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
          <Button
            onClick={() => setIsImportOpen(true)}
            size="sm"
            className="gap-1.5 h-9 shadow-sm"
          >
            <Upload className="h-3.5 w-3.5" />
            Import Statement
          </Button>
        </div>
      </PageHeader>

      {events.length === 0 ? (
        <Card className="border-dashed border-2 bg-card flex flex-col items-center justify-center h-64 text-center p-6">
          <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold text-foreground">Inbox is empty</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md">
            Incoming transactions forwarded from SMS or imported from bank statements will appear here parsed by AI for your review.
          </p>
          <Button
            onClick={() => setIsImportOpen(true)}
            variant="outline"
            size="sm"
            className="mt-4 gap-1.5"
          >
            <Upload className="h-4 w-4" />
            Import Bank Statement or Text
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {/* Action and Batch Header Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-muted/30 p-3 rounded-xl border border-border">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="font-mono text-xs">
                {events.length} Pending
              </Badge>
              {validPendingCount > 0 && (
                <span className="text-xs text-muted-foreground">
                  ({validPendingCount} ready to approve)
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {validPendingCount > 0 && (
                <Button
                  size="sm"
                  onClick={handleApproveAll}
                  disabled={isPending}
                  className="h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Approve All Valid ({validPendingCount})
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAll}
                className="h-8 gap-1.5 text-rose-500 hover:bg-rose-500/10 border-rose-500/20"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear All
              </Button>
            </div>
          </div>

          <Card className="border-border bg-card overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10 text-center">Source</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Raw Detail</TableHead>
                      <TableHead className="w-[200px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.map((event) => {
                      const p = getParsed(event);
                      const rawMsg = event.payload?.rawMessage;
                      const isStatement = event.source === 'statement_import';

                      const missingAccount = !p.accountId;
                      const missingDescription = !p.description;

                      return (
                        <TableRow key={event.id} className="hover:bg-muted/40 transition-colors">
                          {/* Source icon */}
                          <TableCell className="text-center">
                            <div
                              className={`mx-auto w-8 h-8 rounded-full flex items-center justify-center ${
                                isStatement
                                  ? 'bg-blue-500/10 text-blue-500'
                                  : 'bg-primary/10 text-primary'
                              }`}
                              title={isStatement ? 'Imported from Statement' : 'Forwarded from SMS'}
                            >
                              {isStatement ? (
                                <FileText className="h-4 w-4" />
                              ) : (
                                <Smartphone className="h-4 w-4" />
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

                          {/* Raw details snippet */}
                          <TableCell>
                            {rawMsg ? (
                              <div className="max-w-[200px]">
                                <div className="text-[10px] font-semibold text-muted-foreground">
                                  {isStatement ? 'Statement Row' : event.payload?.rawSender || 'SMS'}
                                </div>
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
        </div>
      )}

      {/* ─── Import Statement Dialog ────────────────────── */}
      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogContent className="sm:max-w-[620px] max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              Import Statement / Transactions
            </DialogTitle>
            <DialogDescription>
              Upload a bank statement PDF/CSV or paste transaction rows directly. AI will extract each transaction into your inbox.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Active AI Engine Banner */}
            <div className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-border/80 bg-muted/40 text-xs">
              <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                <Bot className="h-4 w-4 text-primary" />
                Active AI Engine:
              </span>
              <div className="flex items-center gap-2">
                {aiProvider === 'local' ? (
                  <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-500">
                    <Server className="h-3.5 w-3.5" />
                    Local Ollama (Qwen 2.5 3B)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 font-semibold text-blue-500">
                    <Cloud className="h-3.5 w-3.5" />
                    Nvidia Cloud (Llama 3.2 11B)
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => handleToggleAiProvider(aiProvider === 'local' ? 'nvidia' : 'local')}
                  className="text-[11px] underline text-muted-foreground hover:text-foreground transition-colors ml-1"
                >
                  Switch
                </button>
              </div>
            </div>

            {/* Input Mode Tabs */}
            <Tabs value={importTab} onValueChange={(val: any) => setImportTab(val)} className="w-full">
              <TabsList className="grid grid-cols-2 w-full h-10 mb-3">
                <TabsTrigger value="paste" className="text-xs font-semibold gap-1.5">
                  <FileText className="h-4 w-4" />
                  Paste Text (Fastest)
                </TabsTrigger>
                <TabsTrigger value="upload" className="text-xs font-semibold gap-1.5">
                  <Upload className="h-4 w-4" />
                  Upload File (PDF / CSV)
                </TabsTrigger>
              </TabsList>

              <TabsContent value="paste" className="space-y-2 mt-0">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Paste Statement / Transaction Text
                </Label>
                <Textarea
                  rows={6}
                  placeholder="Paste transaction text directly from internet banking, email, or a statement...&#10;&#10;e.g.&#10;12/08/2026 SWIGGY BANGALORE -450.00&#10;14/08/2026 SALARY CREDIT +75000.00&#10;15/08/2026 AMAZON PAY INDIA -1299.00"
                  value={importRawText}
                  onChange={(e) => setImportRawText(e.target.value)}
                  className="font-mono text-xs"
                />
                <p className="text-[11px] text-muted-foreground">
                  You can copy and paste rows straight from your SBI, HDFC, or card netbanking statement table.
                </p>
              </TabsContent>

              <TabsContent value="upload" className="space-y-3 mt-0">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Select Statement File (PDF, Excel, CSV, TXT)
                  </Label>
                  <Input
                    type="file"
                    accept=".pdf,.csv,.txt,.xlsx,.xls"
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                    className="cursor-pointer text-xs"
                  />
                </div>

                {/* Password field for encrypted PDFs */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5" />
                    PDF Password (if protected)
                  </Label>
                  <Input
                    type="password"
                    placeholder="e.g. DOB + last 4 mobile digits for SBI"
                    value={importPassword}
                    onChange={(e) => setImportPassword(e.target.value)}
                    className="text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Only required if the PDF is password-locked. Decrypted locally on your server.
                  </p>
                </div>
              </TabsContent>
            </Tabs>

            {/* Target Account Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Target Account / Card
              </Label>
              <Select value={importAccountId} onValueChange={setImportAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Account (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Auto-determine account</SelectItem>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name} ({acc.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Range Filtering */}
            <div className="space-y-1.5 p-3 rounded-xl border border-border bg-muted/20">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-primary" />
                Date Range Filter (Optional)
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground">From Date</span>
                  <Input
                    type="date"
                    value={importStartDate}
                    onChange={(e) => setImportStartDate(e.target.value)}
                    className="text-xs h-9"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground">To Date</span>
                  <Input
                    type="date"
                    value={importEndDate}
                    onChange={(e) => setImportEndDate(e.target.value)}
                    className="text-xs h-9"
                  />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Leave blank to extract all dates found, or specify a window to ignore older transactions.
              </p>
            </div>

            {/* Privacy / PII Redaction toggle */}
            <div className="flex items-start gap-2.5 p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
              <Checkbox
                id="sanitizePii"
                checked={importSanitizePii}
                onCheckedChange={(checked) => setImportSanitizePii(Boolean(checked))}
                className="mt-0.5"
              />
              <div className="text-xs space-y-0.5">
                <label
                  htmlFor="sanitizePii"
                  className="font-semibold text-foreground flex items-center gap-1 cursor-pointer"
                >
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  Redact Sensitive PII (Recommended)
                </label>
                <p className="text-[11px] text-muted-foreground">
                  Automatically scrubs PAN card numbers, full account numbers, phone numbers, and customer addresses locally before processing with AI.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsImportOpen(false)}
              disabled={isImporting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleImportSubmit}
              disabled={isImporting}
              className="gap-1.5"
            >
              {isImporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Extracting Transactions with AI...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Extract to Inbox
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Edit Dialog ─────────────────────────────────── */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Transaction</DialogTitle>
            <DialogDescription>
              Review and correct the AI-parsed details. Fill in any missing required fields before approving.
            </DialogDescription>
          </DialogHeader>

          {/* Show original reference snippet */}
          {editingEvent?.payload?.rawMessage && (
            <div className="rounded-lg bg-muted/50 border border-border p-3 text-xs">
              <div className="font-semibold text-muted-foreground mb-1">
                Reference Data ({editingEvent.payload.rawSender || 'Unknown'})
              </div>
              <div className="text-foreground font-mono">{editingEvent.payload.rawMessage}</div>
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
