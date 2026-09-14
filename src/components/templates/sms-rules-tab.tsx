'use client';

import { useState, useEffect, useTransition } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Brain,
  Sparkles,
  Plus,
  Search,
  Edit2,
  Trash2,
  Clock,
  CheckCircle2,
  Bot,
  Zap,
  Tag,
  Wallet,
  HelpCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

interface Account {
  id: string;
  name: string;
  type: string;
}

interface Category {
  id: string;
  name: string;
  type: string;
}

export interface SmsRuleItem {
  id: string;
  identifier: string;
  label: string;
  aiNote: string | null;
  defaultType: string | null;
  defaultCategoryId: string | null;
  defaultAccountId: string | null;
  defaultMerchant: string | null;
  defaultDescription: string | null;
  autoCreated: boolean;
  usageCount: number;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
  category?: { id: string; name: string } | null;
  account?: { id: string; name: string } | null;
}

interface SmsRulesTabProps {
  accounts: Account[];
  categories: Category[];
}

export function SmsRulesTab({ accounts, categories }: SmsRulesTabProps) {
  const [rules, setRules] = useState<SmsRuleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'AUTO' | 'MANUAL' | 'HAS_NOTE'>('ALL');

  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<SmsRuleItem | null>(null);

  // Form Fields
  const [formIdentifier, setFormIdentifier] = useState('');
  const [formLabel, setFormLabel] = useState('');
  const [formAiNote, setFormAiNote] = useState('');
  const [formType, setFormType] = useState<string>('none');
  const [formAccountId, setFormAccountId] = useState<string>('none');
  const [formCategoryId, setFormCategoryId] = useState<string>('none');
  const [formMerchant, setFormMerchant] = useState('');
  const [formDescription, setFormDescription] = useState('');

  const fetchRules = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/sms-rules');
      if (res.ok) {
        setRules(await res.json());
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load SMS rules');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleOpenAdd = () => {
    setEditingRule(null);
    setFormIdentifier('');
    setFormLabel('');
    setFormAiNote('');
    setFormType('EXPENSE');
    setFormAccountId('none');
    setFormCategoryId('none');
    setFormMerchant('');
    setFormDescription('');
    setDialogOpen(true);
  };

  const handleOpenEdit = (rule: SmsRuleItem) => {
    setEditingRule(rule);
    setFormIdentifier(rule.identifier);
    setFormLabel(rule.label);
    setFormAiNote(rule.aiNote || '');
    setFormType(rule.defaultType || 'none');
    setFormAccountId(rule.defaultAccountId || 'none');
    setFormCategoryId(rule.defaultCategoryId || 'none');
    setFormMerchant(rule.defaultMerchant || '');
    setFormDescription(rule.defaultDescription || '');
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!formIdentifier.trim()) {
      toast.error('Identifier is required (e.g. SWIGGY, YESBNK_X2020)');
      return;
    }
    if (!formLabel.trim()) {
      toast.error('Label is required');
      return;
    }

    startTransition(async () => {
      try {
        const payload = {
          identifier: formIdentifier.toUpperCase().trim(),
          label: formLabel.trim(),
          aiNote: formAiNote.trim() || null,
          defaultType: formType !== 'none' ? formType : null,
          defaultAccountId: formAccountId !== 'none' ? formAccountId : null,
          defaultCategoryId: formCategoryId !== 'none' ? formCategoryId : null,
          defaultMerchant: formMerchant.trim() || null,
          defaultDescription: formDescription.trim() || null,
        };

        if (editingRule) {
          const res = await fetch(`/api/sms-rules/${editingRule.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          if (!res.ok) throw new Error('Failed to update rule');
          toast.success('SMS rule updated!');
        } else {
          const res = await fetch('/api/sms-rules', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          if (res.status === 409) {
            toast.error('A rule with this identifier already exists');
            return;
          }
          if (!res.ok) throw new Error('Failed to create rule');
          toast.success('SMS rule created!');
        }

        setDialogOpen(false);
        fetchRules();
      } catch (err: any) {
        toast.error(err.message || 'Error saving rule');
      }
    });
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/sms-rules/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Rule deleted');
        setRules((prev) => prev.filter((r) => r.id !== id));
      } else {
        throw new Error();
      }
    } catch {
      toast.error('Failed to delete rule');
    }
  };

  // Filtered Rules
  const filteredRules = rules.filter((r) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      r.identifier.toLowerCase().includes(q) ||
      r.label.toLowerCase().includes(q) ||
      (r.aiNote && r.aiNote.toLowerCase().includes(q)) ||
      (r.defaultMerchant && r.defaultMerchant.toLowerCase().includes(q));

    let matchesFilter = true;
    if (filterType === 'AUTO') matchesFilter = r.autoCreated;
    if (filterType === 'MANUAL') matchesFilter = !r.autoCreated;
    if (filterType === 'HAS_NOTE') matchesFilter = Boolean(r.aiNote && r.aiNote.trim());

    return matchesSearch && matchesFilter;
  });

  // Stats
  const totalRules = rules.length;
  const autoCreatedCount = rules.filter((r) => r.autoCreated).length;
  const withNoteCount = rules.filter((r) => Boolean(r.aiNote && r.aiNote.trim())).length;
  const totalUsage = rules.reduce((acc, r) => acc + (r.usageCount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Analytics Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-border p-4 rounded-xl relative overflow-hidden bg-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Total SMS Rules
              </p>
              <h3 className="text-2xl font-bold mt-1 font-mono">{totalRules}</h3>
            </div>
            <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Brain className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className="border border-border p-4 rounded-xl relative overflow-hidden bg-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                AI Instructions Saved
              </p>
              <h3 className="text-2xl font-bold mt-1 font-mono text-emerald-500">
                {withNoteCount}
              </h3>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
              <Sparkles className="h-5 w-5" />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            Rules with custom AI notes/training
          </p>
        </Card>

        <Card className="border border-border p-4 rounded-xl relative overflow-hidden bg-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Auto-Learned
              </p>
              <h3 className="text-2xl font-bold mt-1 font-mono text-blue-500">
                {autoCreatedCount}
              </h3>
            </div>
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
              <Bot className="h-5 w-5" />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            Discovered from incoming SMS
          </p>
        </Card>

        <Card className="border border-border p-4 rounded-xl relative overflow-hidden bg-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Total AI Matches
              </p>
              <h3 className="text-2xl font-bold mt-1 font-mono text-amber-500">
                {totalUsage}
              </h3>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
              <Zap className="h-5 w-5" />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            Times rules guided incoming transactions
          </p>
        </Card>
      </div>

      {/* Info Banner */}
      <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 flex items-start gap-3">
        <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="text-xs text-muted-foreground space-y-1">
          <span className="font-semibold text-foreground">How AI Training works:</span>
          <p>
            When a transaction SMS arrives, the AI automatically assigns a unique identifier (like <code className="text-primary font-mono font-semibold">SWIGGY</code> or <code className="text-primary font-mono font-semibold">YESBNK_X2020</code>).
            Add an <strong>AI Note</strong> to any rule below to tell the AI how to categorize, label, or structure future transactions from that vendor.
          </p>
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by identifier, label, or note..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10"
            />
          </div>

          <Select value={filterType} onValueChange={(val: any) => setFilterType(val)}>
            <SelectTrigger className="w-[160px] h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Rules ({rules.length})</SelectItem>
              <SelectItem value="HAS_NOTE">Has AI Note ({withNoteCount})</SelectItem>
              <SelectItem value="AUTO">Auto-Learned ({autoCreatedCount})</SelectItem>
              <SelectItem value="MANUAL">Manual ({rules.length - autoCreatedCount})</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Button onClick={fetchRules} variant="outline" size="sm" className="h-10 gap-1.5">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={handleOpenAdd} size="sm" className="h-10 gap-1.5">
            <Plus className="h-4 w-4" />
            Add Rule
          </Button>
        </div>
      </div>

      {/* Rules Table */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredRules.length === 0 ? (
        <Card className="border-dashed border-2 bg-card p-12 text-center">
          <Brain className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="font-semibold text-foreground">No SMS rules found</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            {searchQuery
              ? 'Try clearing your search query or changing the filter.'
              : 'When your SMS forwarder sends bank alerts, new rules will be automatically created here for you to train.'}
          </p>
          <Button onClick={handleOpenAdd} size="sm" variant="outline" className="mt-4">
            <Plus className="h-4 w-4 mr-1.5" />
            Create First Rule
          </Button>
        </Card>
      ) : (
        <Card className="border border-border bg-card overflow-hidden">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Identifier</TableHead>
                  <TableHead className="w-[200px]">Label</TableHead>
                  <TableHead>AI Instruction / Note</TableHead>
                  <TableHead>Defaults</TableHead>
                  <TableHead className="w-[100px] text-center">Hits</TableHead>
                  <TableHead className="w-[120px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRules.map((rule) => (
                  <TableRow key={rule.id} className="hover:bg-muted/40 transition-colors">
                    {/* Identifier */}
                    <TableCell>
                      <div className="flex flex-col gap-1 items-start">
                        <Badge variant="outline" className="font-mono text-xs uppercase px-2 py-0.5 border-primary/30 text-primary bg-primary/5">
                          {rule.identifier}
                        </Badge>
                        {rule.autoCreated ? (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Bot className="h-3 w-3" /> Auto-learned
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Manual
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* Label & Merchant */}
                    <TableCell>
                      <div className="font-medium text-sm">{rule.label}</div>
                      {rule.defaultMerchant && (
                        <div className="text-xs text-muted-foreground line-clamp-1">
                          Merchant: {rule.defaultMerchant}
                        </div>
                      )}
                    </TableCell>

                    {/* AI Note */}
                    <TableCell>
                      {rule.aiNote ? (
                        <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/15 text-xs text-foreground flex items-start gap-2">
                          <Sparkles className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{rule.aiNote}</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleOpenEdit(rule)}
                          className="text-xs text-muted-foreground/60 italic hover:text-primary transition-colors flex items-center gap-1"
                        >
                          <Plus className="h-3 w-3" /> Add AI instruction...
                        </button>
                      )}
                    </TableCell>

                    {/* Defaults */}
                    <TableCell>
                      <div className="flex flex-wrap gap-1 items-center">
                        {rule.defaultType && (
                          <Badge
                            variant="secondary"
                            className={`text-[10px] ${
                              rule.defaultType === 'INCOME'
                                ? 'bg-emerald-500/15 text-emerald-600'
                                : 'bg-rose-500/15 text-rose-600'
                            }`}
                          >
                            {rule.defaultType}
                          </Badge>
                        )}
                        {rule.category && (
                          <Badge variant="outline" className="text-[10px] flex items-center gap-1">
                            <Tag className="h-2.5 w-2.5" />
                            {rule.category.name}
                          </Badge>
                        )}
                        {rule.account && (
                          <Badge variant="outline" className="text-[10px] flex items-center gap-1">
                            <Wallet className="h-2.5 w-2.5" />
                            {rule.account.name}
                          </Badge>
                        )}
                        {!rule.defaultType && !rule.category && !rule.account && (
                          <span className="text-xs text-muted-foreground italic">—</span>
                        )}
                      </div>
                    </TableCell>

                    {/* Usage Count */}
                    <TableCell className="text-center">
                      <div className="font-mono text-sm font-semibold">{rule.usageCount}</div>
                      {rule.lastUsedAt && (
                        <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center justify-center gap-1">
                          <Clock className="h-2.5 w-2.5" />
                          {new Date(rule.lastUsedAt).toLocaleDateString()}
                        </div>
                      )}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEdit(rule)}
                          title="Edit rule & AI note"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-rose-500/20 text-rose-500 hover:bg-rose-500/10"
                          onClick={() => handleDelete(rule.id)}
                          title="Delete rule"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Edit / Add Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              {editingRule ? 'Edit SMS AI Rule' : 'Create SMS AI Rule'}
            </DialogTitle>
            <DialogDescription>
              Train the AI to recognize transactions with this identifier and apply your preferred defaults.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Identifier & Label in 2 cols */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Identifier <span className="text-destructive">*</span>
                </Label>
                <Input
                  placeholder="e.g. SWIGGY, YESBNK_X2020"
                  value={formIdentifier}
                  onChange={(e) => setFormIdentifier(e.target.value.toUpperCase())}
                  disabled={Boolean(editingRule)}
                  className="font-mono uppercase"
                />
                <p className="text-[10px] text-muted-foreground">
                  Unique key matched against incoming SMS alerts.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Rule Label <span className="text-destructive">*</span>
                </Label>
                <Input
                  placeholder="e.g. Swiggy Food Delivery"
                  value={formLabel}
                  onChange={(e) => setFormLabel(e.target.value)}
                />
                <p className="text-[10px] text-muted-foreground">
                  Human-readable description.
                </p>
              </div>
            </div>

            {/* AI Instruction / Note — The centerpiece */}
            <div className="space-y-1.5 p-3.5 rounded-xl border border-primary/30 bg-primary/5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4" />
                  AI Instruction (Prompt Note)
                </Label>
                <span className="text-[10px] text-muted-foreground">Sent directly to AI</span>
              </div>
              <Textarea
                rows={3}
                placeholder="Teach the AI what this transaction is. e.g. 'This is a food delivery order from Swiggy. Always categorize as Food & Dining, merchant as Swiggy, and account as HDFC Credit Card.'"
                value={formAiNote}
                onChange={(e) => setFormAiNote(e.target.value)}
                className="bg-card text-xs mt-1"
              />
              <p className="text-[10px] text-muted-foreground">
                The AI reads this note on future transactions matching this identifier.
              </p>
            </div>

            {/* Default Type, Account, Category */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Default Type
                </Label>
                <Select value={formType} onValueChange={setFormType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Auto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Auto (AI Decides)</SelectItem>
                    <SelectItem value="EXPENSE">Expense</SelectItem>
                    <SelectItem value="INCOME">Income</SelectItem>
                    <SelectItem value="TRANSFER">Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Default Account
                </Label>
                <Select value={formAccountId} onValueChange={setFormAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Auto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Auto (Match card)</SelectItem>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Default Category
                </Label>
                <Select value={formCategoryId} onValueChange={setFormCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Auto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Auto (AI Decides)</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Default Merchant & Description */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Default Merchant
                </Label>
                <Input
                  placeholder="e.g. Swiggy"
                  value={formMerchant}
                  onChange={(e) => setFormMerchant(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Default Description
                </Label>
                <Input
                  placeholder="e.g. Swiggy Food Delivery"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Rule'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
