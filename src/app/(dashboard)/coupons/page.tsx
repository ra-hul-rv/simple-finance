'use client';

import { useEffect, useState, useTransition } from 'react';
import { 
  Ticket, 
  Plus, 
  Trash2, 
  Copy, 
  Check, 
  Search, 
  Calendar, 
  Tag, 
  Info, 
  Image as ImageIcon,
  ExternalLink,
  Loader2,
  AlertCircle,
  Inbox,
  Sparkles,
  Barcode
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

interface Coupon {
  id: string;
  title: string;
  code: string;
  discountValue: number | null;
  discountType: string; // PERCENTAGE, FLAT_AMOUNT, FREE_SHIPPING, OTHER
  merchant: string;
  expiryDate: string | null;
  isUsed: boolean;
  notes: string | null;
  terms: string | null;
  barcodePath: string | null;
}

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filters
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL'); // ALL, AVAILABLE, USED, EXPIRED

  // Copy Feedback state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [discountValue, setDiscountValue] = useState('');
  const [discountType, setDiscountType] = useState('PERCENTAGE');
  const [merchant, setMerchant] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('');
  const [barcodeFiles, setBarcodeFiles] = useState<File[]>([]);
  const [existingBarcodePaths, setExistingBarcodePaths] = useState<string[]>([]);

  // Lightbox / Image Viewer
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch Coupons
  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/coupons');
        if (res.ok) {
          const data = await res.json();
          setCoupons(data);
        }
      } catch (err) {
        console.error('Failed to load coupons:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const initialValues = {
    title: '',
    code: '',
    discountValue: '',
    discountType: 'PERCENTAGE',
    merchant: '',
    expiryDate: '',
    notes: '',
    terms: ''
  };

  const { clearDraft } = useFormDraft(
    'coupon',
    initialValues,
    { title, code, discountValue, discountType, merchant, expiryDate, notes, terms },
    (vals) => {
      setTitle(vals.title || '');
      setCode(vals.code || '');
      setDiscountValue(vals.discountValue || '');
      setDiscountType(vals.discountType || 'PERCENTAGE');
      setMerchant(vals.merchant || '');
      setExpiryDate(vals.expiryDate || '');
      setNotes(vals.notes || '');
      setTerms(vals.terms || '');
    },
    isDialogOpen && !editingCoupon
  );

  const handleOpenAddDialog = () => {
    setEditingCoupon(null);
    setTitle('');
    setCode('');
    setDiscountValue('');
    setDiscountType('PERCENTAGE');
    setMerchant('');
    setExpiryDate('');
    setNotes('');
    setTerms('');
    setBarcodeFiles([]);
    setExistingBarcodePaths([]);
    setErrorMessage(null);
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (c: Coupon) => {
    setEditingCoupon(c);
    setTitle(c.title);
    setCode(c.code);
    setDiscountValue(c.discountValue ? c.discountValue.toString() : '');
    setDiscountType(c.discountType);
    setMerchant(c.merchant);
    setExpiryDate(c.expiryDate ? new Date(c.expiryDate).toISOString().split('T')[0] : '');
    setNotes(c.notes || '');
    setTerms(c.terms || '');
    setBarcodeFiles([]);

    let paths: string[] = [];
    if (c.barcodePath) {
      try {
        if (c.barcodePath.startsWith('[')) {
          paths = JSON.parse(c.barcodePath);
        } else {
          paths = [c.barcodePath];
        }
      } catch {
        paths = [c.barcodePath];
      }
    }
    setExistingBarcodePaths(paths);
    setErrorMessage(null);
    setIsDialogOpen(true);
  };

  const handleSaveDraft = () => {
    const draftValues = { title, code, discountValue, discountType, merchant, expiryDate, notes, terms };
    localStorage.setItem('sf_draft_coupon', JSON.stringify(draftValues));
    toast.success('Coupon details saved as draft locally!');
    setIsDialogOpen(false);
  };

  // Upload barcode images helper
  const uploadBarcodes = async (files: File[]): Promise<string[]> => {
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
    if (!title.trim() || !code.trim() || !merchant.trim()) return;

    setErrorMessage(null);
    const value = discountValue.trim() ? parseFloat(discountValue) : null;

    startTransition(async () => {
      try {
        let finalBarcodePaths = [...existingBarcodePaths];
        if (barcodeFiles.length > 0) {
          const newPaths = await uploadBarcodes(barcodeFiles);
          finalBarcodePaths = [...finalBarcodePaths, ...newPaths];
        }

        const barcodePath = finalBarcodePaths.length > 0 ? JSON.stringify(finalBarcodePaths) : null;

        const payload = {
          title,
          code: code.trim(),
          discountValue: value,
          discountType,
          merchant: merchant.trim(),
          expiryDate: expiryDate.trim() ? new Date(expiryDate).toISOString() : null,
          notes: notes.trim() || null,
          terms: terms.trim() || null,
          barcodePath,
        };

        const url = editingCoupon ? `/api/coupons/${editingCoupon.id}` : '/api/coupons';
        const method = editingCoupon ? 'PUT' : 'POST';

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const saved = await res.json();
          if (editingCoupon) {
            setCoupons(coupons.map((c) => (c.id === saved.id ? saved : c)));
          } else {
            setCoupons([saved, ...coupons]);
            clearDraft();
          }
          setIsDialogOpen(false);
        } else {
          const err = await res.json();
          setErrorMessage(err.error || 'Failed to save coupon code');
        }
      } catch (err: any) {
        setErrorMessage(err.message || 'Failed to connect to server');
      }
    });
  };

  // Toggle used status
  const handleToggleUsed = async (id: string, currentUsed: boolean) => {
    setCoupons(
      coupons.map((c) => (c.id === id ? { ...c, isUsed: !currentUsed } : c))
    );

    try {
      const res = await fetch(`/api/coupons/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isUsed: !currentUsed }),
      });

      if (!res.ok) {
        // Rollback
        setCoupons(
          coupons.map((c) => (c.id === id ? { ...c, isUsed: currentUsed } : c))
        );
      }
    } catch (err) {
      console.error('Failed to toggle coupon state:', err);
    }
  };

  // Delete Coupon
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this coupon code?')) return;

    try {
      const res = await fetch(`/api/coupons/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setCoupons(coupons.filter((c) => c.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete coupon:', err);
    }
  };

  // Clipboard copy code
  const handleCopyCode = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Check if coupon is expired
  const isExpired = (expiryStr: string | null) => {
    if (!expiryStr) return false;
    return new Date(expiryStr).getTime() < Date.now();
  };

  // Expiration label countdown
  const getExpiryLabel = (expiryStr: string | null) => {
    if (!expiryStr) return 'No expiry date';
    const expiry = new Date(expiryStr);
    const diffTime = expiry.getTime() - Date.now();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Expired';
    if (diffDays === 0) return 'Expires today!';
    if (diffDays === 1) return 'Expires tomorrow';
    return `Expires in ${diffDays} days`;
  };

  // Filter lists
  const filteredCoupons = coupons.filter((c) => {
    const matchesSearch = c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.merchant.toLowerCase().includes(search.toLowerCase()) ||
      (c.notes && c.notes.toLowerCase().includes(search.toLowerCase()));

    const matchesType = filterType === 'ALL' || c.discountType === filterType;

    const expired = isExpired(c.expiryDate);
    const matchesStatus = filterStatus === 'ALL' ||
      (filterStatus === 'AVAILABLE' && !c.isUsed && !expired) ||
      (filterStatus === 'USED' && c.isUsed) ||
      (filterStatus === 'EXPIRED' && expired && !c.isUsed);

    return matchesSearch && matchesType && matchesStatus;
  });

  // Metrics
  const totalCount = coupons.length;
  const availableCount = coupons.filter((c) => !c.isUsed && !isExpired(c.expiryDate)).length;
  const usedCount = coupons.filter((c) => c.isUsed).length;
  const expiredCount = coupons.filter((c) => isExpired(c.expiryDate) && !c.isUsed).length;

  const discountTypeLabels: Record<string, string> = {
    'PERCENTAGE': 'Percentage (%)',
    'FLAT_AMOUNT': 'Flat Discount (₹)',
    'FREE_SHIPPING': 'Free Shipping',
    'OTHER': 'Other Promo Offer',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent flex items-center gap-2">
            <Ticket className="h-6 w-6 text-pink-500" />
            Promo Coupons & Vouchers
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Store discount codes, copy promo codes to your clipboard, and keep screenshots of ticket barcodes for instant checkouts.
          </p>
        </div>
        <Button onClick={handleOpenAddDialog} className="rounded-xl h-10 gap-2 font-semibold">
          <Plus className="h-4.5 w-4.5" />
          Add Coupon code
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border/40 shadow-xs bg-card/40">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Total Coupons</p>
              <h3 className="text-xl font-bold text-foreground mt-0.5">{totalCount}</h3>
            </div>
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Ticket className="h-5 w-5 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/40 shadow-xs bg-card/40">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold text-emerald-500 tracking-wider">Available</p>
              <h3 className="text-xl font-bold text-emerald-500 mt-0.5">{availableCount}</h3>
            </div>
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/40 shadow-xs bg-card/40">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Used</p>
              <h3 className="text-xl font-bold text-muted-foreground mt-0.5">{usedCount}</h3>
            </div>
            <div className="h-9 w-9 rounded-xl bg-muted/20 flex items-center justify-center">
              <Check className="h-5 w-5 text-muted-foreground" />
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
              <Calendar className="h-5 w-5 text-destructive" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card/30 p-4 rounded-2xl border border-border/30">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by merchant, code or title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 rounded-xl bg-background/20 border-border/40 w-full"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Discount Type Filter */}
          <Select value={filterType} onValueChange={(val: any) => setFilterType(val || 'ALL')}>
            <SelectTrigger className="bg-background/20 border-border/40 h-10 rounded-xl text-xs w-[150px]">
              <SelectValue placeholder="Discount Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Types</SelectItem>
              <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
              <SelectItem value="FLAT_AMOUNT">Flat Amount (₹)</SelectItem>
              <SelectItem value="FREE_SHIPPING">Free Shipping</SelectItem>
              <SelectItem value="OTHER">Other Promo Offers</SelectItem>
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select value={filterStatus} onValueChange={(val: any) => setFilterStatus(val || 'ALL')}>
            <SelectTrigger className="bg-background/20 border-border/40 h-10 rounded-xl text-xs w-[140px]">
              <SelectValue placeholder="Usage Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="AVAILABLE">Available</SelectItem>
              <SelectItem value="USED">Already Used</SelectItem>
              <SelectItem value="EXPIRED">Expired</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grid Layout */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCoupons.map((c) => {
            const expired = isExpired(c.expiryDate);
            const statusLabel = c.isUsed ? 'Used' : expired ? 'Expired' : 'Available';

            return (
              <Card key={c.id} className={`border-border/40 overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 bg-card ${c.isUsed && 'opacity-65'}`}>
                {/* Coupon Header styling like a ticket stub */}
                <div className="p-4 flex justify-between items-start border-b border-dashed border-border/40 bg-accent/10 relative">
                  {/* Left half-circle ticket notch */}
                  <div className="absolute left-[-8px] top-1/2 -translate-y-1/2 h-4 w-4 rounded-full bg-background border-r border-border/40" />
                  {/* Right half-circle ticket notch */}
                  <div className="absolute right-[-8px] top-1/2 -translate-y-1/2 h-4 w-4 rounded-full bg-background border-l border-border/40" />
                  
                  <div className="min-w-0 pl-2">
                    <span className="text-[10px] font-bold text-pink-500 uppercase tracking-widest bg-pink-500/10 px-2 py-0.5 rounded-md">
                      {c.merchant}
                    </span>
                    <h4 className="font-bold text-sm text-foreground truncate mt-1.5" title={c.title}>
                      {c.title}
                    </h4>
                  </div>
                  
                  <div className="flex items-center gap-1 shrink-0">
                    {(() => {
                      let paths: string[] = [];
                      if (c.barcodePath) {
                        try {
                          if (c.barcodePath.startsWith('[')) {
                            paths = JSON.parse(c.barcodePath);
                          } else {
                            paths = [c.barcodePath];
                          }
                        } catch {
                          paths = [c.barcodePath];
                        }
                      }
                      return paths.map((pathUrl, i) => (
                        <Button
                          key={i}
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg hover:bg-accent text-primary"
                          onClick={() => setLightboxUrl(pathUrl)}
                          title={`Show Barcode / Voucher Image ${i + 1}`}
                        >
                          <Barcode className="h-4.5 w-4.5" />
                        </Button>
                      ));
                    })()}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg hover:bg-accent text-muted-foreground"
                      onClick={() => handleOpenEditDialog(c)}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(c.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <CardContent className="p-4 space-y-4">
                  {/* Value Summary */}
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground font-semibold">Discount Type:</span>
                    <span className="font-bold text-foreground">
                      {c.discountValue ? (
                        c.discountType === 'PERCENTAGE' 
                          ? `${c.discountValue}% Off` 
                          : `${formatCurrency(c.discountValue)} Off`
                      ) : (
                        discountTypeLabels[c.discountType] || 'Special Promo'
                      )}
                    </span>
                  </div>

                  {/* Voucher code visual box */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl border border-dashed border-border bg-accent/25">
                    <code className="font-mono text-sm font-bold text-foreground truncate select-all">{c.code}</code>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 rounded-lg text-primary hover:bg-primary/10 gap-1.5 text-xs font-semibold shrink-0"
                      onClick={() => handleCopyCode(c.id, c.code)}
                    >
                      {copiedId === c.id ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Status row */}
                  <div className="flex justify-between items-center text-xs">
                    <span className={`text-[10px] font-bold uppercase ${
                      c.isUsed 
                        ? 'text-muted-foreground' 
                        : expired 
                        ? 'text-destructive' 
                        : 'text-emerald-500'
                    }`}>
                      {getExpiryLabel(c.expiryDate)}
                    </span>

                    {/* Toggle button */}
                    <Button
                      size="sm"
                      variant="outline"
                      className={`h-7 px-2.5 rounded-lg text-[10px] font-semibold border-border/50 hover:bg-accent ${
                        c.isUsed ? 'bg-muted text-muted-foreground' : 'bg-emerald-500/10 text-emerald-500 hover:text-emerald-600'
                      }`}
                      onClick={() => handleToggleUsed(c.id, c.isUsed)}
                    >
                      {c.isUsed ? 'Mark Available' : 'Mark as Used'}
                    </Button>
                  </div>

                  {/* Notes / Terms */}
                  {(c.notes || c.terms) && (
                    <div className="text-[10px] text-muted-foreground bg-accent/10 p-2 rounded-lg border border-border/10 line-clamp-2">
                      {c.notes || c.terms}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {filteredCoupons.length === 0 && (
            <div className="col-span-full text-center py-20 border border-dashed rounded-2xl bg-card/20 border-border/40 max-w-md mx-auto">
              <Inbox className="h-10 w-10 text-muted-foreground/50 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-foreground">No Vouchers Found</h4>
              <p className="text-xs text-muted-foreground mt-1 mb-4">No available coupons match your search filters.</p>
              <Button onClick={handleOpenAddDialog} className="rounded-xl h-9">
                Add Coupon Code
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Coupon Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="form-spacious sm:max-w-[480px] lg:max-w-[580px] lg:p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">
                {editingCoupon ? 'Edit Voucher details' : 'Store Promo Coupon'}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Log discount codes, select merchants, and upload voucher screenshots.
              </DialogDescription>
            </DialogHeader>

            {errorMessage && (
              <div className="flex items-center gap-2 rounded-xl bg-destructive/10 p-3 text-xs text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <p>{errorMessage}</p>
              </div>
            )}

            <div className="space-y-4 py-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="merchantName" className="label-uppercase text-muted-foreground">Merchant / Store</Label>
                  <Input
                    id="merchantName"
                    placeholder="e.g. Amazon, Uber, Swiggy"
                    value={merchant}
                    onChange={(e) => setMerchant(e.target.value)}
                    className="h-11 rounded-xl bg-background/20 border-border/40"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="couponTitle" className="label-uppercase text-muted-foreground">Voucher Title</Label>
                  <Input
                    id="couponTitle"
                    placeholder="e.g. 20% Off Swiggy Food"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="h-11 rounded-xl bg-background/20 border-border/40"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="couponCode" className="label-uppercase text-muted-foreground">Coupon Code</Label>
                  <Input
                    id="couponCode"
                    placeholder="e.g. SWIGGYIT20"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="h-11 rounded-xl bg-background/20 border-border/40 font-mono font-bold"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cExpiry" className="label-uppercase text-muted-foreground">Expiry Date (Optional)</Label>
                  <Input
                    id="cExpiry"
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="h-11 rounded-xl bg-background/20 border-border/40 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="discVal" className="label-uppercase text-muted-foreground">Discount Value (Optional)</Label>
                  <Input
                    id="discVal"
                    type="number"
                    placeholder="e.g. 15 or 150"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    className="h-11 rounded-xl bg-background/20 border-border/40 font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="label-uppercase text-muted-foreground">Discount Type</Label>
                  <Select value={discountType} onValueChange={(val: any) => setDiscountType(val || 'PERCENTAGE')}>
                    <SelectTrigger className="bg-background/20 border-border/40 h-11 rounded-xl text-sm">
                      <SelectValue placeholder="Discount Type">
                        {discountTypeLabels[discountType] || 'Percentage (%)'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                      <SelectItem value="FLAT_AMOUNT">Flat Discount (₹)</SelectItem>
                      <SelectItem value="FREE_SHIPPING">Free Shipping</SelectItem>
                      <SelectItem value="OTHER">Other Special Offer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="label-uppercase text-muted-foreground font-semibold">Voucher Barcodes / QR Screenshots</Label>
                <MultipleFileUpload
                  onFilesChange={setBarcodeFiles}
                  onRemoveExisting={(url) => setExistingBarcodePaths(prev => prev.filter(p => p !== url))}
                  selectedFiles={barcodeFiles}
                  existingUrls={existingBarcodePaths}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cNotes" className="label-uppercase text-muted-foreground">Notes / Specifications</Label>
                <Textarea
                  id="cNotes"
                  placeholder="e.g. Valid only on purchases above ₹500..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="rounded-xl bg-background/20 border-border/40 resize-none min-h-[70px]"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 flex flex-wrap items-center justify-between sm:justify-end">
              {!editingCoupon && (
                <Button type="button" variant="secondary" onClick={handleSaveDraft} disabled={isPending} className="rounded-xl h-11 px-4 text-xs font-semibold mr-auto">
                  Save as Draft
                </Button>
              )}
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl h-11">
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} className="rounded-xl h-11">
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : editingCoupon ? 'Update Coupon' : 'Log Coupon'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Full screen Barcode image Lightbox */}
      <ImageLightbox
        src={lightboxUrl || ''}
        isOpen={!!lightboxUrl}
        onClose={() => setLightboxUrl(null)}
        isPdf={lightboxUrl?.endsWith('.pdf')}
      />
    </div>
  );
}
