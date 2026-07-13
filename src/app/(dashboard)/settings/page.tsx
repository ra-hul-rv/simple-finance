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
import { useSession } from 'next-auth/react';
import { Settings, User, Trash2, Upload, Loader2, KeyRound, BarChart3, ChevronUp, ChevronDown, Menu, CreditCard, Plus, Edit2, ArrowDownRight, ArrowUpRight, Zap, X, Check, Type } from 'lucide-react';
import { toast } from 'sonner';

const ALL_NAV_ITEMS = [
  { id: 'dashboard', title: 'Dashboard', href: '/' },
  { id: 'accounts', title: 'Accounts Ledger', href: '/accounts' },
  { id: 'transactions', title: 'Transactions Ledger', href: '/transactions' },
  { id: 'income', title: 'Income tracking', href: '/income' },
  { id: 'categories', title: 'Categories Settings', href: '/categories' },
  { id: 'budgets', title: 'Monthly Budgets', href: '/budgets' },
  { id: 'recurring', title: 'Recurring Bills', href: '/recurring' },
  { id: 'subscriptions', title: 'Subscriptions', href: '/subscriptions' },
  { id: 'fixed-deposits', title: 'Fixed Deposits', href: '/fixed-deposits' },
  { id: 'investments', title: 'Investments', href: '/investments' },
  { id: 'debts', title: 'Debts tracking (+)', href: '/debts' },
  { id: 'loans', title: 'Loans tracking (-)', href: '/loans' },
  { id: 'shopping', title: 'Shopping List', href: '/shopping' },
  { id: 'warranties', title: 'Warranties Tracker', href: '/warranties' },
  { id: 'coupons', title: 'Coupons Wallet', href: '/coupons' },
  { id: 'automations', title: 'Automations Rules', href: '/automations' },
  { id: 'analytics', title: 'Analytics Insights', href: '/analytics' },
  { id: 'reports', title: 'Reports view', href: '/reports' },
];

const DEFAULT_SECTION_LABELS = {
  overview: 'Overview',
  finance: 'Finance',
  insights: 'Insights',
  system: 'System',
};

interface FlowTypeItem {
  id: string;
  name: string;
  direction: string;
  color: string | null;
  description: string | null;
  isActive: boolean;
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const [isPending, startTransition] = useTransition();

  const [sidebarItems, setSidebarItems] = useState(ALL_NAV_ITEMS);
  const [creditCards, setCreditCards] = useState<any[]>([]);

  // Flow Types state
  const [flowTypes, setFlowTypes] = useState<FlowTypeItem[]>([]);
  const [newFlowName, setNewFlowName] = useState('');
  const [newFlowDirection, setNewFlowDirection] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [newFlowColor, setNewFlowColor] = useState('#6366f1');
  const [editingFlowId, setEditingFlowId] = useState<string | null>(null);
  const [editFlowName, setEditFlowName] = useState('');
  const [editFlowDirection, setEditFlowDirection] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');

  // Section labels state
  const [sectionLabels, setSectionLabels] = useState(DEFAULT_SECTION_LABELS);
  const [editingSectionKey, setEditingSectionKey] = useState<string | null>(null);
  const [editSectionValue, setEditSectionValue] = useState('');

  // Settings states
  const [currency, setCurrency] = useState('INR');
  const [dateFormat, setDateFormat] = useState('dd/MM/yyyy');
  const [locale, setLocale] = useState('en-IN');
  const [theme, setTheme] = useState('dark');

  // Chart visibility states
  const [showDashboardCharts, setShowDashboardCharts] = useState(true);
  const [showAccountsCharts, setShowAccountsCharts] = useState(true);
  const [showBillsCharts, setShowBillsCharts] = useState(true);

