'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Download, FileJson, Filter, Loader2, Calendar } from 'lucide-react';
import { toast } from 'sonner';

interface Account {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
}

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Filter States
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [accountFilter, setAccountFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState('');

  // Loaded statements for client filtering preview
  const [transactions, setTransactions] = useState<any[]>([]);

  const fetchFiltersAndData = async () => {
    try {
      const [accRes, catRes, txRes] = await Promise.all([
        fetch('/api/accounts'),
        fetch('/api/categories'),
        fetch('/api/transactions?limit=1000'),
      ]);

      if (accRes.ok) setAccounts(await accRes.json());
      if (catRes.ok) setCategories(await catRes.json());
      if (txRes.ok) {
        const txData = await txRes.json();
        setTransactions(txData.transactions || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiltersAndData();
  }, []);

  const getFilteredTransactions = () => {
    return transactions.filter((tx) => {
      const txDate = new Date(tx.date);

      const matchesType = typeFilter === 'ALL' || tx.type === typeFilter;
      const matchesAccount = accountFilter === 'ALL' || tx.accountId === accountFilter;
      const matchesCategory = categoryFilter === 'ALL' || tx.categoryId === categoryFilter;
      const matchesSearch = !search ||
        (tx.description?.toLowerCase().includes(search.toLowerCase())) ||
        (tx.merchant?.toLowerCase().includes(search.toLowerCase()));

      const matchesStart = !startDate || txDate >= new Date(startDate);
      const matchesEnd = !endDate || txDate <= new Date(endDate);

      return matchesType && matchesAccount && matchesCategory && matchesSearch && matchesStart && matchesEnd;
    });
  };

  const exportData = async (format: 'csv' | 'json') => {
    try {
      const targetTxs = getFilteredTransactions();

      if (targetTxs.length === 0) {
        toast.error('No transactions matched the active filters to export');
        return;
      }

      if (format === 'json') {
        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
          JSON.stringify(targetTxs, null, 2)
        )}`;
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute('href', jsonString);
        downloadAnchor.setAttribute('download', 'filtered_finance_statement.json');
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        toast.success(`Exported ${targetTxs.length} items to JSON`);
      } else {
        const headers = ['Date', 'Amount', 'Type', 'Description', 'Merchant', 'Location', 'Account', 'Category'];
        const rows = targetTxs.map((tx: any) => [
          new Date(tx.date).toLocaleDateString(),
          tx.amount,
          tx.type,
          `"${tx.description || ''}"`,
          `"${tx.merchant || ''}"`,
          `"${tx.location || ''}"`,
          `"${tx.account?.name || ''}"`,
          `"${tx.category?.name || 'None'}"`,
        ]);

        const csvContent = [headers.join(','), ...rows.map((e: any) => e.join(','))].join('\n');
        const encodedUri = encodeURI(`data:text/csv;charset=utf-8,${csvContent}`);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', 'filtered_finance_statement.csv');
        document.body.appendChild(link);
        link.click();
        link.remove();
        toast.success(`Exported ${targetTxs.length} items to CSV`);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate export file');
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const matchingCount = getFilteredTransactions().length;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Export & Reports" description="Configure filters and generate targeted CSV/JSON ledger exports" />

      {/* Filter Options */}
      <Card className="glass border-border bg-card/60 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-amber-500" />
            Report Filter Builder
          </CardTitle>
          <CardDescription>Refine transaction dataset scope before exporting</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="label-uppercase text-muted-foreground">Search String</Label>
            <Input
              placeholder="e.g. Zepto, Rent..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="label-uppercase text-muted-foreground">Transaction Type</Label>
            <Select value={typeFilter} onValueChange={(val) => setTypeFilter(val || 'ALL')}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="All Types">
                  {typeFilter === 'ALL' ? 'All Types' : typeFilter}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Types</SelectItem>
                <SelectItem value="INCOME">Income</SelectItem>
                <SelectItem value="EXPENSE">Expense</SelectItem>
                <SelectItem value="TRANSFER">Transfer</SelectItem>
                <SelectItem value="INVESTMENT">Investment</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="label-uppercase text-muted-foreground">Ledger Account</Label>
            <Select value={accountFilter} onValueChange={(val) => setAccountFilter(val || 'ALL')}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="All Accounts">
                  {accountFilter === 'ALL' ? 'All Accounts' : accounts.find(a => a.id === accountFilter)?.name || accountFilter}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Accounts</SelectItem>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="label-uppercase text-muted-foreground">Category</Label>
            <Select value={categoryFilter} onValueChange={(val) => setCategoryFilter(val || 'ALL')}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="All Categories">
                  {categoryFilter === 'ALL' ? 'All Categories' : categories.find(c => c.id === categoryFilter)?.name || categoryFilter}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="label-uppercase text-muted-foreground">Start Date</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="label-uppercase text-muted-foreground">End Date</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-between border-t border-border/40 pt-4 bg-muted/10">
          <div className="text-sm">
            Matching Transactions: <span className="font-bold font-mono text-primary">{matchingCount}</span> / {transactions.length}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setSearch('');
              setTypeFilter('ALL');
              setAccountFilter('ALL');
              setCategoryFilter('ALL');
              setStartDate('');
              setEndDate('');
            }}
          >
            Clear Filters
          </Button>
        </CardFooter>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="glass border-border bg-card/60 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileJson className="h-5 w-5 text-amber-500" />
              JSON Statement Export
            </CardTitle>
            <CardDescription>Download matching statements in raw JSON format</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => exportData('json')} className="w-full gradient-primary text-white font-semibold">
              <Download className="mr-1.5 h-4 w-4" /> Download JSON ({matchingCount} items)
            </Button>
          </CardContent>
        </Card>

        <Card className="glass border-border bg-card/60 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-amber-500" />
              CSV Spreadsheet Export
            </CardTitle>
            <CardDescription>Download matching statements as standard CSV spreadsheet</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => exportData('csv')} className="w-full gradient-primary text-white font-semibold">
              <Download className="mr-1.5 h-4 w-4" /> Download CSV ({matchingCount} items)
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
