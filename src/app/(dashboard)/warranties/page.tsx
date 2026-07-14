'use client';

import { useEffect, useState, useTransition } from 'react';
import { 
  ShieldCheck, 
  Plus, 
  Trash2, 
  Search, 
  Calendar, 
  FileText, 
  AlertTriangle, 
  Clock, 
  ExternalLink,
  Store,
  Tag,
  Loader2,
  AlertCircle,
  TrendingUp,
  Inbox
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
import { MultipleFileUpload } from '@/components/shared/multiple-file-upload';
import { useFormDraft } from '@/hooks/use-form-draft';
import { ImageLightbox } from '@/components/shared/image-lightbox';
import { formatCurrency } from '@/lib/format';
import { toast } from 'sonner';

interface Warranty {
  id: string;
  productName: string;
  purchaseDate: string;
  warrantyMonths: number;
  expiryDate: string;
  purchasePrice: number | null;
  store: string | null;
  category: string | null;
  notes: string | null;
  receiptPath: string | null;
  reminderDays: number;
  isExpired: boolean;
}

export default function WarrantiesPage() {
  const [warranties, setWarranties] = useState<Warranty[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Search & Filters
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL'); // ALL, ACTIVE, EXPIRING, EXPIRED

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingWarranty, setEditingWarranty] = useState<Warranty | null>(null);

  // Form Fields
  const [productName, setProductName] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [warrantyMonths, setWarrantyMonths] = useState('12');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [store, setStore] = useState('');
  const [category, setCategory] = useState('ELECTRONICS');
  const [notes, setNotes] = useState('');
  const [receiptFiles, setReceiptFiles] = useState<File[]>([]);
  const [existingReceiptPaths, setExistingReceiptPaths] = useState<string[]>([]);

  // Lightbox / Image Viewer
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch Warranties
  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/warranties');
        if (res.ok) {
          const data = await res.json();
          setWarranties(data);
        }
      } catch (err) {
        console.error('Failed to load warranties:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const initialValues = {
    productName: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    warrantyMonths: '12',
    purchasePrice: '',
    store: '',
    category: 'ELECTRONICS',
    notes: ''
  };

  const { clearDraft } = useFormDraft(
    'warranty',
    initialValues,
    { productName, purchaseDate, warrantyMonths, purchasePrice, store, category, notes },
    (vals) => {
      setProductName(vals.productName || '');
      setPurchaseDate(vals.purchaseDate || initialValues.purchaseDate);
      setWarrantyMonths(vals.warrantyMonths || '12');
      setPurchasePrice(vals.purchasePrice || '');
      setStore(vals.store || '');
      setCategory(vals.category || 'ELECTRONICS');
      setNotes(vals.notes || '');
    },
    isDialogOpen && !editingWarranty
  );

  const handleOpenAddDialog = () => {
    setEditingWarranty(null);
    setProductName('');
    setPurchaseDate(new Date().toISOString().split('T')[0]);
    setWarrantyMonths('12');
    setPurchasePrice('');
    setStore('');
    setCategory('ELECTRONICS');
    setNotes('');
    setReceiptFiles([]);
    setExistingReceiptPaths([]);
    setErrorMessage(null);
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (w: Warranty) => {
    setEditingWarranty(w);
    setProductName(w.productName);
    setPurchaseDate(new Date(w.purchaseDate).toISOString().split('T')[0]);
    setWarrantyMonths(w.warrantyMonths.toString());
    setPurchasePrice(w.purchasePrice ? w.purchasePrice.toString() : '');
    setStore(w.store || '');
    setCategory(w.category || 'ELECTRONICS');
    setNotes(w.notes || '');
    setReceiptFiles([]);

    let paths: string[] = [];
    if (w.receiptPath) {
      try {
        if (w.receiptPath.startsWith('[')) {
          paths = JSON.parse(w.receiptPath);
        } else {
          paths = [w.receiptPath];
        }
      } catch {
        paths = [w.receiptPath];
      }
    }
    setExistingReceiptPaths(paths);
    setErrorMessage(null);
    setIsDialogOpen(true);
  };

  const handleSaveDraft = () => {
    const draftValues = { productName, purchaseDate, warrantyMonths, purchasePrice, store, category, notes };
    localStorage.setItem('sf_draft_warranty', JSON.stringify(draftValues));
    toast.success('Warranty details saved as draft locally!');
    setIsDialogOpen(false);
  };

  // Upload receipts helper
  const uploadReceipts = async (files: File[]): Promise<string[]> => {
    const urls: string[] = [];
    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`Failed to upload ${file.name}`);
      }

      const data = await res.json();
      urls.push(data.filePath);
    }
    return urls;
  };

  // Submit Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName.trim() || !warrantyMonths.trim()) return;

    setErrorMessage(null);
    const months = parseInt(warrantyMonths) || 12;
    const price = purchasePrice.trim() ? parseFloat(purchasePrice) : null;

    startTransition(async () => {
      try {
        let finalReceiptPaths = [...existingReceiptPaths];
        if (receiptFiles.length > 0) {
          const newPaths = await uploadReceipts(receiptFiles);
          finalReceiptPaths = [...finalReceiptPaths, ...newPaths];
        }

        const receiptPath = finalReceiptPaths.length > 0 ? JSON.stringify(finalReceiptPaths) : null;

        const payload = {
          productName,
          purchaseDate: new Date(purchaseDate).toISOString(),
          warrantyMonths: months,
          purchasePrice: price,
          store: store.trim() || null,
          category,
          notes: notes.trim() || null,
          receiptPath,
        };

        const url = editingWarranty ? `/api/warranties/${editingWarranty.id}` : '/api/warranties';
        const method = editingWarranty ? 'PUT' : 'POST';

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const saved = await res.json();
          if (editingWarranty) {
            setWarranties(warranties.map((w) => (w.id === saved.id ? saved : w)));
          } else {
            setWarranties([saved, ...warranties]);
            clearDraft();
          }
          setIsDialogOpen(false);
        } else {
          const err = await res.json();
          setErrorMessage(err.error || 'Failed to save warranty details');
        }
      } catch (err: any) {
        setErrorMessage(err.message || 'Failed to connect to server');
      }
    });
  };

  // Delete Warranty
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this warranty record?')) return;

    try {
      const res = await fetch(`/api/warranties/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setWarranties(warranties.filter((w) => w.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete warranty:', err);
    }
  };

  // Calculations for countdowns and statuses
  const getRemainingDays = (expiryStr: string) => {
    const expiry = new Date(expiryStr);
    const diffTime = expiry.getTime() - Date.now();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getCountdownLabel = (expiryStr: string) => {
    const days = getRemainingDays(expiryStr);
    if (days < 0) return `Expired ${Math.abs(days)} days ago`;
    if (days === 0) return 'Expires today!';
    if (days === 1) return '1 day remaining';
    return `${days} days remaining`;
  };

  // Color theme generator for warranty days left
  const getCountdownStatusColor = (expiryStr: string) => {
    const days = getRemainingDays(expiryStr);
    if (days < 0) return { text: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive/20', raw: '#ef4444' };
    if (days <= 30) return { text: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20', raw: '#f97316' };
    if (days <= 90) return { text: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20', raw: '#f59e0b' };
    return { text: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', raw: '#10b981' };
  };

  // Category list definitions
  const categoriesList = [
    { value: 'ELECTRONICS', label: 'Electronics / Gadgets' },
    { value: 'APPLIANCES', label: 'Home Appliances' },
    { value: 'AUTOMOTIVE', label: 'Vehicle / Automotive' },
    { value: 'FURNITURE', label: 'Furniture / Fittings' },
    { value: 'CLOTHING', label: 'Apparel / Clothing' },
    { value: 'OTHERS', label: 'Others / General' },
  ];

  // Filtering
  const filteredWarranties = warranties.filter((w) => {
    const matchesSearch = w.productName.toLowerCase().includes(search.toLowerCase()) ||
      (w.store && w.store.toLowerCase().includes(search.toLowerCase())) ||
      (w.notes && w.notes.toLowerCase().includes(search.toLowerCase()));

    const matchesCategory = filterCategory === 'ALL' || w.category === filterCategory;

    const daysLeft = getRemainingDays(w.expiryDate);
    const matchesStatus = filterStatus === 'ALL' ||
      (filterStatus === 'ACTIVE' && daysLeft >= 0) ||
      (filterStatus === 'EXPIRING' && daysLeft >= 0 && daysLeft <= 30) ||
      (filterStatus === 'EXPIRED' && daysLeft < 0);

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Summary Metrics calculations
  const totalCount = warranties.length;
  const activeCount = warranties.filter((w) => getRemainingDays(w.expiryDate) >= 0).length;
  const expiringCount = warranties.filter((w) => {
    const days = getRemainingDays(w.expiryDate);
    return days >= 0 && days <= 30;
  }).length;
  const expiredCount = totalCount - activeCount;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-violet-500 to-indigo-500 bg-clip-text text-transparent flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-violet-500" />
            Warranty Guarantee Ledger
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Store product invoices, calculate guarantee coverage intervals, and receive expiration indicators.
          </p>
        </div>
        <Button onClick={handleOpenAddDialog} className="rounded-xl h-10 gap-2 font-semibold">
          <Plus className="h-4.5 w-4.5" />
          Log Warranty
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border/40 shadow-xs bg-card/40">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Total Items</p>
              <h3 className="text-xl font-bold text-foreground mt-0.5">{totalCount}</h3>
            </div>
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/40 shadow-xs bg-card/40">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold text-emerald-500 tracking-wider">Active Cover</p>
              <h3 className="text-xl font-bold text-emerald-500 mt-0.5">{activeCount}</h3>
            </div>
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/40 shadow-xs bg-card/40">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold text-orange-500 tracking-wider">Expiring (30d)</p>
              <h3 className="text-xl font-bold text-orange-500 mt-0.5">{expiringCount}</h3>
            </div>
            <div className="h-9 w-9 rounded-xl bg-orange-500/10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/40 shadow-xs bg-card/40">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold text-destructive tracking-wider">Expired</p>
              <h3 className="text-xl font-bold text-destructive mt-0.5">{expiredCount}</h3>
            </div>
            <div className="h-9 w-9 rounded-xl bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-destructive" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card/30 p-4 rounded-2xl border border-border/30">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by product, store or notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 rounded-xl bg-background/20 border-border/40 w-full"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Category Filter */}
          <Select value={filterCategory} onValueChange={(val: any) => setFilterCategory(val || 'ALL')}>
            <SelectTrigger className="bg-background/20 border-border/40 h-10 rounded-xl text-xs w-[150px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Categories</SelectItem>
              {categoriesList.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select value={filterStatus} onValueChange={(val: any) => setFilterStatus(val || 'ALL')}>
            <SelectTrigger className="bg-background/20 border-border/40 h-10 rounded-xl text-xs w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="ACTIVE">Active Cover</SelectItem>
              <SelectItem value="EXPIRING">Expiring (30d)</SelectItem>
              <SelectItem value="EXPIRED">Expired</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grid List */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredWarranties.map((w) => {
            const countdown = getCountdownStatusColor(w.expiryDate);
            const daysLeft = getRemainingDays(w.expiryDate);
            const progress = daysLeft > 0 
              ? Math.min((daysLeft / (w.warrantyMonths * 30.5)) * 100, 100)
              : 0;

            return (
              <Card key={w.id} className="border-border/40 overflow-hidden shadow-xs hover:shadow-md transition-shadow duration-200 bg-card">
                <CardHeader className="pb-3 flex flex-row items-start justify-between gap-4">
                  <div className="min-w-0">
                    <Badge variant="outline" className="text-[10px] tracking-wide font-bold uppercase rounded-md bg-accent/40 text-muted-foreground border-0 px-2 py-0.5">
                      {w.category || 'General'}
                    </Badge>
                    <h4 className="font-bold text-sm text-foreground truncate mt-1.5" title={w.productName}>
                      {w.productName}
                    </h4>
                  </div>
                  
                  <div className="flex items-center gap-1 shrink-0">
                    {(() => {
                      let paths: string[] = [];
                      if (w.receiptPath) {
                        try {
                          if (w.receiptPath.startsWith('[')) {
                            paths = JSON.parse(w.receiptPath);
                          } else {
                            paths = [w.receiptPath];
                          }
                        } catch {
                          paths = [w.receiptPath];
                        }
                      }
                      return paths.map((pathUrl, i) => (
                        <Button
                          key={i}
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg hover:bg-accent text-primary"
                          onClick={() => setLightboxUrl(pathUrl)}
                          title={`View Invoice Attachment ${i + 1}`}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      ));
                    })()}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg hover:bg-accent"
                      onClick={() => handleOpenEditDialog(w)}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(w.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="pt-0 space-y-4">
                  {/* Store and Price info */}
                  <div className="flex justify-between items-center text-xs">
                    {w.store ? (
                      <span className="text-muted-foreground flex items-center gap-1 font-medium">
                        <Store className="h-3.5 w-3.5 shrink-0" />
                        {w.store}
                      </span>
                    ) : (
                      <span />
                    )}
                    {w.purchasePrice && (
                      <span className="font-mono font-bold text-foreground">
                        {formatCurrency(w.purchasePrice)}
                      </span>
                    )}
                  </div>

                  {/* Date range details */}
                  <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground bg-accent/15 p-2 rounded-lg border border-border/10 font-medium">
                    <div>
                      <p className="uppercase text-[8px] font-bold text-muted-foreground/60 tracking-wider">Purchase Date</p>
                      <p className="mt-0.5 font-semibold text-foreground">{new Date(w.purchaseDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="uppercase text-[8px] font-bold text-muted-foreground/60 tracking-wider">Expiry Date</p>
                      <p className="mt-0.5 font-semibold text-foreground">{new Date(w.expiryDate).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {/* Countdown indicator */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <span className="text-muted-foreground text-[10px]">Warranty Duration: {w.warrantyMonths}m</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${countdown.text} ${countdown.bg} ${countdown.border}`}>
                        {getCountdownLabel(w.expiryDate)}
                      </span>
                    </div>

                    {/* Progress Bar indicator */}
                    <div className="w-full h-1.5 bg-border/20 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${progress}%`, backgroundColor: countdown.raw }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {filteredWarranties.length === 0 && (
            <div className="col-span-full text-center py-20 border border-dashed rounded-2xl bg-card/20 border-border/40 max-w-md mx-auto">
              <Inbox className="h-10 w-10 text-muted-foreground/50 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-foreground">No Warranty Records Found</h4>
              <p className="text-xs text-muted-foreground mt-1 mb-4">You have not added any warranties matching the active filters.</p>
              <Button onClick={handleOpenAddDialog} className="rounded-xl h-9">
                Log New Warranty
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Create / Edit Warranty Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="form-spacious sm:max-w-[480px] lg:max-w-[620px] lg:p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">
                {editingWarranty ? 'Edit Warranty coverage' : 'Log Purchase Warranty'}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Enter product purchases, start dates, and upload digital copies of receipts for storage.
              </DialogDescription>
            </DialogHeader>

            {errorMessage && (
              <div className="flex items-center gap-2 rounded-xl bg-destructive/10 p-3 text-xs text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <p>{errorMessage}</p>
              </div>
            )}

            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="prodName" className="label-uppercase text-muted-foreground">Product Name</Label>
                <Input
                  id="prodName"
                  placeholder="e.g. Sony WH-1000XM5 Headphones"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="h-11 rounded-xl bg-background/20 border-border/40"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="pDate" className="label-uppercase text-muted-foreground">Purchase Date</Label>
                  <Input
                    id="pDate"
                    type="date"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="h-11 rounded-xl bg-background/20 border-border/40 font-mono"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="wMonths" className="label-uppercase text-muted-foreground">Warranty Duration (Months)</Label>
                  <Input
                    id="wMonths"
                    type="number"
                    placeholder="e.g. 12 or 24"
                    value={warrantyMonths}
                    onChange={(e) => setWarrantyMonths(e.target.value)}
                    className="h-11 rounded-xl bg-background/20 border-border/40 font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="price" className="label-uppercase text-muted-foreground">Purchase Price (₹ - Optional)</Label>
                  <Input
                    id="price"
                    type="number"
                    placeholder="0.00"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value)}
                    className="h-11 rounded-xl bg-background/20 border-border/40 font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="storeName" className="label-uppercase text-muted-foreground">Store / Merchant (Optional)</Label>
                  <Input
                    id="storeName"
                    placeholder="e.g. Amazon, Croma"
                    value={store}
                    onChange={(e) => setStore(e.target.value)}
                    className="h-11 rounded-xl bg-background/20 border-border/40"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="label-uppercase text-muted-foreground">Product Category</Label>
                  <Select value={category} onValueChange={(val: any) => setCategory(val || 'ELECTRONICS')}>
                    <SelectTrigger className="bg-background/20 border-border/40 h-11 rounded-xl text-sm">
                      <SelectValue placeholder="Category">
                        {categoriesList.find(c => c.value === category)?.label || 'Electronics / Gadgets'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {categoriesList.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="remDays" className="label-uppercase text-muted-foreground">Reminder Alerts (Days Before)</Label>
                  <Input
                    id="remDays"
                    type="number"
                    className="h-11 rounded-xl bg-background/20 border-border/40 font-mono"
                    value={30}
                    disabled
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground font-semibold">Receipt Invoice Attachments</Label>
                <MultipleFileUpload
                  onFilesChange={setReceiptFiles}
                  onRemoveExisting={(url) => setExistingReceiptPaths(prev => prev.filter(p => p !== url))}
                  selectedFiles={receiptFiles}
                  existingUrls={existingReceiptPaths}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="formNotes" className="label-uppercase text-muted-foreground">Notes / Specifications</Label>
                <Textarea
                  id="formNotes"
                  placeholder="Record serial numbers, model variations, support contact numbers..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="rounded-xl bg-background/20 border-border/40 resize-none min-h-[70px]"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 flex flex-wrap items-center justify-between sm:justify-end">
              {!editingWarranty && (
                <Button type="button" variant="secondary" onClick={handleSaveDraft} disabled={isPending} className="rounded-xl h-11 px-4 text-xs font-semibold mr-auto">
                  Save as Draft
                </Button>
              )}
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl h-11">
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} className="rounded-xl h-11">
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : editingWarranty ? 'Update Warranty' : 'Log Warranty'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Full screen Receipt image Lightbox */}
      <ImageLightbox
        src={lightboxUrl || ''}
        isOpen={!!lightboxUrl}
        onClose={() => setLightboxUrl(null)}
        isPdf={lightboxUrl?.endsWith('.pdf')}
      />
    </div>
  );
}