  // CSV Import state
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);

  // Accounts state (for CSV import account mapping)
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setCurrency(data.currency);
        setDateFormat(data.dateFormat);
        setLocale(data.locale);
        setTheme(data.theme);
        if (data.showDashboardCharts !== undefined) setShowDashboardCharts(data.showDashboardCharts);
        if (data.showAccountsCharts !== undefined) setShowAccountsCharts(data.showAccountsCharts);
        if (data.showBillsCharts !== undefined) setShowBillsCharts(data.showBillsCharts);

        if (data.sidebarOrder) {
          const order = data.sidebarOrder.split(',');
          const sorted = [...ALL_NAV_ITEMS].sort((a, b) => {
            const idxA = order.indexOf(a.id);
            const idxB = order.indexOf(b.id);
            if (idxA === -1 && idxB === -1) return 0;
            if (idxA === -1) return 1;
            if (idxB === -1) return -1;
            return idxA - idxB;
          });
          setSidebarItems(sorted);
        }

        if (data.sidebarSectionLabels) {
          try {
            const parsed = JSON.parse(data.sidebarSectionLabels);
            setSectionLabels(prev => ({ ...prev, ...parsed }));
          } catch (e) {
            console.error('Failed to parse sidebarSectionLabels', e);
          }
        }
      }

      const accRes = await fetch('/api/accounts');
      if (accRes.ok) {
        const accData = await accRes.json();
        setAccounts(accData);
        if (accData.length > 0) setSelectedAccountId(accData[0].id);
      }

      const cardsRes = await fetch('/api/credit-cards');
      if (cardsRes.ok) {
        const cardsData = await cardsRes.json();
        setCreditCards(cardsData);
      }

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
    fetchSettings();
  }, []);

  const handleSaveSettings = () => {
    startTransition(async () => {
      try {
        const sidebarOrder = sidebarItems.map(i => i.id).join(',');
        const res = await fetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            currency,
            dateFormat,
            locale,
            theme,
            showDashboardCharts,
            showAccountsCharts,
            showBillsCharts,
            sidebarOrder,
            sidebarSectionLabels: JSON.stringify(sectionLabels)
          }),
        });

        if (!res.ok) throw new Error('Failed to update preferences');
        
        // Sync local storage and dispatch event to update sidebar immediately
        localStorage.setItem('sf_sidebar_order', JSON.stringify(sidebarItems.map(i => i.href)));
        localStorage.setItem('sf_sidebar_section_labels', JSON.stringify(sectionLabels));
        window.dispatchEvent(new Event('sf_sidebar_updated'));

        toast.success('App preferences updated successfully');
      } catch (err) {
        console.error(err);
        toast.error('Failed to update preferences');
      }
    });
  };

  const moveSidebarItem = (index: number, direction: 'up' | 'down') => {
    const newItems = [...sidebarItems];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newItems.length) return;
    const temp = newItems[index];
    newItems[index] = newItems[targetIdx];
    newItems[targetIdx] = temp;
    setSidebarItems(newItems);
  };

  const moveCreditCardItem = (index: number, direction: 'up' | 'down') => {
    const newCards = [...creditCards];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newCards.length) return;
    const temp = newCards[index];
    newCards[index] = newCards[targetIdx];
    newCards[targetIdx] = temp;
    setCreditCards(newCards);
  };

  const handleSaveCardOrder = async () => {
    try {
      const payload = creditCards.map((c, idx) => ({ id: c.id, order: idx }));
      const res = await fetch('/api/credit-cards/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to update credit cards order');
      toast.success('Credit cards order updated successfully');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update credit cards order');
    }
  };

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

  const startEditingSection = (key: string) => {
    setEditingSectionKey(key);
    setEditSectionValue(sectionLabels[key as keyof typeof sectionLabels] || '');
  };

  const saveSectionLabel = () => {
    if (!editingSectionKey) return;
    setSectionLabels(prev => ({
      ...prev,
      [editingSectionKey]: editSectionValue.trim() || DEFAULT_SECTION_LABELS[editingSectionKey as keyof typeof DEFAULT_SECTION_LABELS]
    }));
    setEditingSectionKey(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setCsvFile(e.target.files[0]);
    }
  };

  const handleCsvImport = async () => {
    if (!csvFile) {
      toast.error('Please choose a CSV file to import');
      return;
    }
    if (!selectedAccountId) {
      toast.error('Please map a source account');
      return;
    }

    setImporting(true);
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length < 2) throw new Error('Empty CSV statement');

        // Simple CSV parser
        const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim().toLowerCase());
        const dateIdx = headers.indexOf('date');
        const amountIdx = headers.indexOf('amount');
        const descIdx = headers.indexOf('description');
        const typeIdx = headers.indexOf('type') !== -1 ? headers.indexOf('type') : -1;

        if (dateIdx === -1 || amountIdx === -1) {
          throw new Error('CSV must contain Date and Amount headers');
        }

        let successCount = 0;
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map(c => c.replace(/"/g, '').trim());
          if (cols.length < headers.length) continue;

          const dateStr = cols[dateIdx];
          const rawAmount = parseFloat(cols[amountIdx]);
          const descriptionVal = descIdx !== -1 ? cols[descIdx] : 'CSV Statement Upload';
          const typeVal = typeIdx !== -1 ? (cols[typeIdx].toUpperCase() === 'INCOME' ? 'INCOME' : 'EXPENSE') : 'EXPENSE';

          if (isNaN(rawAmount)) continue;

          // Call API directly in loop
          const res = await fetch('/api/transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              date: new Date(dateStr).toISOString(),
              amount: Math.abs(rawAmount),
              type: typeVal,
              description: descriptionVal,
              accountId: selectedAccountId,
            }),
          });

          if (res.ok) successCount++;
        }

        toast.success(`Successfully imported ${successCount} transactions`);
        setCsvFile(null);
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || 'Failed to parse CSV statement');
      } finally {
        setImporting(false);
      }
    };

    reader.readAsText(csvFile);
  };

  const handleWipeData = () => {
    if (!confirm('WARNING: This will permanently delete all your ledger accounts, transactions, investments, fixed deposits, budgets, and subscriptions. This action is irreversible. Do you want to proceed?')) {
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch('/api/settings/reset', { method: 'POST' });
        if (!res.ok) throw new Error('Wipe operation failed');
        toast.success('Database has been completely reset to a clean state');
      } catch (err) {
        console.error(err);
        toast.error('Failed to wipe database');
      }
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="App Settings" description="Configure profile, default currency, CSV imports, and database wipes" />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Card */}
        <Card className="glass border-border bg-card/60 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-amber-500" />
              User Profile
            </CardTitle>
            <CardDescription>Registered account session credentials</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="space-y-1">
              <Label className="label-uppercase text-muted-foreground text-xs">Full Name</Label>
              <p className="font-semibold text-foreground">{session?.user?.name || 'User'}</p>
            </div>
            <div className="space-y-1">
              <Label className="label-uppercase text-muted-foreground text-xs">Email Address</Label>
              <p className="font-semibold text-foreground font-mono">{session?.user?.email || 'user@simplefinance.app'}</p>
            </div>
            <div className="space-y-1">
              <Label className="label-uppercase text-muted-foreground text-xs">Account Status</Label>
              <p>
                <Badge className="bg-success text-white font-semibold">Active Member</Badge>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Configurations */}
        <Card className="glass border-border bg-card/60 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-amber-500" />
              General Preferences
            </CardTitle>
            <CardDescription>Customize interface values and standards</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-semibold block">Currency Format</Label>
                <span className="text-xs text-muted-foreground">Default ledger symbol mapping</span>
              </div>
              <Select value={currency} onValueChange={(val) => setCurrency(val || 'INR')}>
                <SelectTrigger className="bg-background w-28">
                  <SelectValue placeholder="Currency">
                    {currency}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INR">INR (₹)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-border/40">
              <div>
                <Label className="font-semibold block">Date Format</Label>
                <span className="text-xs text-muted-foreground">Calendar display standards</span>
              </div>
              <Select value={dateFormat} onValueChange={(val) => setDateFormat(val || 'dd/MM/yyyy')}>
                <SelectTrigger className="bg-background w-32">
                  <SelectValue placeholder="Format">
                    {dateFormat}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dd/MM/yyyy">DD/MM/YYYY</SelectItem>
                  <SelectItem value="MM/dd/yyyy">MM/DD/YYYY</SelectItem>
                  <SelectItem value="yyyy-MM-dd">YYYY-MM-DD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-border/40">
              <div>
                <Label className="font-semibold block">Locale standards</Label>
                <span className="text-xs text-muted-foreground">Local timezone standards</span>
              </div>
              <Select value={locale} onValueChange={(val) => setLocale(val || 'en-IN')}>
                <SelectTrigger className="bg-background w-28">
                  <SelectValue placeholder="Locale">
                    {locale}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en-IN">en-IN</SelectItem>
                  <SelectItem value="en-US">en-US</SelectItem>
                  <SelectItem value="en-GB">en-GB</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
          <CardFooter className="pt-2">
            <Button onClick={handleSaveSettings} disabled={isPending} className="w-full gradient-primary text-white font-semibold">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Preferences'}
            </Button>
          </CardFooter>
        </Card>

        {/* Chart Preferences */}
        <Card className="glass border-border bg-card/60 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-amber-500" />
              Chart Preferences
            </CardTitle>
            <CardDescription>Toggle chart visibility across pages</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <span className="font-semibold block text-sm">Dashboard Charts</span>
                <span className="text-xs text-muted-foreground">Show charts on the dashboard overview</span>
              </div>
              <input
                type="checkbox"
                checked={showDashboardCharts}
                onChange={(e) => setShowDashboardCharts(e.target.checked)}
                className="h-4 w-4 accent-amber-500 cursor-pointer"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer pt-3 border-t border-border/40">
              <div>
                <span className="font-semibold block text-sm">Accounts Charts</span>
                <span className="text-xs text-muted-foreground">Show charts on the accounts page</span>
              </div>
              <input
                type="checkbox"
                checked={showAccountsCharts}
                onChange={(e) => setShowAccountsCharts(e.target.checked)}
                className="h-4 w-4 accent-amber-500 cursor-pointer"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer pt-3 border-t border-border/40">
              <div>
                <span className="font-semibold block text-sm">Bills Charts</span>
                <span className="text-xs text-muted-foreground">Show charts on the bills page</span>
              </div>
              <input
                type="checkbox"
                checked={showBillsCharts}
                onChange={(e) => setShowBillsCharts(e.target.checked)}
                className="h-4 w-4 accent-amber-500 cursor-pointer"
              />
            </label>
          </CardContent>
        </Card>
      </div>

      {/* Layout & Reordering Settings Card */}
      <Card className="glass border-border bg-card/60 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Menu className="h-5 w-5 text-amber-500" />
            Layout & Item Reordering
          </CardTitle>
          <CardDescription>Shift items to reorder the left sidebar links and credit card display list</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          {/* Sidebar Reordering & Categories Rename */}
          <div className="space-y-4">
            {/* Rename Categories */}
            <div className="space-y-3 pb-3 border-b border-border/20">
              <h4 className="text-sm font-bold text-foreground">Rename Sidebar Categories</h4>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(sectionLabels).map(([key, value]) => (
                  <div key={key} className="flex flex-col gap-1 p-2 rounded-lg bg-card/30 border border-border/10">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wide">{key}</span>
                    {editingSectionKey === key ? (
                      <div className="flex items-center gap-1 mt-1">
                        <Input
                          value={editSectionValue}
                          onChange={(e) => setEditSectionValue(e.target.value)}
                          className="h-8 text-xs py-1 px-2 rounded-md bg-background/50 flex-1 min-w-0"
                          autoFocus
                        />
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-500 hover:bg-emerald-500/10 shrink-0" onClick={saveSectionLabel}>
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-500 hover:bg-rose-500/10 shrink-0" onClick={() => setEditingSectionKey(null)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs font-semibold">{value}</span>
                        <Button size="icon" variant="ghost" className="h-7 w-7 rounded-md hover:bg-background/40" onClick={() => startEditingSection(key)}>
                          <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pb-1 border-b border-border/40">
              <h4 className="text-sm font-bold text-foreground">Left Sidebar Items Order</h4>
              <Badge variant="outline" className="text-[10px]">Total: {sidebarItems.length}</Badge>
            </div>
            <div className="max-h-80 overflow-y-auto space-y-1.5 pr-2 scrollbar-thin border border-border/20 rounded-xl p-3 bg-background/20">
              {sidebarItems.map((item, idx) => (
                <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-card/40 border border-border/10 text-xs font-semibold">
                  <span className="truncate">{item.title}</span>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 rounded-md"
                      disabled={idx === 0}
                      onClick={() => moveSidebarItem(idx, 'up')}
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 rounded-md"
                      disabled={idx === sidebarItems.length - 1}
                      onClick={() => moveSidebarItem(idx, 'down')}
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Credit Card Reordering */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between pb-1 border-b border-border/40">
              <h4 className="text-sm font-bold text-foreground">Credit Card Display Order</h4>
              <Badge variant="outline" className="text-[10px]">Total: {creditCards.length}</Badge>
            </div>
            {creditCards.length === 0 ? (
              <div className="flex flex-col items-center justify-center border border-dashed rounded-xl h-80 text-center bg-background/5 border-border/20">
                <CreditCard className="h-8 w-8 text-muted-foreground/60 mb-2" />
                <p className="text-xs font-semibold text-muted-foreground">No credit cards found</p>
                <p className="text-[10px] text-muted-foreground/80 mt-0.5">Add a credit card inside the Accounts section.</p>
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto space-y-1.5 pr-2 scrollbar-thin border border-border/20 rounded-xl p-3 bg-background/20">
                {creditCards.map((card, idx) => (
                  <div key={card.id} className="flex items-center justify-between p-2 rounded-lg bg-card/40 border border-border/10 text-xs font-semibold">
                    <div className="flex items-center gap-2 truncate">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: card.color }} />
                      <span className="truncate">{card.cardName}</span>
                      {card.lastFourDigits && <span className="text-[9px] text-muted-foreground font-mono">(•••• {card.lastFourDigits})</span>}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 rounded-md"
                        disabled={idx === 0}
                        onClick={() => moveCreditCardItem(idx, 'up')}
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 rounded-md"
                        disabled={idx === creditCards.length - 1}
                        onClick={() => moveCreditCardItem(idx, 'down')}
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex gap-4 border-t border-border/30 pt-4">
          <Button onClick={handleSaveSettings} disabled={isPending} className="flex-1 gradient-primary text-white font-semibold">
            Save Sidebar Order
          </Button>
          <Button onClick={handleSaveCardOrder} disabled={creditCards.length === 0} className="flex-1 bg-accent text-accent-foreground font-semibold hover:bg-accent/80">
            Save Credit Cards Order
          </Button>
        </CardFooter>
      </Card>

      {/* Custom Flow Types Configuration Card */}
      <Card className="glass border-border bg-card/60 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            Custom Flow Types Configuration
          </CardTitle>
          <CardDescription>Create, edit, or delete custom transaction flows to use in your ledgers</CardDescription>
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
                  onValueChange={(val) => setNewFlowDirection(val as any)}
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
                          onValueChange={(val) => setEditFlowDirection(val as any)}
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

      <div className="grid gap-6 md:grid-cols-2">
        {/* CSV Import */}
        <Card className="glass border-border bg-card/60 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-amber-500" />
              CSV Statement Import
            </CardTitle>
            <CardDescription>Bulk upload bank statements directly into ledger</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="label-uppercase text-muted-foreground">Target Account</Label>
              <Select value={selectedAccountId} onValueChange={(val) => setSelectedAccountId(val || '')}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select Account">
                    {accounts.find(a => a.id === selectedAccountId)?.name || 'Select Account'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="label-uppercase text-muted-foreground">CSV File</Label>
              <Input
                type="file"
                accept=".csv"
                className="cursor-pointer file:text-primary file:font-semibold"
                onChange={handleFileChange}
              />
              <p className="text-[10px] text-muted-foreground">CSV must contain column headers named exactly "Date" and "Amount".</p>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleCsvImport} disabled={importing || !csvFile} className="w-full gradient-primary text-white font-semibold">
              {importing ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Upload className="mr-1.5 h-4 w-4" />}
              Import CSV Statement
            </Button>
          </CardFooter>
        </Card>

        {/* Danger Zone */}
        <Card className="glass border-destructive/20 bg-destructive/5 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5 text-destructive" />
              Danger Zone
            </CardTitle>
            <CardDescription>Destructive actions that cannot be undone</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="text-muted-foreground">
              Resetting will completely wipe clean all database tables associated with your user session including transactions, budgets, subscriptions, FDs, and cards.
            </p>
          </CardContent>
          <CardFooter>
            <Button onClick={handleWipeData} disabled={isPending} variant="destructive" className="w-full font-semibold">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Trash2 className="mr-1.5 h-4 w-4" />}
              Wipe Account Data
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
