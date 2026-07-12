'use client';

import { useEffect, useState, useTransition } from 'react';
import { 
  Cpu, 
  Plus, 
  Trash2, 
  Play,
  Clock, 
  ShieldCheck, 
  Check, 
  Search, 
  Tag, 
  Info, 
  ExternalLink,
  Loader2,
  AlertCircle,
  Inbox,
  Sparkles,
  Settings,
  ArrowRight,
  GitBranch,
  HelpCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/format';

interface Account {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
}

interface AutomationRule {
  id: string;
  name: string;
  triggerType: 'TRANSACTION_CREATED' | 'SCHEDULED';
  isActive: boolean;
  conditions: any[];
  actions: any[];
  frequency: string | null;
  nextExecution: string | null;
}

export default function AutomationsPage() {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [filterTrigger, setFilterTrigger] = useState('ALL'); // ALL, TRANSACTION_CREATED, SCHEDULED

  // Rule Creator Dialog State
  const [isOpen, setIsOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [triggerType, setTriggerType] = useState<'TRANSACTION_CREATED' | 'SCHEDULED'>('TRANSACTION_CREATED');
  
  // Transaction Created condition builder fields
  const [condField, setCondField] = useState('description'); // description, accountId, amount, type
  const [condOperator, setCondOperator] = useState('contains'); // contains, equals, gt, lt
  const [condValue, setCondValue] = useState('');

  // Transaction Created action builder fields
  const [actType, setActType] = useState('setCategory'); // setCategory, setDescription
  const [actValue, setActValue] = useState('');

  // Scheduled transaction rule builder fields
  const [schedFreq, setSchedFreq] = useState('MONTHLY'); // DAILY, WEEKLY, MONTHLY, YEARLY
  const [schedAmount, setSchedAmount] = useState('');
  const [schedType, setSchedType] = useState('EXPENSE'); // EXPENSE, INCOME
  const [schedAccountId, setSchedAccountId] = useState('');
  const [schedCategoryId, setSchedCategoryId] = useState('');
  const [schedDescription, setSchedDescription] = useState('');

  const [isPending, startTransition] = useTransition();
  const [isRunningRules, setIsRunningRules] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch initial data
  useEffect(() => {
    async function loadData() {
      try {
        const [rulesRes, accountsRes, categoriesRes] = await Promise.all([
          fetch('/api/automations'),
          fetch('/api/accounts'),
          fetch('/api/categories'),
        ]);

        if (rulesRes.ok && accountsRes.ok && categoriesRes.ok) {
          const rulesData = await rulesRes.json();
          const accountsData = await accountsRes.json();
          const categoriesData = await categoriesRes.json();

          setRules(rulesData);
          setAccounts(accountsData);
          setCategories(categoriesData);

          if (accountsData.length > 0) setSchedAccountId(accountsData[0].id);
          if (categoriesData.length > 0) setSchedCategoryId(categoriesData[0].id);
        }
      } catch (err) {
        console.error('Failed to load automations data:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  const handleOpenAddDialog = () => {
    setEditingRule(null);
    setName('');
    setTriggerType('TRANSACTION_CREATED');
    setCondField('description');
    setCondOperator('contains');
    setCondValue('');
    setActType('setCategory');
    setActValue(categories.length > 0 ? categories[0].id : '');
    setSchedFreq('MONTHLY');
    setSchedAmount('');
    setSchedType('EXPENSE');
    if (accounts.length > 0) setSchedAccountId(accounts[0].id);
    if (categories.length > 0) setSchedCategoryId(categories[0].id);
    setSchedDescription('');
    setErrorMessage(null);
    setIsOpen(true);
  };

  const handleOpenEditDialog = (rule: AutomationRule) => {
    setEditingRule(rule);
    setName(rule.name);
    setTriggerType(rule.triggerType);

    if (rule.triggerType === 'TRANSACTION_CREATED') {
      const cond = rule.conditions?.[0] || { field: 'description', operator: 'contains', value: '' };
      setCondField(cond.field);
      setCondOperator(cond.operator);
      setCondValue(cond.value);

      const act = rule.actions?.[0] || { type: 'setCategory', value: '' };
      setActType(act.type);
      setActValue(act.value);
    } else {
      setSchedFreq(rule.frequency || 'MONTHLY');
      const act = rule.actions?.[0] || { type: 'createTransaction', value: {} };
      const val = act.value || {};
      setSchedAmount(val.amount?.toString() || '');
      setSchedType(val.type || 'EXPENSE');
      setSchedAccountId(val.accountId || (accounts.length > 0 ? accounts[0].id : ''));
      setSchedCategoryId(val.categoryId || (categories.length > 0 ? categories[0].id : ''));
      setSchedDescription(val.description || '');
    }

    setErrorMessage(null);
    setIsOpen(true);
  };

  // Submit rules
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setErrorMessage(null);
    let conditions: any[] = [];
    let actions: any[] = [];

    if (triggerType === 'TRANSACTION_CREATED') {
      conditions = [{
        field: condField,
        operator: condOperator,
        value: condValue,
      }];
      actions = [{
        type: actType,
        value: actValue,
      }];
    } else {
      conditions = []; // Scheduled runs depend on frequency and execution time, not filters
      actions = [{
        type: 'createTransaction',
        value: {
          amount: parseFloat(schedAmount) || 0,
          type: schedType,
          accountId: schedAccountId,
          categoryId: schedCategoryId || null,
          description: schedDescription || name,
        },
      }];
    }

    const payload = {
      name,
      triggerType,
      conditions,
      actions,
      frequency: triggerType === 'SCHEDULED' ? schedFreq : null,
      isActive: editingRule ? editingRule.isActive : true,
    };

    startTransition(async () => {
      try {
        const url = editingRule ? `/api/automations/${editingRule.id}` : '/api/automations';
        const method = editingRule ? 'PUT' : 'POST';

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const saved = await res.json();
          if (editingRule) {
            setRules(rules.map((r) => (r.id === saved.id ? saved : r)));
          } else {
            setRules([saved, ...rules]);
          }
          setIsOpen(false);
        } else {
          const err = await res.json();
          setErrorMessage(err.error || 'Failed to save automation rule');
        }
      } catch (err) {
        setErrorMessage('Failed to connect to server');
      }
    });
  };

  // Run scheduler manually
  const handleForceRunScheduler = async () => {
    setIsRunningRules(true);
    try {
      const res = await fetch('/api/automations/run-scheduled', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        alert(`Scheduler execution complete! Auto-generated ${data.executedCount} transactions.`);
        
        // Refresh rules
        const rulesRes = await fetch('/api/automations');
        if (rulesRes.ok) {
          setRules(await rulesRes.json());
        }
      }
    } catch (err) {
      console.error('Failed to run scheduler:', err);
    } finally {
      setIsRunningRules(false);
    }
  };

  // Toggle active toggle
  const handleToggleActive = async (id: string, currentActive: boolean) => {
    setRules(
      rules.map((r) => (r.id === id ? { ...r, isActive: !currentActive } : r))
    );

    try {
      const res = await fetch(`/api/automations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentActive }),
      });

      if (!res.ok) {
        // Rollback
        setRules(
          rules.map((r) => (r.id === id ? { ...r, isActive: currentActive } : r))
        );
      }
    } catch (err) {
      console.error('Failed to toggle automation rule state:', err);
    }
  };

  // Delete Rule
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this automation rule?')) return;

    try {
      const res = await fetch(`/api/automations/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setRules(rules.filter((r) => r.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete rule:', err);
    }
  };

  // Filtering
  const filteredRules = rules.filter((rule) => {
    return filterTrigger === 'ALL' || rule.triggerType === filterTrigger;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-violet-500 to-indigo-500 bg-clip-text text-transparent flex items-center gap-2">
            <Cpu className="h-6 w-6 text-violet-500" />
            Automation Rules Engine
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Build transaction classifiers and configure scheduled rules to auto-generate transfers and regular bills.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={handleForceRunScheduler} 
            disabled={isRunningRules}
            className="rounded-xl h-10 gap-2 border-border/40 hover:bg-accent/40 font-semibold"
          >
            {isRunningRules ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : (
              <Play className="h-3.5 w-3.5 fill-current text-emerald-500 stroke-none" />
            )}
            Run Scheduled Rules
          </Button>
          <Button onClick={handleOpenAddDialog} className="rounded-xl h-10 gap-2 font-semibold">
            <Plus className="h-4.5 w-4.5" />
            Create Rule
          </Button>
        </div>
      </div>

      {/* Rules filter tabs */}
      <div className="flex items-center gap-2 border-b border-border/20 pb-2">
        <Button 
          variant={filterTrigger === 'ALL' ? 'default' : 'ghost'} 
          onClick={() => setFilterTrigger('ALL')}
          className="rounded-lg h-8 px-3 text-xs font-semibold"
        >
          All Rules
        </Button>
        <Button 
          variant={filterTrigger === 'TRANSACTION_CREATED' ? 'default' : 'ghost'} 
          onClick={() => setFilterTrigger('TRANSACTION_CREATED')}
          className="rounded-lg h-8 px-3 text-xs font-semibold"
        >
          Transaction Matchers
        </Button>
        <Button 
          variant={filterTrigger === 'SCHEDULED' ? 'default' : 'ghost'} 
          onClick={() => setFilterTrigger('SCHEDULED')}
          className="rounded-lg h-8 px-3 text-xs font-semibold"
        >
          Time-Based Scheduled
        </Button>
      </div>

      {/* Grid Rules list */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRules.map((rule) => {
            const cond = rule.conditions?.[0] || {};
            const act = rule.actions?.[0] || {};

            return (
              <Card key={rule.id} className={`border-border/40 overflow-hidden shadow-xs hover:shadow-md transition-shadow duration-200 bg-card ${!rule.isActive && 'opacity-60'}`}>
                <CardHeader className="pb-3 flex flex-row items-start justify-between gap-4">
                  <div className="min-w-0">
                    <Badge variant="outline" className={`text-[10px] tracking-wide font-bold uppercase rounded-md border-0 px-2 py-0.5 ${
                      rule.triggerType === 'SCHEDULED' 
                        ? 'bg-violet-500/10 text-violet-500' 
                        : 'bg-indigo-500/10 text-indigo-500'
                    }`}>
                      {rule.triggerType === 'SCHEDULED' ? `Scheduled (${rule.frequency})` : 'On Transaction Create'}
                    </Badge>
                    <h4 className="font-bold text-sm text-foreground truncate mt-1.5" title={rule.name}>
                      {rule.name}
                    </h4>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg hover:bg-accent"
                      onClick={() => handleOpenEditDialog(rule)}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(rule.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="pt-0 space-y-4">
                  {/* Conditions & Actions specs */}
                  <div className="space-y-2 text-xs">
                    {rule.triggerType === 'TRANSACTION_CREATED' ? (
                      <>
                        {/* Condition info */}
                        <div className="flex items-start gap-2 bg-accent/15 p-2 rounded-lg border border-border/10">
                          <GitBranch className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                          <div>
                            <p className="text-[9px] uppercase font-bold text-muted-foreground/60 tracking-wider">Condition</p>
                            <p className="mt-0.5 text-foreground">
                              If <span className="font-semibold text-primary">{cond.field}</span> {cond.operator === 'contains' ? 'contains' : 'equals'} <span className="font-mono font-bold text-pink-500">"{cond.value}"</span>
                            </p>
                          </div>
                        </div>

                        {/* Action info */}
                        <div className="flex items-start gap-2 bg-emerald-500/5 p-2 rounded-lg border border-emerald-500/10">
                          <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-[9px] uppercase font-bold text-emerald-500/80 tracking-wider">Action</p>
                            <p className="mt-0.5 text-foreground">
                              {act.type === 'setCategory' ? 'Categorize as ' : 'Rename description to '}
                              <span className="font-semibold text-emerald-500">
                                {act.type === 'setCategory' 
                                  ? (categories.find(c => c.id === act.value)?.name || 'Category')
                                  : `"${act.value}"`
                                }
                              </span>
                            </p>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Scheduled action info */}
                        <div className="flex items-start gap-2 bg-accent/20 p-2.5 rounded-lg border border-border/10">
                          <Clock className="h-4 w-4 text-violet-500 shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <p className="text-[9px] uppercase font-bold text-violet-500 tracking-wider">Recurring Action</p>
                            <p className="mt-1 text-foreground font-semibold">
                              Create {act.value?.type || 'EXPENSE'} of {formatCurrency(act.value?.amount || 0)}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                              Account: {accounts.find(a => a.id === act.value?.accountId)?.name || 'Account'}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              Category: {categories.find(c => c.id === act.value?.categoryId)?.name || 'None'}
                            </p>
                            {rule.nextExecution && (
                              <p className="text-[9px] font-bold text-violet-500 mt-2 bg-violet-500/10 py-0.5 px-2 rounded-md inline-block">
                                Next run: {new Date(rule.nextExecution).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Status Toggle Row */}
                  <div className="flex justify-between items-center pt-2 border-t border-border/10 text-xs">
                    <span className={`text-[10px] font-bold ${rule.isActive ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                      {rule.isActive ? 'Active Engine' : 'Deactivated'}
                    </span>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      className={`h-7 px-2.5 rounded-lg text-[10px] font-semibold border-border/50 hover:bg-accent ${
                        rule.isActive ? 'bg-emerald-500/10 text-emerald-500 hover:text-emerald-600' : 'bg-muted text-muted-foreground'
                      }`}
                      onClick={() => handleToggleActive(rule.id, rule.isActive)}
                    >
                      {rule.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {filteredRules.length === 0 && (
            <div className="col-span-full text-center py-20 border border-dashed rounded-2xl bg-card/20 border-border/40 max-w-sm mx-auto">
              <Inbox className="h-10 w-10 text-muted-foreground/50 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-foreground">No Automation Rules</h4>
              <p className="text-xs text-muted-foreground mt-1 mb-4">Add your first transaction categorizer or scheduled payment rule.</p>
              <Button onClick={handleOpenAddDialog} className="rounded-xl h-9">
                Create Rule
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Creator / Editor Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="form-spacious sm:max-w-[480px] lg:max-w-[620px] lg:p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">
                {editingRule ? 'Edit Automation Rule' : 'Create Automation Rule'}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Define the trigger conditions and automations to keep your ledgers clean.
              </DialogDescription>
            </DialogHeader>

            {errorMessage && (
              <div className="flex items-center gap-2 rounded-xl bg-destructive/10 p-3 text-xs text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <p>{errorMessage}</p>
              </div>
            )}

            <div className="space-y-4 py-2">
              {/* Trigger Choice */}
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Trigger Type</Label>
                <Select 
                  value={triggerType} 
                  onValueChange={(val) => setTriggerType(val as any)}
                  disabled={!!editingRule}
                >
                  <SelectTrigger className="bg-background/20 border-border/40 h-11 rounded-xl text-sm">
                    <SelectValue placeholder="Select Trigger" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TRANSACTION_CREATED">On Transaction Created</SelectItem>
                    <SelectItem value="SCHEDULED">Scheduled Interval (Time-based)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Rule Name */}
              <div className="space-y-1.5">
                <Label htmlFor="ruleName" className="label-uppercase text-muted-foreground">Rule Name</Label>
                <Input
                  id="ruleName"
                  placeholder="e.g. Swiggy Food Categorizer, Monthly Allowance"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-11 rounded-xl bg-background/20 border-border/40"
                  required
                />
              </div>

              {/* Rule specs: TRANSACTION_CREATED */}
              {triggerType === 'TRANSACTION_CREATED' && (
                <div className="space-y-4 border p-4 rounded-xl border-border/30 bg-accent/5">
                  <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
                    <GitBranch className="h-4 w-4 text-primary" /> Conditions (When transaction matches)
                  </h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-semibold text-muted-foreground">Field</Label>
                      <Select value={condField} onValueChange={(val) => setCondField(val || 'description')}>
                        <SelectTrigger className="h-10 rounded-xl bg-background/25 border-border/40 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="description">Description</SelectItem>
                          <SelectItem value="accountId">Ledger Account</SelectItem>
                          <SelectItem value="amount">Amount (₹)</SelectItem>
                          <SelectItem value="type">Type</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[10px] font-semibold text-muted-foreground">Operator</Label>
                      <Select value={condOperator} onValueChange={(val) => setCondOperator(val || 'contains')}>
                        <SelectTrigger className="h-10 rounded-xl bg-background/25 border-border/40 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="contains">Contains (text)</SelectItem>
                          <SelectItem value="equals">Equals</SelectItem>
                          <SelectItem value="gt">Greater Than (&gt;)</SelectItem>
                          <SelectItem value="lt">Less Than (&lt;)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[10px] font-semibold text-muted-foreground">Value</Label>
                      {condField === 'accountId' ? (
                        <Select value={condValue} onValueChange={(val) => setCondValue(val || '')}>
                          <SelectTrigger className="h-10 rounded-xl bg-background/25 border-border/40 text-xs">
                            <SelectValue placeholder="Select Account" />
                          </SelectTrigger>
                          <SelectContent>
                            {accounts.map(a => (
                              <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : condField === 'type' ? (
                        <Select value={condValue} onValueChange={(val) => setCondValue(val || '')}>
                          <SelectTrigger className="h-10 rounded-xl bg-background/25 border-border/40 text-xs">
                            <SelectValue placeholder="Select Type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="INCOME">Income</SelectItem>
                            <SelectItem value="EXPENSE">Expense</SelectItem>
                            <SelectItem value="TRANSFER">Transfer</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          value={condValue}
                          onChange={(e) => setCondValue(e.target.value)}
                          placeholder="Condition value"
                          className="h-10 rounded-xl bg-background/25 border-border/40 font-mono text-xs"
                          required
                        />
                      )}
                    </div>
                  </div>

                  <h4 className="text-xs font-bold text-foreground flex items-center gap-2 pt-2 border-t border-border/10">
                    <Check className="h-4 w-4 text-emerald-500" /> Actions (Then perform this)
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-semibold text-muted-foreground">Action Type</Label>
                      <Select value={actType} onValueChange={(val) => setActType(val || 'setCategory')}>
                        <SelectTrigger className="h-10 rounded-xl bg-background/25 border-border/40 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="setCategory">Assign Category</SelectItem>
                          <SelectItem value="setDescription">Rewrite Description</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[10px] font-semibold text-muted-foreground">Value</Label>
                      {actType === 'setCategory' ? (
                        <Select value={actValue} onValueChange={(val) => setActValue(val || '')}>
                          <SelectTrigger className="h-10 rounded-xl bg-background/25 border-border/40 text-xs">
                            <SelectValue placeholder="Select Category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map(c => (
                              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          value={actValue}
                          onChange={(e) => setActValue(e.target.value)}
                          placeholder="e.g. Swiggy Food Order"
                          className="h-10 rounded-xl bg-background/25 border-border/40 text-xs"
                          required
                        />
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Rule specs: SCHEDULED */}
              {triggerType === 'SCHEDULED' && (
                <div className="space-y-4 border p-4 rounded-xl border-border/30 bg-accent/5">
                  <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
                    <Clock className="h-4 w-4 text-violet-500" /> Auto-Generated Transaction Details
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-semibold text-muted-foreground">Frequency</Label>
                      <Select value={schedFreq} onValueChange={(val) => setSchedFreq(val || 'MONTHLY')}>
                        <SelectTrigger className="h-10 rounded-xl bg-background/25 border-border/40 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DAILY">Daily</SelectItem>
                          <SelectItem value="WEEKLY">Weekly</SelectItem>
                          <SelectItem value="MONTHLY">Monthly</SelectItem>
                          <SelectItem value="YEARLY">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[10px] font-semibold text-muted-foreground">Amount (₹)</Label>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={schedAmount}
                        onChange={(e) => setSchedAmount(e.target.value)}
                        className="h-10 rounded-xl bg-background/25 border-border/40 font-mono text-xs"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[10px] font-semibold text-muted-foreground">Type</Label>
                      <Select value={schedType} onValueChange={(val) => setSchedType(val || 'EXPENSE')}>
                        <SelectTrigger className="h-10 rounded-xl bg-background/25 border-border/40 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EXPENSE">Expense</SelectItem>
                          <SelectItem value="INCOME">Income</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-semibold text-muted-foreground">Ledger Account</Label>
                      <Select value={schedAccountId} onValueChange={(val) => setSchedAccountId(val || '')}>
                        <SelectTrigger className="h-10 rounded-xl bg-background/25 border-border/40 text-xs">
                          <SelectValue placeholder="Select Account" />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts.map(a => (
                            <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[10px] font-semibold text-muted-foreground">Category</Label>
                      <Select value={schedCategoryId} onValueChange={(val) => setSchedCategoryId(val || '')}>
                        <SelectTrigger className="h-10 rounded-xl bg-background/25 border-border/40 text-xs">
                          <SelectValue placeholder="Select Category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="schedDesc" className="text-[10px] font-semibold text-muted-foreground">Description</Label>
                    <Input
                      id="schedDesc"
                      placeholder="e.g. Monthly Rent Payment"
                      value={schedDescription}
                      onChange={(e) => setSchedDescription(e.target.value)}
                      className="h-10 rounded-xl bg-background/25 border-border/40 text-xs"
                      required
                    />
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="rounded-xl h-11">
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} className="rounded-xl h-11">
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : editingRule ? 'Update Rule' : 'Create Rule'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
