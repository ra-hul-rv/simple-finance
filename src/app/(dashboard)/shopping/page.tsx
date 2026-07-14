'use client';

import { useEffect, useState, useTransition } from 'react';
import { 
  ShoppingBag, 
  Plus, 
  Trash2, 
  CheckSquare, 
  Square, 
  CreditCard, 
  ArrowRight, 
  Sparkles, 
  FolderPlus,
  Loader2,
  AlertCircle,
  TrendingDown,
  Coins,
  CheckCircle2,
  Calendar,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

interface ShoppingItem {
  id: string;
  name: string;
  estimatedPrice: number | null;
  quantity: number;
  checked: boolean;
}

interface ShoppingList {
  id: string;
  name: string;
  color: string;
  isCompleted: boolean;
  items: ShoppingItem[];
  createdAt: string;
}

interface Account {
  id: string;
  name: string;
  balance: number;
}

interface Category {
  id: string;
  name: string;
  type: string;
}

export default function ShoppingPage() {
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New List dialog state
  const [isNewListOpen, setIsNewListOpen] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListColor, setNewListColor] = useState('#ec4899');

  // New Item form state
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemQty, setNewItemQty] = useState('1');

  // Convert to Expense Dialog state
  const [isConvertOpen, setIsConvertOpen] = useState(false);
  const [convertAccountId, setConvertAccountId] = useState('');
  const [convertCategoryId, setConvertCategoryId] = useState('');
  const [convertDescription, setConvertDescription] = useState('');
  const [convertDate, setConvertDate] = useState(() => new Date().toISOString().split('T')[0]);

  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch initial data
  useEffect(() => {
    async function loadData() {
      try {
        const [listsRes, accountsRes, categoriesRes] = await Promise.all([
          fetch('/api/shopping-lists'),
          fetch('/api/accounts'),
          fetch('/api/categories'),
        ]);

        if (listsRes.ok && accountsRes.ok && categoriesRes.ok) {
          const listsData = await listsRes.json();
          const accountsData = await accountsRes.json();
          const categoriesData = await categoriesRes.json();

          setLists(listsData);
          setAccounts(accountsData);
          
          // Filter categories to only expense categories
          const expenseCategories = categoriesData.filter((c: any) => c.type === 'EXPENSE');
          setCategories(expenseCategories);

          // Auto select first list
          if (listsData.length > 0) {
            setSelectedListId(listsData[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load shopping page data:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  const activeList = lists.find((l) => l.id === selectedListId);

  // Totals calculations
  const totalEstimated = activeList
    ? activeList.items.reduce((sum, item) => sum + (item.estimatedPrice || 0) * item.quantity, 0)
    : 0;

  const totalChecked = activeList
    ? activeList.items
        .filter((item) => item.checked)
        .reduce((sum, item) => sum + (item.estimatedPrice || 0) * item.quantity, 0)
    : 0;

  const checkedCount = activeList ? activeList.items.filter((item) => item.checked).length : 0;
  const totalCount = activeList ? activeList.items.length : 0;

  // Create List
  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;

    setErrorMessage(null);
    startTransition(async () => {
      try {
        const res = await fetch('/api/shopping-lists', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newListName, color: newListColor }),
        });

        if (res.ok) {
          const newList = await res.json();
          setLists([newList, ...lists]);
          setSelectedListId(newList.id);
          setNewListName('');
          setNewListColor('#ec4899');
          setIsNewListOpen(false);
        } else {
          const err = await res.json();
          setErrorMessage(err.error || 'Failed to create list');
        }
      } catch (err) {
        setErrorMessage('Failed to connect to server');
      }
    });
  };

  // Delete List
  const handleDeleteList = async (id: string) => {
    if (!confirm('Are you sure you want to delete this shopping list?')) return;

    try {
      const res = await fetch(`/api/shopping-lists/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        const updatedLists = lists.filter((l) => l.id !== id);
        setLists(updatedLists);
        if (selectedListId === id) {
          setSelectedListId(updatedLists.length > 0 ? updatedLists[0].id : null);
        }
      }
    } catch (err) {
      console.error('Failed to delete list:', err);
    }
  };

  // Add Item to list
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedListId || !newItemName.trim()) return;

    setErrorMessage(null);
    const price = newItemPrice.trim() ? parseFloat(newItemPrice) : null;
    const qty = parseInt(newItemQty) || 1;

    try {
      const res = await fetch(`/api/shopping-lists/${selectedListId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newItemName, estimatedPrice: price, quantity: qty }),
      });

      if (res.ok) {
        const newItem = await res.json();
        setLists(
          lists.map((list) => {
            if (list.id === selectedListId) {
              return { ...list, items: [...list.items, newItem] };
            }
            return list;
          })
        );
        setNewItemName('');
        setNewItemPrice('');
        setNewItemQty('1');
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to add item');
      }
    } catch (err) {
      console.error('Failed to add item:', err);
    }
  };

  // Toggle Item checkbox status
  const handleToggleItem = async (itemId: string, currentChecked: boolean) => {
    if (!selectedListId) return;

    // Optimistic UI update
    setLists(
      lists.map((list) => {
        if (list.id === selectedListId) {
          return {
            ...list,
            items: list.items.map((item) =>
              item.id === itemId ? { ...item, checked: !currentChecked } : item
            ),
          };
        }
        return list;
      })
    );

    try {
      const res = await fetch(`/api/shopping-lists/${selectedListId}/items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checked: !currentChecked }),
      });

      if (!res.ok) {
        // Rollback on failure
        setLists(
          lists.map((list) => {
            if (list.id === selectedListId) {
              return {
                ...list,
                items: list.items.map((item) =>
                  item.id === itemId ? { ...item, checked: currentChecked } : item
                ),
              };
            }
            return list;
          })
        );
      }
    } catch (err) {
      console.error('Failed to toggle item:', err);
    }
  };

  // Delete Item from list
  const handleDeleteItem = async (itemId: string) => {
    if (!selectedListId) return;

    try {
      const res = await fetch(`/api/shopping-lists/${selectedListId}/items/${itemId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setLists(
          lists.map((list) => {
            if (list.id === selectedListId) {
              return { ...list, items: list.items.filter((item) => item.id !== itemId) };
            }
            return list;
          })
        );
      }
    } catch (err) {
      console.error('Failed to delete item:', err);
    }
  };

  // Open Convert dialog
  const handleOpenConvert = () => {
    if (!activeList || checkedCount === 0) return;

    // Pre-fill fields
    setConvertDescription(`Shopping List: ${activeList.name}`);
    if (accounts.length > 0) setConvertAccountId(accounts[0].id);
    
    // Attempt to pre-fill with "Groceries" or "Shopping" category
    const groceryCat = categories.find(
      (c) => 
        c.name.toLowerCase().includes('grocery') || 
        c.name.toLowerCase().includes('groceries') ||
        c.name.toLowerCase().includes('shopping')
    );
    if (groceryCat) {
      setConvertCategoryId(groceryCat.id);
    } else if (categories.length > 0) {
      setConvertCategoryId(categories[0].id);
    }

    setErrorMessage(null);
    setIsConvertOpen(true);
  };

  // Convert to Expense POST submit
  const handleConvertExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedListId || !convertAccountId || !convertCategoryId) return;

    setErrorMessage(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/shopping-lists/${selectedListId}/convert-expense`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accountId: convertAccountId,
            categoryId: convertCategoryId,
            description: convertDescription,
            date: new Date(convertDate).toISOString(),
          }),
        });

        if (res.ok) {
          // Success: Update the completed status of the list in local state
          setLists(
            lists.map((list) =>
              list.id === selectedListId ? { ...list, isCompleted: true } : list
            )
          );
          setIsConvertOpen(false);
          alert('Successfully converted completed checklist into a transaction expense!');
        } else {
          const err = await res.json();
          setErrorMessage(err.error || 'Failed to convert list');
        }
      } catch (err) {
        setErrorMessage('Server connection error');
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-pink-500 to-violet-500 bg-clip-text text-transparent flex items-center gap-2">
            <ShoppingBag className="h-6 w-6 text-pink-500" />
            Shopping Checklists
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Build itemized purchase lists, calculate estimated totals, and convert checked expenses directly to your financial ledger.
          </p>
        </div>
        <Button onClick={() => setIsNewListOpen(true)} className="rounded-xl h-10 gap-2 font-semibold">
          <FolderPlus className="h-4 w-4" />
          Create Shopping List
        </Button>
      </div>

      {isLoading ? (
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left panel: Lists grid */}
          <div className="lg:col-span-4 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">Your Lists</h3>
            
            <div className="grid grid-cols-1 gap-3 max-h-[60vh] overflow-y-auto pr-1">
              {lists.map((list) => {
                const totalItems = list.items.length;
                const completedItems = list.items.filter((i) => i.checked).length;
                const progressPct = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

                return (
                  <div
                    key={list.id}
                    onClick={() => setSelectedListId(list.id)}
                    className={`relative overflow-hidden rounded-xl border p-4 cursor-pointer transition-all duration-200 ${
                      selectedListId === list.id
                        ? 'border-primary/50 bg-primary/5 shadow-sm ring-1 ring-primary/30'
                        : 'border-border/40 bg-card hover:bg-accent/10'
                    }`}
                  >
                    {/* Left color bar indicator */}
                    <div 
                      className="absolute left-0 top-0 bottom-0 w-1.5" 
                      style={{ backgroundColor: list.color }}
                    />
                    
                    <div className="flex justify-between items-start pl-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className={`text-sm font-bold truncate ${list.isCompleted && 'line-through text-muted-foreground'}`}>
                            {list.name}
                          </h4>
                          {list.isCompleted && (
                            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 rounded-md bg-emerald-500/10 text-emerald-500 border-0">
                              Logged
                            </Badge>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {completedItems}/{totalItems} items checked • {formatCurrency(
                            list.items.reduce((sum, i) => sum + (i.estimatedPrice || 0) * i.quantity, 0)
                          )}
                        </p>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteList(list.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-border/20 h-1.5 rounded-full mt-3 overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-300"
                        style={{ 
                          width: `${progressPct}%`,
                          backgroundColor: list.isCompleted ? '#10b981' : list.color
                        }}
                      />
                    </div>
                  </div>
                );
              })}

              {lists.length === 0 && (
                <div className="text-center p-8 border border-dashed rounded-xl bg-card/20 border-border/40">
                  <ShoppingBag className="h-8 w-8 text-muted-foreground/60 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-muted-foreground">No shopping lists</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Create a checklist to get started</p>
                </div>
              )}
            </div>
          </div>

          {/* Right panel: Checklist Detail View */}
          <div className="lg:col-span-8">
            {activeList ? (
              <Card className="border-border/40 overflow-hidden shadow-sm">
                <CardHeader 
                  className="flex flex-row justify-between items-center gap-4 text-white py-4"
                  style={{ backgroundColor: activeList.color + '15', borderLeft: `4px solid ${activeList.color}` }}
                >
                  <div className="min-w-0">
                    <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                      {activeList.name}
                      {activeList.isCompleted && (
                        <span className="text-xs font-medium text-emerald-500 flex items-center gap-1">
                          <CheckCircle2 className="h-4 w-4" /> Converted to Expense
                        </span>
                      )}
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground mt-0.5">
                      Estimate: {formatCurrency(totalEstimated)} • Checked items: {checkedCount}/{totalCount}
                    </CardDescription>
                  </div>
                  
                  {!activeList.isCompleted && checkedCount > 0 && (
                    <Button 
                      onClick={handleOpenConvert} 
                      className="rounded-xl font-semibold h-9 shadow-md text-xs gradient-primary border-0"
                    >
                      Convert to Expense
                      <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                    </Button>
                  )}
                </CardHeader>

                <CardContent className="p-6 space-y-6">
                  {/* Summary Bar */}
                  <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-accent/20 border border-border/20 text-center">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Total Items</p>
                      <p className="text-base font-bold text-foreground mt-0.5">{totalCount}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Estimated Total</p>
                      <p className="text-base font-bold text-foreground mt-0.5">{formatCurrency(totalEstimated)}</p>
                    </div>
                    <div className="text-pink-500">
                      <p className="text-[10px] uppercase font-bold text-pink-500/80 tracking-wider">Checked Total</p>
                      <p className="text-base font-bold mt-0.5">{formatCurrency(totalChecked)}</p>
                    </div>
                  </div>

                  {/* Add Item form */}
                  {!activeList.isCompleted && (
                    <form onSubmit={handleAddItem} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                      <div className="sm:col-span-6 space-y-1">
                        <Label htmlFor="itemName" className="text-[10px] font-bold uppercase text-muted-foreground">Item Name</Label>
                        <Input
                          id="itemName"
                          placeholder="e.g. Milk, Keyboard, Fruits"
                          value={newItemName}
                          onChange={(e) => setNewItemName(e.target.value)}
                          className="h-10 rounded-xl bg-background/20 border-border/40"
                          required
                        />
                      </div>
                      <div className="sm:col-span-3 space-y-1">
                        <Label htmlFor="itemPrice" className="text-[10px] font-bold uppercase text-muted-foreground">Est. Unit Price (₹)</Label>
                        <Input
                          id="itemPrice"
                          type="number"
                          placeholder="Opt"
                          value={newItemPrice}
                          onChange={(e) => setNewItemPrice(e.target.value)}
                          className="h-10 rounded-xl bg-background/20 border-border/40 font-mono"
                        />
                      </div>
                      <div className="sm:col-span-2 space-y-1">
                        <Label htmlFor="itemQty" className="text-[10px] font-bold uppercase text-muted-foreground">Qty</Label>
                        <Input
                          id="itemQty"
                          type="number"
                          value={newItemQty}
                          onChange={(e) => setNewItemQty(e.target.value)}
                          className="h-10 rounded-xl bg-background/20 border-border/40 font-mono"
                          required
                        />
                      </div>
                      <div className="sm:col-span-1">
                        <Button type="submit" size="icon" className="h-10 w-full rounded-xl">
                          <Plus className="h-4.5 w-4.5" />
                        </Button>
                      </div>
                    </form>
                  )}

                  {/* Checklist Table */}
                  <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                    {activeList.items.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => !activeList.isCompleted && handleToggleItem(item.id, item.checked)}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-150 ${
                          activeList.isCompleted ? '' : 'cursor-pointer'
                        } ${
                          item.checked
                            ? 'border-emerald-500/20 bg-emerald-500/5 text-muted-foreground'
                            : 'border-border/30 bg-card hover:bg-accent/10'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {activeList.isCompleted ? (
                            <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
                          ) : item.checked ? (
                            <CheckSquare className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
                          ) : (
                            <Square className="h-4.5 w-4.5 text-muted-foreground/60 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className={`text-sm font-semibold truncate ${item.checked && 'line-through text-muted-foreground/60'}`}>
                              {item.name}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              Qty: {item.quantity}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 shrink-0">
                          {item.estimatedPrice && (
                            <p className={`text-xs font-mono font-bold ${item.checked ? 'text-muted-foreground/60' : 'text-foreground'}`}>
                              {formatCurrency(Number(item.estimatedPrice) * item.quantity)}
                            </p>
                          )}
                          {!activeList.isCompleted && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteItem(item.id);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}

                    {activeList.items.length === 0 && (
                      <div className="text-center p-12 border border-dashed rounded-xl bg-card/10 border-border/20">
                        <Plus className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                        <p className="text-xs font-semibold text-muted-foreground">This list is empty</p>
                        <p className="text-[10px] text-muted-foreground mt-1">Add items using the input fields above</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="flex flex-col items-center justify-center p-20 border border-dashed rounded-2xl bg-card/20 border-border/40 text-center h-full min-h-[350px]">
                <ShoppingBag className="h-12 w-12 text-muted-foreground/40 mb-3" />
                <h4 className="text-base font-bold text-foreground">No Checklist Selected</h4>
                <p className="text-xs text-muted-foreground mt-1 mb-6 max-w-sm">
                  Select a shopping list from the sidebar or click the button below to create a new purchase list.
                </p>
                <Button onClick={() => setIsNewListOpen(true)} className="rounded-xl h-10">
                  Create Shopping List
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* dialog 1: Create Shopping List Dialog */}
      <Dialog open={isNewListOpen} onOpenChange={setIsNewListOpen}>
        <DialogContent className="form-spacious sm:max-w-[420px] lg:max-w-[520px] lg:p-8">
          <form onSubmit={handleCreateList} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">New Shopping List</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Set a title and identification color for your shopping checklist.
              </DialogDescription>
            </DialogHeader>

            {errorMessage && (
              <div className="flex items-center gap-2 rounded-xl bg-destructive/10 p-3 text-xs text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <p>{errorMessage}</p>
              </div>
            )}

            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="listName" className="label-uppercase text-muted-foreground">List Name</Label>
                <Input
                  id="listName"
                  placeholder="e.g. Weekly Groceries, Tech Shopping"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  className="h-11 rounded-xl bg-background/20 border-border/40"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Theme Color</Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="color"
                    className="w-14 h-11 p-1 border rounded-xl cursor-pointer border-border/40 transition-colors"
                    value={newListColor}
                    onChange={(e) => setNewListColor(e.target.value)}
                    style={{ backgroundColor: newListColor }}
                  />
                  <span className="text-sm font-mono text-muted-foreground uppercase">{newListColor}</span>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsNewListOpen(false)} className="rounded-xl h-11">
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} className="rounded-xl h-11">
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create List'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* dialog 2: Convert to Expense Ledger Transaction Dialog */}
      <Dialog open={isConvertOpen} onOpenChange={setIsConvertOpen}>
        <DialogContent className="form-spacious sm:max-w-[480px] lg:max-w-[600px] lg:p-8">
          <form onSubmit={handleConvertExpense} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-pink-500" />
                Convert List to Expense
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                This will lock the checklist, deduct checked item costs from your bank balance, and log a ledger transaction.
              </DialogDescription>
            </DialogHeader>

            {errorMessage && (
              <div className="flex items-center gap-2 rounded-xl bg-destructive/10 p-3 text-xs text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <p>{errorMessage}</p>
              </div>
            )}

            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="label-uppercase text-muted-foreground">Total Spent (₹)</Label>
                  <Input
                    className="h-11 rounded-xl bg-background/20 border-border/40 font-mono font-bold text-pink-500"
                    value={totalChecked}
                    disabled
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="label-uppercase text-muted-foreground">Transaction Date</Label>
                  <Input
                    type="date"
                    className="h-11 rounded-xl bg-background/20 border-border/40 font-mono"
                    value={convertDate}
                    onChange={(e) => setConvertDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Ledger Account</Label>
                <Select value={convertAccountId} onValueChange={(val: any) => setConvertAccountId(val || '')}>
                  <SelectTrigger className="bg-background/20 border-border/40 h-11 rounded-xl text-sm">
                    <SelectValue placeholder="Select Account">
                      {accounts.find(a => a.id === convertAccountId)?.name || 'Select Account'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.name} ({formatCurrency(acc.balance)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground">Expense Category</Label>
                <Select value={convertCategoryId} onValueChange={(val: any) => setConvertCategoryId(val || '')}>
                  <SelectTrigger className="bg-background/20 border-border/40 h-11 rounded-xl text-sm">
                    <SelectValue placeholder="Select Category">
                      {categories.find(c => c.id === convertCategoryId)?.name || 'Select Category'}
                    </SelectValue>
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

              <div className="space-y-1.5">
                <Label htmlFor="convertDescription" className="label-uppercase text-muted-foreground">Transaction Description</Label>
                <Input
                  id="convertDescription"
                  placeholder="e.g. Weekly Grocery Run"
                  value={convertDescription}
                  onChange={(e) => setConvertDescription(e.target.value)}
                  className="h-11 rounded-xl bg-background/20 border-border/40"
                  required
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsConvertOpen(false)} className="rounded-xl h-11">
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} className="rounded-xl h-11 font-semibold gradient-primary border-0 text-white">
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Log Expense & Lock List'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
