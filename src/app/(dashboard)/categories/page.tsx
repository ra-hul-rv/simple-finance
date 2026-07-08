'use client';

import { useEffect, useState, useTransition } from 'react';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  Edit2,
  Trash2,
  ChevronRight,
  FolderOpen,
  ArrowLeft,
  Loader2,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';

interface Category {
  id: string;
  name: string;
  type: 'INCOME' | 'EXPENSE';
  color: string;
  icon: string;
  description: string | null;
  budgetAmount: number | null;
  parentId: string | null;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');

  // Hierarchy selections
  const [selectedRootId, setSelectedRootId] = useState<string | null>(null);
  const [selectedSub1Id, setSelectedSub1Id] = useState<string | null>(null);

  // Dialog forms
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isPending, startTransition] = useTransition();

  // Form states
  const [name, setName] = useState('');
  const [color, setColor] = useState('#f97316');
  const [icon, setIcon] = useState('tag');
  const [budgetAmount, setBudgetAmount] = useState('');
  const [parentId, setParentId] = useState<string | null>(null);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      if (!res.ok) throw new Error('Failed to load categories');
      const data = await res.json();
      setCategories(data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const roots = categories.filter((c) => c.type === currentTab && !c.parentId);
  
  const subLevel1 = selectedRootId
    ? categories.filter((c) => c.parentId === selectedRootId)
    : [];

  const subLevel2 = selectedSub1Id
    ? categories.filter((c) => c.parentId === selectedSub1Id)
    : [];

  const handleOpenAddDialog = (parentCatId: string | null = null) => {
    setEditingCategory(null);
    setName('');
    setColor(parentCatId ? categories.find(c => c.id === parentCatId)?.color || '#f97316' : '#f97316');
    setIcon('tag');
    setBudgetAmount('');
    setParentId(parentCatId);
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (category: Category) => {
    setEditingCategory(category);
    setName(category.name);
    setColor(category.color);
    setIcon(category.icon);
    setBudgetAmount(category.budgetAmount ? category.budgetAmount.toString() : '');
    setParentId(category.parentId);
    setIsDialogOpen(true);
  };

  const handleSaveCategory = () => {
    if (!name.trim()) {
      toast.error('Please enter a name');
      return;
    }

    startTransition(async () => {
      try {
        const payload = {
          name,
          type: currentTab,
          color,
          icon,
          budgetAmount: budgetAmount ? parseFloat(budgetAmount) : null,
          parentId,
        };

        const url = editingCategory ? `/api/categories/${editingCategory.id}` : '/api/categories';
        const method = editingCategory ? 'PUT' : 'POST';

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) throw new Error('Failed to save category');

        toast.success(editingCategory ? 'Category updated' : 'Category created');
        setIsDialogOpen(false);
        fetchCategories();
      } catch (err) {
        console.error(err);
        toast.error('Failed to save category');
      }
    });
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category? Child categories will become parentless.')) {
      return;
    }

    try {
      const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete category');
      toast.success('Category deleted');
      if (selectedRootId === id) setSelectedRootId(null);
      if (selectedSub1Id === id) setSelectedSub1Id(null);
      fetchCategories();
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete category');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Expense Tree" description="Manage hierarchical category mappings and targets">
        <Button size="sm" onClick={() => handleOpenAddDialog(null)} className="h-8 gap-1 gradient-primary">
          <Plus className="h-4 w-4" />
          Add Root Category
        </Button>
      </PageHeader>

      <div className="flex justify-between items-center bg-card/40 p-1.5 rounded-lg border border-border/50 max-w-[280px]">
        <Tabs value={currentTab} onValueChange={(val) => {
          setCurrentTab(val as 'EXPENSE' | 'INCOME');
          setSelectedRootId(null);
          setSelectedSub1Id(null);
        }} className="w-full">
          <TabsList className="grid grid-cols-2 w-full h-8">
            <TabsTrigger value="EXPENSE" className="text-xs">Expense</TabsTrigger>
            <TabsTrigger value="INCOME" className="text-xs">Income</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-3 h-[550px] overflow-hidden items-stretch">
          {/* Column 1: Primary Root */}
          <Card className="glass flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between border-b p-4">
              <span className="label-uppercase text-xs font-bold text-muted-foreground">Primary Root</span>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary font-bold">{roots.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-thin">
              {roots.map((cat) => (
                <div
                  key={cat.id}
                  onClick={() => {
                    setSelectedRootId(cat.id);
                    setSelectedSub1Id(null);
                  }}
                  className={`flex items-center justify-between rounded-lg p-3 text-sm font-semibold transition-all duration-200 cursor-pointer ${
                    selectedRootId === cat.id
                      ? 'bg-primary/15 text-primary shadow-sm border border-primary/20'
                      : 'hover:bg-accent/40 text-muted-foreground hover:text-foreground border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                    <span className="truncate">{cat.name}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEditDialog(cat);
                      }}
                      className="p-1 text-muted-foreground hover:text-foreground hover:bg-accent rounded transition-all"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCategory(cat.id);
                      }}
                      className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-all"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <ChevronRight className="h-4 w-4 ml-1 opacity-65" />
                  </div>
                </div>
              ))}
              {roots.length === 0 && (
                <div className="flex h-32 flex-col items-center justify-center text-xs text-muted-foreground">
                  <FolderOpen className="h-8 w-8 mb-2 opacity-50" />
                  No categories found
                </div>
              )}
            </div>
          </Card>

          {/* Column 2: Sub Level 1 */}
          <Card className="glass flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between border-b p-4">
              <span className="label-uppercase text-xs font-bold text-muted-foreground">Sub Level 1</span>
              {selectedRootId && (
                <div className="flex items-center gap-2">
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => handleOpenAddDialog(selectedRootId)}
                    className="h-6 w-6 rounded-md p-0 hover:bg-primary/20"
                  >
                    <Plus className="h-4 w-4 text-primary" />
                  </Button>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary font-bold">
                    {subLevel1.length}
                  </span>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-thin">
              {selectedRootId ? (
                subLevel1.map((cat) => (
                  <div
                    key={cat.id}
                    onClick={() => setSelectedSub1Id(cat.id)}
                    className={`flex items-center justify-between rounded-lg p-3 text-sm font-semibold transition-all duration-200 cursor-pointer ${
                      selectedSub1Id === cat.id
                        ? 'bg-primary/15 text-primary shadow-sm border border-primary/20'
                        : 'hover:bg-accent/40 text-muted-foreground hover:text-foreground border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0 animate-pulse-soft" style={{ backgroundColor: cat.color }} />
                      <span className="truncate">{cat.name}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditDialog(cat);
                        }}
                        className="p-1 text-muted-foreground hover:text-foreground hover:bg-accent rounded transition-all"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCategory(cat.id);
                        }}
                        className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-all"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      <ChevronRight className="h-4 w-4 ml-1 opacity-65" />
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                  Select a root category to view sub-levels
                </div>
              )}
              {selectedRootId && subLevel1.length === 0 && (
                <div className="flex h-32 flex-col items-center justify-center text-xs text-muted-foreground">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenAddDialog(selectedRootId)}
                    className="h-8 gap-1 border-dashed hover:border-primary/50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Create subcategory
                  </Button>
                </div>
              )}
            </div>
          </Card>

          {/* Column 3: Sub Level 2 */}
          <Card className="glass flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between border-b p-4">
              <span className="label-uppercase text-xs font-bold text-muted-foreground">Sub Level 2</span>
              {selectedSub1Id && (
                <div className="flex items-center gap-2">
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => handleOpenAddDialog(selectedSub1Id)}
                    className="h-6 w-6 rounded-md p-0 hover:bg-primary/20"
                  >
                    <Plus className="h-4 w-4 text-primary" />
                  </Button>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary font-bold">
                    {subLevel2.length}
                  </span>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-thin">
              {selectedSub1Id ? (
                subLevel2.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between rounded-lg p-3 text-sm font-semibold border border-border/30 bg-background/25"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                      <span className="truncate">{cat.name}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleOpenEditDialog(cat)}
                        className="p-1 text-muted-foreground hover:text-foreground hover:bg-accent rounded transition-all"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-all"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                  Select a first level subcategory
                </div>
              )}
              {selectedSub1Id && subLevel2.length === 0 && (
                <div className="flex h-32 flex-col items-center justify-center text-xs text-muted-foreground">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenAddDialog(selectedSub1Id)}
                    className="h-8 gap-1 border-dashed hover:border-primary/50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Create leaf node
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Add / Edit Category Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Edit Category' : 'Create Category'}</DialogTitle>
            <DialogDescription>
              Set properties for this category node.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="label-uppercase text-muted-foreground">Category Name</Label>
              <Input
                placeholder="e.g. Broadband Bill"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isPending}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Color Badge</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="color"
                    className="w-12 h-9 p-0.5 border rounded-lg cursor-pointer bg-background"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    disabled={isPending}
                  />
                  <span className="text-xs font-mono">{color}</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Icon Symbol</Label>
                <Select value={icon} onValueChange={(val) => setIcon(val || 'tag')} disabled={isPending}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Icon">
                      {icon === 'tag' ? 'Tag' : icon === 'utensils' ? 'Utensils' : icon === 'car' ? 'Car' : icon === 'shopping-bag' ? 'Bag' : icon === 'zap' ? 'Zap' : icon === 'film' ? 'Film' : icon === 'heart-pulse' ? 'Heart' : icon === 'graduation-cap' ? 'Cap' : icon}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tag">Tag</SelectItem>
                    <SelectItem value="utensils">Utensils</SelectItem>
                    <SelectItem value="car">Car</SelectItem>
                    <SelectItem value="shopping-bag">Bag</SelectItem>
                    <SelectItem value="zap">Zap</SelectItem>
                    <SelectItem value="film">Film</SelectItem>
                    <SelectItem value="heart-pulse">Heart</SelectItem>
                    <SelectItem value="graduation-cap">Cap</SelectItem>
                    <SelectItem value="home">Home</SelectItem>
                    <SelectItem value="shield">Shield</SelectItem>
                    <SelectItem value="repeat">Repeat</SelectItem>
                    <SelectItem value="plane">Plane</SelectItem>
                    <SelectItem value="gift">Gift</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {currentTab === 'EXPENSE' && (
              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Monthly Budget Cap (Optional)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 5000"
                  value={budgetAmount}
                  onChange={(e) => setBudgetAmount(e.target.value)}
                  disabled={isPending}
                />
              </div>
            )}
            {parentId && (
              <div className="flex items-center gap-2 rounded-lg bg-primary/5 border border-primary/20 p-3 text-xs text-primary font-medium">
                <Info className="h-4 w-4 shrink-0" />
                This node will be linked as a sub-level under:{' '}
                <strong className="underline">
                  {categories.find((c) => c.id === parentId)?.name}
                </strong>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleSaveCategory} disabled={isPending} className="gradient-primary">
              {isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
