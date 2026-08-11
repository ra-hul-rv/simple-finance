'use client';

import { useState, useEffect, useTransition } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CategorySelector } from '@/components/shared/category-selector';
import { TemplatesTab as StandardTemplatesTab } from '@/components/settings/templates-tab';
import {
  Sparkles,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Edit2,
  Trash2,
  Layers,
  FileSpreadsheet,
  ArrowUpRight,
  Zap,
  Building2,
  MapPin,
  Clock,
  RefreshCw,
  Info
} from 'lucide-react';
import { toast } from 'sonner';

interface Account {
  id: string;
  name: string;
  color: string;
  type: string;
}

interface Category {
  id: string;
  name: string;
  type: string;
  parentId: string | null;
  parent?: { id: string; name: string; color: string } | null;
}

interface UpiTemplateItem {
  id: string;
  title: string;
  upiId: string;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'INVESTMENT' | 'CREDIT_CARD_PAYMENT' | 'REFUND' | 'INTEREST' | 'DIVIDEND';
  amount: number | null;
  merchant: string | null;
  location: string | null;
  description: string | null;
  notes: string | null;
  accountId: string | null;
  categoryId: string | null;
  autoCreated: boolean;
  usageCount: number;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
  account?: Account | null;
  category?: Category | null;
}

