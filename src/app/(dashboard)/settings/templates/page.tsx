'use client';

import { useEffect, useState, useTransition } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, Plus, Edit2, Trash2, FileSpreadsheet, Tag, CreditCard, Receipt } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

interface Account {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
}

interface FlowType {
  id: string;
  name: string;
}

interface TemplateItem {
  id: string;
  name: string;
  amount: number | null;
  type: string;
  flowType: string | null;
  description: string | null;
  merchant: string | null;
  location: string | null;
  notes: string | null;
  accountId: string;
  categoryId: string | null;
}

export default function TemplatesSettingsPage() {
  const [isPending, startTransition] = useTransition();
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [flowTypes, setFlowTypes] = useState<FlowType[]>([]);

  // Add Template state
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newType, setNewType] = useState('EXPENSE');
  const [newFlowType, setNewFlowType] = useState('none');
  const [newDescription, setNewDescription] = useState('');
  const [newMerchant, setNewMerchant] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newAccountId, setNewAccountId] = useState('');
  const [newCategoryId, setNewCategoryId] = useState('none');

  // Editing Template state
  const [editingTplId, setEditingTplId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editType, setEditType] = useState('EXPENSE');
  const [editFlowType, setEditFlowType] = useState('none');
  const [editDescription, setEditDescription] = useState('');
  const [editMerchant, setEditMerchant] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editAccountId, setEditAccountId] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('none');

  const fetchData = async () => {
    try {
      const [tplRes, accRes, catRes, ftRes] = await Promise.all([
        fetch('/api/templates'),
        fetch('/api/accounts'),
        fetch('/api/categories'),
        fetch('/api/flow-types'),
      ]);

      if (tplRes.ok) setTemplates(await tplRes.json());
      if (accRes.ok) {
        const accData = await accRes.json();
        setAccounts(accData);
        if (accData.length > 0) setNewAccountId(accData[0].id);
      }
      if (catRes.ok) setCategories(await catRes.json());
      if (ftRes.ok) setFlowTypes(await ftRes.json());
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddTemplate = async () => {
    if (!newName.trim()) {
      toast.error('Template name is required');
      return;
    }
    if (!newAccountId) {
      toast.error('Default account is required');
      return;
    }

    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          amount: newAmount ? parseFloat(newAmount) : null,
          type: newType,
          flowType: (!newFlowType || newFlowType === 'none') ? null : newFlowType,
          description: newDescription.trim() || null,
          merchant: newMerchant.trim() || null,
          location: newLocation.trim() || null,
          notes: newNotes.trim() || null,
          accountId: newAccountId,
          categoryId: (!newCategoryId || newCategoryId === 'none') ? null : newCategoryId,
        }),
      });

      if (!res.ok) throw new Error('Failed to create template');
      const created = await res.json();
      setTemplates([...templates, created]);
      
      // Clear inputs
      setNewName('');
      setNewAmount('');
      setNewDescription('');
      setNewMerchant('');
      setNewLocation('');
      setNewNotes('');
      setNewFlowType('none');
      setNewCategoryId('none');
      toast.success('Template saved successfully');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save template');
    }
  };

  const handleUpdateTemplate = async (id: string) => {
    if (!editName.trim()) {
      toast.error('Template name is required');
      return;
    }
    if (!editAccountId) {
      toast.error('Default account is required');
      return;
    }

    try {
      const res = await fetch(`/api/templates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          amount: editAmount ? parseFloat(editAmount) : null,
          type: editType,
          flowType: (!editFlowType || editFlowType === 'none') ? null : editFlowType,
          description: editDescription.trim() || null,
          merchant: editMerchant.trim() || null,
          location: editLocation.trim() || null,
          notes: editNotes.trim() || null,
          accountId: editAccountId,
          categoryId: (!editCategoryId || editCategoryId === 'none') ? null : editCategoryId,
        }),
      });

      if (!res.ok) throw new Error('Failed to update template');
      const updated = await res.json();
      setTemplates(templates.map(t => t.id === id ? { ...updated, amount: updated.amount ? Number(updated.amount) : null } : t));
      setEditingTplId(null);
      toast.success('Template updated successfully');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update template');
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    try {
      const res = await fetch(`/api/templates/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete template');
      setTemplates(templates.filter(t => t.id !== id));
      toast.success('Template deleted successfully');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete template');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex items-center gap-3">
        <Link href="/settings">
          <Button variant="ghost" size="icon" className="h-9 w-9 border border-border/40 bg-card/40 rounded-xl hover:bg-accent">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <PageHeader title="Transaction Templates" description="Manage saved templates for prefilling fast transactions" />
      </div>

      <Card className="glass border-border bg-card/60 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-amber-500" />
            Manage Transaction Templates
          </CardTitle>
          <CardDescription>Templates allow you to save standard transaction shapes (like Netflix, Rent, Salary) for 1-click pre-fills.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Add Template */}
          <div className="p-5 rounded-xl border border-border/20 bg-background/20 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Create New Template</h4>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <Label className="text-xs text-muted-foreground font-semibold">Template Display Name</Label>
                <Input
                  placeholder="e.g. Monthly Rent, Daily Chai"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="h-10 px-3 bg-background/50 rounded-lg text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground font-semibold">Pre-filled Amount (Optional)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 500"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  className="h-10 px-3 bg-background/50 rounded-lg text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground font-semibold">Transaction Category Type</Label>
                <Select value={newType} onValueChange={(val: any) => val && setNewType(val)}>
                  <SelectTrigger className="h-10 bg-background/50 rounded-lg text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EXPENSE">Expense</SelectItem>
                    <SelectItem value="INCOME">Income</SelectItem>
                    <SelectItem value="TRANSFER">Transfer</SelectItem>
                    <SelectItem value="INVESTMENT">Investment</SelectItem>
                    <SelectItem value="REFUND">Refund</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground font-semibold">Source Account</Label>
                <Select value={newAccountId} onValueChange={(val: any) => val && setNewAccountId(val)}>
                  <SelectTrigger className="h-10 bg-background/50 rounded-lg text-sm">
                    <SelectValue placeholder="Select Account">
                      {accounts.find(a => a.id === newAccountId)?.name}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map(acc => (
                      <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground font-semibold">Category (Optional)</Label>
                <Select value={newCategoryId} onValueChange={(val: any) => val && setNewCategoryId(val)}>
                  <SelectTrigger className="h-10 bg-background/50 rounded-lg text-sm">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Category</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground font-semibold">Custom Flow Type (Optional)</Label>
                <Select value={newFlowType} onValueChange={(val: any) => val && setNewFlowType(val)}>
                  <SelectTrigger className="h-10 bg-background/50 rounded-lg text-sm">
                    <SelectValue placeholder="Select Custom Flow" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {flowTypes.map(ft => (
                      <SelectItem key={ft.id} value={ft.name}>{ft.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground font-semibold">Description Prefill</Label>
                <Input
                  placeholder="e.g. Rent Payment"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="h-10 px-3 bg-background/50 rounded-lg text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground font-semibold">Merchant Name</Label>
                <Input
                  placeholder="e.g. Starbucks"
                  value={newMerchant}
                  onChange={(e) => setNewMerchant(e.target.value)}
                  className="h-10 px-3 bg-background/50 rounded-lg text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={handleAddTemplate} className="h-10 gradient-primary text-white font-semibold px-5 rounded-lg">
                <Plus className="h-4 w-4 mr-1.5" /> Save Template
              </Button>
            </div>
          </div>

          {/* List templates */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Existing Templates</h4>
            {templates.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground border border-dashed rounded-xl bg-background/5">
                No templates saved yet. Add templates here or save one directly when adding transactions.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {templates.map((tpl) => (
                  <div key={tpl.id} className="p-4 rounded-xl border border-border/20 bg-background/10 space-y-3 flex flex-col justify-between">
                    {editingTplId === tpl.id ? (
                      <div className="space-y-2">
                        <Input
                          placeholder="Template Name"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="h-9 px-3 bg-background/50 rounded-lg text-xs"
                        />
                        <Input
                          placeholder="Amount"
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                          className="h-9 px-3 bg-background/50 rounded-lg text-xs"
                        />
                        <Select value={editAccountId} onValueChange={(val: any) => val && setEditAccountId(val)}>
                          <SelectTrigger className="h-9 bg-background/50 rounded-lg text-xs">
                            <SelectValue placeholder="Select Account">
                              {accounts.find(a => a.id === editAccountId)?.name}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {accounts.map(acc => (
                              <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex gap-2 justify-end pt-1">
                          <Button size="sm" variant="ghost" className="h-8 text-xs text-emerald-500 hover:bg-emerald-500/10" onClick={() => handleUpdateTemplate(tpl.id)}>
                            Save
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 text-xs text-muted-foreground" onClick={() => setEditingTplId(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-foreground truncate">{tpl.name}</span>
                            <span className="text-[10px] uppercase font-bold text-muted-foreground">{tpl.type}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-1 text-[11px] text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <CreditCard className="h-3 w-3 shrink-0" />
                              <span className="truncate">{accounts.find(a => a.id === tpl.accountId)?.name || 'Default Acc'}</span>
                            </div>
                            {tpl.amount && (
                              <div className="text-right font-semibold text-foreground">
                                ₹{tpl.amount}
                              </div>
                            )}
                            {tpl.categoryId && (
                              <div className="flex items-center gap-1.5 col-span-2 mt-1">
                                <Tag className="h-3 w-3 shrink-0" />
                                <span className="truncate">{categories.find(c => c.id === tpl.categoryId)?.name || 'Category'}</span>
                              </div>
                            )}
                            {tpl.flowType && (
                              <div className="flex items-center gap-1.5 col-span-2 mt-0.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                                <span className="truncate">Flow: {tpl.flowType}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2 justify-end mt-2 pt-2 border-t border-border/5">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 rounded-md"
                            onClick={() => {
                              setEditingTplId(tpl.id);
                              setEditName(tpl.name);
                              setEditAmount(tpl.amount ? tpl.amount.toString() : '');
                              setEditType(tpl.type);
                              setEditFlowType(tpl.flowType || 'none');
                              setEditDescription(tpl.description || '');
                              setEditMerchant(tpl.merchant || '');
                              setEditLocation(tpl.location || '');
                              setEditNotes(tpl.notes || '');
                              setEditAccountId(tpl.accountId);
                              setEditCategoryId(tpl.categoryId || 'none');
                            }}
                          >
                            <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 rounded-md text-rose-500 hover:bg-rose-500/10"
                            onClick={() => handleDeleteTemplate(tpl.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
