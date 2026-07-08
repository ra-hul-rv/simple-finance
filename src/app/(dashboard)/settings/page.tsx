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
import { Settings, User, Trash2, Upload, Loader2, KeyRound } from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { data: session } = useSession();
  const [isPending, startTransition] = useTransition();

  // Settings states
  const [currency, setCurrency] = useState('INR');
  const [dateFormat, setDateFormat] = useState('dd/MM/yyyy');
  const [locale, setLocale] = useState('en-IN');
  const [theme, setTheme] = useState('dark');

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
      }

      const accRes = await fetch('/api/accounts');
      if (accRes.ok) {
        const accData = await accRes.json();
        setAccounts(accData);
        if (accData.length > 0) setSelectedAccountId(accData[0].id);
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
        const res = await fetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currency, dateFormat, locale, theme }),
        });

        if (!res.ok) throw new Error('Failed to update preferences');
        toast.success('App preferences updated successfully');
      } catch (err) {
        console.error(err);
        toast.error('Failed to update preferences');
      }
    });
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
      </div>

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