export default function TemplatesPage() {
  const [activeTab, setActiveTab] = useState<'upi' | 'standard'>('upi');
  const [isPending, startTransition] = useTransition();

  // Data states
  const [upiTemplates, setUpiTemplates] = useState<UpiTemplateItem[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'NEEDS_SETUP' | 'CONFIGURED'>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  // Copy state tracker
  const [copiedUpiId, setCopiedUpiId] = useState<string | null>(null);

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<UpiTemplateItem | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [upiId, setUpiId] = useState('');
  const [txType, setTxType] = useState<string>('EXPENSE');
  const [accountId, setAccountId] = useState<string>('none');
  const [categoryId, setCategoryId] = useState<string>('none');
  const [amount, setAmount] = useState<string>('');
  const [merchant, setMerchant] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [upiRes, accRes, catRes] = await Promise.all([
        fetch('/api/upi-templates'),
        fetch('/api/accounts'),
        fetch('/api/categories'),
      ]);

      if (upiRes.ok) setUpiTemplates(await upiRes.json());
      if (accRes.ok) setAccounts(await accRes.json());
      if (catRes.ok) setCategories(await catRes.json());
    } catch (err) {
      console.error(err);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenAdd = () => {
    setEditingTemplate(null);
    setTitle('');
    setUpiId('');
    setTxType('EXPENSE');
    setAccountId(accounts.length > 0 ? accounts[0].id : 'none');
    setCategoryId('none');
    setAmount('');
    setMerchant('');
    setLocation('');
    setDescription('');
    setNotes('');
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (tpl: UpiTemplateItem) => {
    setEditingTemplate(tpl);
    setTitle(tpl.title);
    setUpiId(tpl.upiId);
    setTxType(tpl.type);
    setAccountId(tpl.accountId || 'none');
    setCategoryId(tpl.categoryId || 'none');
    setAmount(tpl.amount ? String(tpl.amount) : '');
    setMerchant(tpl.merchant || '');
    setLocation(tpl.location || '');
    setDescription(tpl.description || '');
    setNotes(tpl.notes || '');
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Template title is required');
      return;
    }
    if (!upiId.trim()) {
      toast.error('UPI ID is required');
      return;
    }

    startTransition(async () => {
      try {
        const payload = {
          title: title.trim(),
          upiId: upiId.trim(),
          type: txType,
          accountId: accountId === 'none' ? null : accountId,
          categoryId: categoryId === 'none' ? null : categoryId,
          amount: amount ? parseFloat(amount) : null,
          merchant: merchant.trim() || null,
          location: location.trim() || null,
          description: description.trim() || null,
          notes: notes.trim() || null,
        };

        const url = editingTemplate ? `/api/upi-templates/${editingTemplate.id}` : '/api/upi-templates';
        const method = editingTemplate ? 'PUT' : 'POST';

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errData = await res.json();
          toast.error(errData.error || 'Failed to save UPI template');
          return;
        }

        toast.success(editingTemplate ? 'UPI template updated!' : 'UPI template created!');
        setIsDialogOpen(false);
        fetchData();
      } catch (err) {
        console.error(err);
        toast.error('Something went wrong while saving');
      }
    });
  };

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete template "${name}"?`)) return;

    startTransition(async () => {
      try {
        const res = await fetch(`/api/upi-templates/${id}`, { method: 'DELETE' });
        if (!res.ok) {
          toast.error('Failed to delete template');
          return;
        }
        toast.success('Template deleted');
        fetchData();
      } catch (err) {
        console.error(err);
        toast.error('Error deleting template');
      }
    });
  };

  const handleCopyUpiId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedUpiId(id);
    toast.success(`Copied "${id}" to clipboard`);
    setTimeout(() => setCopiedUpiId(null), 2000);
  };

  // Filtered Templates calculation
  const filteredUpiTemplates = upiTemplates.filter((tpl) => {
    const matchesSearch =
      tpl.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tpl.upiId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tpl.merchant && tpl.merchant.toLowerCase().includes(searchQuery.toLowerCase()));

    const isUnconfigured = tpl.autoCreated || !tpl.categoryId || !tpl.accountId;

    let matchesStatus = true;
    if (statusFilter === 'NEEDS_SETUP') matchesStatus = isUnconfigured;
    if (statusFilter === 'CONFIGURED') matchesStatus = !isUnconfigured;

    let matchesType = true;
    if (typeFilter !== 'ALL') matchesType = tpl.type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  // Analytics stats
  const totalCount = upiTemplates.length;
  const needsSetupCount = upiTemplates.filter((t) => t.autoCreated || !t.categoryId || !t.accountId).length;
  const configuredCount = totalCount - needsSetupCount;
  const totalHits = upiTemplates.reduce((acc, t) => acc + (t.usageCount || 0), 0);

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Templates & Presets"
        description="Configure UPI auto-match rules for n8n SMS automations and fast transaction presets."
      >
        <div className="flex items-center gap-2">
          <Button onClick={fetchData} variant="outline" size="sm" className="gap-1.5 rounded-xl bg-background/30">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {activeTab === 'upi' && (
            <Button onClick={handleOpenAdd} className="gradient-primary gap-1.5 rounded-xl shadow-md">
              <Plus className="h-4 w-4" />
              Add UPI Template
            </Button>
          )}
        </div>
      </PageHeader>

      <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="w-full">
        <TabsList className="grid grid-cols-2 w-full max-w-md h-11 p-1 bg-background/40 border border-border/40 rounded-xl mb-6">
          <TabsTrigger value="upi" className="rounded-lg text-xs font-semibold gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            UPI Auto-Match (n8n)
          </TabsTrigger>
          <TabsTrigger value="standard" className="rounded-lg text-xs font-semibold gap-2">
            <FileSpreadsheet className="h-4 w-4 text-indigo-500" />
            Standard Presets
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upi" className="space-y-6 mt-0">
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="glass border border-border/40 p-4 rounded-2xl relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total UPI Rules</p>
                  <h3 className="text-2xl font-bold mt-1 font-mono">{totalCount}</h3>
                </div>
                <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500">
                  <Zap className="h-5 w-5" />
                </div>
              </div>
            </Card>

            <Card className="glass border border-amber-500/30 bg-amber-500/5 p-4 rounded-2xl relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider">Needs Setup</p>
                  <h3 className="text-2xl font-bold mt-1 font-mono text-amber-600 dark:text-amber-400">{needsSetupCount}</h3>
                </div>
                <div className="h-10 w-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500">
                  <AlertTriangle className="h-5 w-5" />
                </div>
              </div>
              <p className="text-[11px] text-amber-600/80 dark:text-amber-400/80 mt-2">Auto-captured by n8n or missing category</p>
            </Card>

            <Card className="glass border border-emerald-500/30 bg-emerald-500/5 p-4 rounded-2xl relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Configured</p>
                  <h3 className="text-2xl font-bold mt-1 font-mono text-emerald-600 dark:text-emerald-400">{configuredCount}</h3>
                </div>
                <div className="h-10 w-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              </div>
            </Card>

            <Card className="glass border border-border/40 p-4 rounded-2xl relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Matches</p>
                  <h3 className="text-2xl font-bold mt-1 font-mono">{totalHits}</h3>
                </div>
                <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <Sparkles className="h-5 w-5" />
                </div>
              </div>
            </Card>
          </div>

          {/* n8n Integration Banner Info & Webhook URL Hub */}
          <Card className="border border-indigo-500/30 bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-transparent p-5 rounded-2xl space-y-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 shrink-0 mt-0.5">
                  <Zap className="h-5 w-5 text-amber-400" />
                </div>
                <div className="space-y-1 text-xs text-muted-foreground max-w-2xl">
                  <p className="font-bold text-foreground text-sm flex items-center gap-2">
                    n8n SMS Webhook & UPI Auto-Match Hub
                  </p>
                  <p>
                    When your phone receives an SMS, n8n sends payment details to your webhook endpoint.
                    If the UPI ID matches a rule below, it automatically applies your assigned <strong>Category</strong>, <strong>Ledger Account</strong>, and <strong>Merchant</strong>.
                    If unknown, n8n automatically adds the new UPI ID under <strong>&quot;Needs Setup&quot;</strong> so you can configure it with one click!
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-indigo-500/20 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-background/50 border border-border/40 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">1. n8n SMS Ingest Webhook</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">POST</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Input
                    readOnly
                    value={typeof window !== 'undefined' ? `${window.location.origin}/api/webhooks/n8n` : '/api/webhooks/n8n'}
                    className="h-8 font-mono text-[11px] bg-background/70"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs shrink-0"
                    onClick={() => {
                      const url = typeof window !== 'undefined' ? `${window.location.origin}/api/webhooks/n8n` : '/api/webhooks/n8n';
                      navigator.clipboard.writeText(url);
                      toast.success('Copied n8n Webhook URL');
                    }}
                  >
                    Copy
                  </Button>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-background/50 border border-border/40 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">2. UPI Lookup & Auto-Match Endpoint</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">POST</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Input
                    readOnly
                    value={typeof window !== 'undefined' ? `${window.location.origin}/api/upi-templates/lookup` : '/api/upi-templates/lookup'}
                    className="h-8 font-mono text-[11px] bg-background/70"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs shrink-0"
                    onClick={() => {
                      const url = typeof window !== 'undefined' ? `${window.location.origin}/api/upi-templates/lookup` : '/api/upi-templates/lookup';
                      navigator.clipboard.writeText(url);
                      toast.success('Copied UPI Lookup URL');
                    }}
                  >
                    Copy
                  </Button>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-background/50 border border-border/40 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">3. UPI Rules List / Add Endpoint</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 border border-blue-500/20">GET / POST</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Input
                    readOnly
                    value={typeof window !== 'undefined' ? `${window.location.origin}/api/upi-templates` : '/api/upi-templates'}
                    className="h-8 font-mono text-[11px] bg-background/70"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs shrink-0"
                    onClick={() => {
                      const url = typeof window !== 'undefined' ? `${window.location.origin}/api/upi-templates` : '/api/upi-templates';
                      navigator.clipboard.writeText(url);
                      toast.success('Copied UPI Templates API URL');
                    }}
                  >
                    Copy
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Search and Filters Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search title, UPI ID (e.g. swiggy@icici), merchant..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-11 bg-background/30 border-border/40 rounded-xl text-sm"
              />
            </div>

            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
                <SelectTrigger className="h-11 min-w-[160px] bg-background/30 border-border/40 rounded-xl text-xs font-medium">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Templates</SelectItem>
                  <SelectItem value="NEEDS_SETUP">Needs Setup (Auto-Added)</SelectItem>
                  <SelectItem value="CONFIGURED">Fully Configured</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={(val: any) => setTypeFilter(val)}>
                <SelectTrigger className="h-11 min-w-[130px] bg-background/30 border-border/40 rounded-xl text-xs font-medium">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Types</SelectItem>
                  <SelectItem value="EXPENSE">Expense</SelectItem>
                  <SelectItem value="INCOME">Income</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* UPI Templates Data List */}
          <Card className="glass border border-border/40 rounded-2xl overflow-hidden shadow-lg">
            {filteredUpiTemplates.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <div className="h-12 w-12 rounded-2xl bg-muted/30 border border-border/40 flex items-center justify-center mx-auto text-muted-foreground">
                  <Zap className="h-6 w-6" />
                </div>
                <h4 className="text-base font-semibold">No UPI Templates Found</h4>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  {searchQuery || statusFilter !== 'ALL'
                    ? 'No templates matched your current filter criteria.'
                    : 'Create your first UPI auto-match template or let n8n auto-capture incoming UPI IDs!'}
                </p>
                {!searchQuery && statusFilter === 'ALL' && (
                  <Button onClick={handleOpenAdd} size="sm" className="gradient-primary gap-1.5 rounded-xl mt-2">
                    <Plus className="h-4 w-4" /> Create UPI Template
                  </Button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-border/30">
                {filteredUpiTemplates.map((tpl) => {
                  const isUnconfigured = tpl.autoCreated || !tpl.categoryId || !tpl.accountId;
                  const categoryName = tpl.category
                    ? tpl.category.parent
                      ? `${tpl.category.parent.name} › ${tpl.category.name}`
                      : tpl.category.name
                    : null;

                  return (
                    <div
                      key={tpl.id}
                      className={`p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all hover:bg-muted/20 ${
                        isUnconfigured ? 'bg-amber-500/[0.02]' : ''
                      }`}
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold tracking-tight text-foreground truncate">{tpl.title}</h4>

                          <button
                            onClick={() => handleCopyUpiId(tpl.upiId)}
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-mono bg-background/50 border border-border/50 hover:border-primary/40 text-muted-foreground hover:text-foreground transition-all group"
                            title="Click to copy UPI ID"
                          >
                            <span>{tpl.upiId}</span>
                            {copiedUpiId === tpl.upiId ? (
                              <Check className="h-3 w-3 text-emerald-500 shrink-0" />
                            ) : (
                              <Copy className="h-3 w-3 opacity-60 group-hover:opacity-100 shrink-0" />
                            )}
                          </button>

                          {isUnconfigured ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400">
                              <AlertTriangle className="h-3 w-3 shrink-0" />
                              Needs Category & Account
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="h-3 w-3 shrink-0" />
                              Configured
                            </span>
                          )}

                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            tpl.type === 'EXPENSE' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                          }`}>
                            {tpl.type}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-foreground/80">Account:</span>
                            {tpl.account ? (
                              <span className="inline-flex items-center gap-1 font-medium text-foreground">
                                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: tpl.account.color }} />
                                {tpl.account.name}
                              </span>
                            ) : (
                              <span className="text-amber-500 italic">Not set</span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-foreground/80">Category:</span>
                            {categoryName ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-background/40 border border-border/40 text-foreground font-medium text-[11px]">
                                {categoryName}
                              </span>
                            ) : (
                              <span className="text-amber-500 italic">Not set</span>
                            )}
                          </div>

                          {tpl.merchant && (
                            <div className="flex items-center gap-1">
                              <Building2 className="h-3 w-3 text-muted-foreground shrink-0" />
                              <span>{tpl.merchant}</span>
                            </div>
                          )}

                          {tpl.location && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                              <span>{tpl.location}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-border/30">
                        <div className="text-left sm:text-right text-xs text-muted-foreground space-y-0.5">
                          <p className="font-mono text-[11px]">
                            <span className="font-bold text-foreground">{tpl.usageCount}</span> matches
                          </p>
                          {tpl.lastUsedAt && (
                            <p className="text-[10px] text-muted-foreground/80 flex items-center gap-1">
                              <Clock className="h-2.5 w-2.5 inline shrink-0" />
                              {new Date(tpl.lastUsedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Button
                            onClick={() => handleOpenEdit(tpl)}
                            size="sm"
                            variant="outline"
                            className={`h-9 px-3 rounded-xl gap-1 text-xs ${
                              isUnconfigured ? 'gradient-primary text-white border-none shadow-md' : 'bg-background/40'
                            }`}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                            {isUnconfigured ? 'Configure Now' : 'Edit'}
                          </Button>
                          <Button
                            onClick={() => handleDelete(tpl.id, tpl.title)}
                            size="icon"
                            variant="ghost"
                            className="h-9 w-9 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="standard" className="mt-0">
          <StandardTemplatesTab />
        </TabsContent>
      </Tabs>

      {/* Add / Edit Dialog Modal */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="form-spacious sm:max-w-[560px] max-h-[90vh] overflow-y-auto rounded-2xl glass border border-border/50">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              {editingTemplate ? 'Edit UPI Template' : 'Add UPI Auto-Match Template'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Define preset category, ledger account, and details for transactions matching this UPI ID.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground text-[10px] font-bold">Template Title *</Label>
                <Input
                  placeholder="e.g. Swiggy Orders"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-11 bg-background/30 border-border/40 rounded-xl text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground text-[10px] font-bold">UPI ID / VPA *</Label>
                <Input
                  placeholder="e.g. swiggy@icici"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="h-11 bg-background/30 border-border/40 rounded-xl text-sm font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground text-[10px] font-bold">Transaction Type</Label>
                <Select value={txType} onValueChange={(val: any) => setTxType(val)}>
                  <SelectTrigger className="h-11 bg-background/30 border-border/40 rounded-xl text-sm">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EXPENSE">Expense</SelectItem>
                    <SelectItem value="INCOME">Income</SelectItem>
                    <SelectItem value="TRANSFER">Transfer</SelectItem>
                    <SelectItem value="INVESTMENT">Investment</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground text-[10px] font-bold">Ledger Account (Bank/Card)</Label>
                <Select value={accountId} onValueChange={(val: any) => setAccountId(val)}>
                  <SelectTrigger className="h-11 bg-background/30 border-border/40 rounded-xl text-sm">
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- Select Default Account --</SelectItem>
                    {accounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: acc.color }} />
                          <span>{acc.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <CategorySelector
              categories={categories as any}
              value={categoryId}
              onChange={(val) => setCategoryId(val)}
              typeFilter={txType === 'INCOME' ? 'INCOME' : 'EXPENSE'}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground text-[10px] font-bold">Merchant Name</Label>
                <Input
                  placeholder="e.g. Swiggy"
                  value={merchant}
                  onChange={(e) => setMerchant(e.target.value)}
                  className="h-11 bg-background/30 border-border/40 rounded-xl text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground text-[10px] font-bold">Default Amount (Optional)</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-11 bg-background/30 border-border/40 rounded-xl text-sm font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground text-[10px] font-bold">Location</Label>
                <Input
                  placeholder="e.g. Bangalore"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="h-11 bg-background/30 border-border/40 rounded-xl text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground text-[10px] font-bold">Default Description</Label>
                <Input
                  placeholder="e.g. Food Delivery"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="h-11 bg-background/30 border-border/40 rounded-xl text-sm"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isPending} className="gradient-primary rounded-xl px-6 shadow-md">
              {isPending ? 'Saving...' : editingTemplate ? 'Update Template' : 'Create Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
