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
import { ArrowLeft, Loader2, Plus, Edit2, Trash2, Zap } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

interface FlowTypeItem {
  id: string;
  name: string;
  direction: string;
  color: string | null;
  description: string | null;
  isActive: boolean;
}

export default function FlowTypesSettingsPage() {
  const [isPending, startTransition] = useTransition();
  const [flowTypes, setFlowTypes] = useState<FlowTypeItem[]>([]);
  const [newFlowName, setNewFlowName] = useState('');
  const [newFlowDirection, setNewFlowDirection] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [newFlowColor, setNewFlowColor] = useState('#6366f1');
  const [editingFlowId, setEditingFlowId] = useState<string | null>(null);
  const [editFlowName, setEditFlowName] = useState('');
  const [editFlowDirection, setEditFlowDirection] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');

  const fetchFlowTypes = async () => {
    try {
      const ftRes = await fetch('/api/flow-types');
      if (ftRes.ok) {
        const ftData = await ftRes.json();
        setFlowTypes(ftData);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchFlowTypes();
  }, []);

  const handleAddFlowType = async () => {
    if (!newFlowName.trim()) {
      toast.error('Flow name is required');
      return;
    }
    try {
      const res = await fetch('/api/flow-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newFlowName.trim(),
          direction: newFlowDirection,
          color: newFlowColor,
        }),
      });
      if (!res.ok) throw new Error('Failed to create flow type');
      const newFt = await res.json();
      setFlowTypes([...flowTypes, newFt]);
      setNewFlowName('');
      toast.success('Custom flow type created successfully');
    } catch (err) {
      console.error(err);
      toast.error('Failed to create flow type');
    }
  };

  const handleUpdateFlowType = async (id: string) => {
    if (!editFlowName.trim()) {
      toast.error('Flow name is required');
      return;
    }
    try {
      const res = await fetch(`/api/flow-types/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editFlowName.trim(),
          direction: editFlowDirection,
        }),
      });
      if (!res.ok) throw new Error('Failed to update flow type');
      const updated = await res.json();
      setFlowTypes(flowTypes.map(f => f.id === id ? updated : f));
      setEditingFlowId(null);
      toast.success('Flow type updated successfully');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update flow type');
    }
  };

  const handleDeleteFlowType = async (id: string) => {
    if (!confirm('Are you sure you want to delete this flow type?')) return;
    try {
      const res = await fetch(`/api/flow-types/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete flow type');
      setFlowTypes(flowTypes.filter(f => f.id !== id));
      toast.success('Flow type deleted successfully');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete flow type');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link href="/settings">
          <Button variant="ghost" size="icon" className="h-9 w-9 border border-border/40 bg-card/40 rounded-xl hover:bg-accent">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <PageHeader title="Custom Flow Types" description="Configure personalized financial flows for double-entry categorizations" />
      </div>

      <Card className="glass border-border bg-card/60 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            Manage Custom Flow Types
          </CardTitle>
          <CardDescription>Custom flows allow you to track specialized cash categories separate from system enums.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Add new flow type */}
          <div className="p-4 rounded-xl border border-border/20 bg-background/20 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Add New Custom Flow Type</h4>
            <div className="grid gap-4 md:grid-cols-3 items-end">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground font-semibold">Flow Name</Label>
                <Input
                  placeholder="e.g. Salary, Rent, Taxes"
                  value={newFlowName}
                  onChange={(e) => setNewFlowName(e.target.value)}
                  className="h-10 px-3 bg-background/50 rounded-lg"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground font-semibold">Direction</Label>
                <Select
                  value={newFlowDirection}
                  onValueChange={(val: any) => setNewFlowDirection(val as any)}
                >
                  <SelectTrigger className="h-10 bg-background/50 rounded-lg">
                    <SelectValue placeholder="Select Direction" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EXPENSE">Outflow (Expense)</SelectItem>
                    <SelectItem value="INCOME">Inflow (Income)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <div className="flex-1 space-y-1.5">
                  <Label className="text-xs text-muted-foreground font-semibold">Label Color</Label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={newFlowColor}
                      onChange={(e) => setNewFlowColor(e.target.value)}
                      className="h-10 w-12 bg-transparent cursor-pointer rounded-lg border border-border/30"
                    />
                    <Input
                      value={newFlowColor}
                      onChange={(e) => setNewFlowColor(e.target.value)}
                      className="h-10 px-3 bg-background/50 rounded-lg font-mono text-xs"
                    />
                  </div>
                </div>
                <Button onClick={handleAddFlowType} className="h-10 gradient-primary text-white font-semibold px-4 rounded-lg">
                  <Plus className="h-4 w-4 mr-1.5" /> Add
                </Button>
              </div>
            </div>
          </div>

          {/* Flow Types list */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Existing Custom Flow Types</h4>
            {flowTypes.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground border border-dashed rounded-xl bg-background/5">
                No custom flow types defined yet. Use the builder above to add one.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {flowTypes.map((ft) => (
                  <div key={ft.id} className="p-3.5 rounded-xl border border-border/20 bg-background/10 space-y-3 flex flex-col justify-between">
                    {editingFlowId === ft.id ? (
                      <div className="space-y-2">
                        <Input
                          value={editFlowName}
                          onChange={(e) => setEditFlowName(e.target.value)}
                          className="h-9 px-3 bg-background/50 rounded-lg text-xs"
                        />
                        <Select
                          value={editFlowDirection}
                          onValueChange={(val: any) => setEditFlowDirection(val as any)}
                        >
                          <SelectTrigger className="h-9 bg-background/50 rounded-lg text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="EXPENSE">Outflow (Expense)</SelectItem>
                            <SelectItem value="INCOME">Inflow (Income)</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="flex gap-2 justify-end pt-1">
                          <Button size="sm" variant="ghost" className="h-8 text-xs text-emerald-500 hover:bg-emerald-500/10" onClick={() => handleUpdateFlowType(ft.id)}>
                            Save
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 text-xs text-muted-foreground" onClick={() => setEditingFlowId(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span
                              className="text-xs font-bold px-2 py-0.5 rounded border"
                              style={{
                                backgroundColor: `${ft.color || '#6366f1'}15`,
                                color: ft.color || '#6366f1',
                                borderColor: `${ft.color || '#6366f1'}30`
                              }}
                            >
                              {ft.name}
                            </span>
                            <span className="text-[10px] uppercase font-bold text-muted-foreground">
                              {ft.direction === 'INCOME' ? 'Inflow' : 'Outflow'}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2 justify-end mt-2 pt-2 border-t border-border/5">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 rounded-md"
                            onClick={() => {
                              setEditingFlowId(ft.id);
                              setEditFlowName(ft.name);
                              setEditFlowDirection(ft.direction as any);
                            }}
                          >
                            <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 rounded-md text-rose-500 hover:bg-rose-500/10"
                            onClick={() => handleDeleteFlowType(ft.id)}
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
