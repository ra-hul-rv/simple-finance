'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { BarChart3, TrendingUp, DollarSign, Loader2, Filter } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress, ProgressTrack, ProgressIndicator } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface Transaction {
  id: string;
  date: string;
  amount: number;
  type: string;
  accountId: string;
  category: { id: string; name: string; color: string } | null;
}

interface Account {
  id: string;
  name: string;
}

export default function AnalyticsPage() {
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [accountFilter, setAccountFilter] = useState('ALL');
  const [monthFilter, setMonthFilter] = useState('ALL');
  const [yearFilter, setYearFilter] = useState(String(new Date().getFullYear()));

  const fetchAnalyticsData = async () => {
    try {
      const [txRes, accRes] = await Promise.all([
        fetch('/api/transactions?limit=1000'),
        fetch('/api/accounts'),
      ]);
      const txData = await txRes.json();
      setTxs(txData.transactions || []);

      if (accRes.ok) setAccounts(await accRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  // Filtered transactions
  const filteredTxs = txs.filter((tx) => {
    const txDate = new Date(tx.date);
    const matchesAccount = accountFilter === 'ALL' || tx.accountId === accountFilter;
    const matchesMonth = monthFilter === 'ALL' || String(txDate.getMonth() + 1) === monthFilter;
    const matchesYear = yearFilter === 'ALL' || String(txDate.getFullYear()) === yearFilter;
    return matchesAccount && matchesMonth && matchesYear;
  });

  const totalIncome = filteredTxs.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = filteredTxs.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + t.amount, 0);
  const netSavings = totalIncome - totalExpense;

  // Aggregate Category Expense Donut & Breakdown list
  const catMap: Record<string, { amount: number; color: string }> = {};
  filteredTxs.filter(t => t.type === 'EXPENSE').forEach((tx) => {
    const name = tx.category?.name || 'Others';
    const color = tx.category?.color || '#6b7280';
    if (!catMap[name]) {
      catMap[name] = { amount: 0, color };
    }
    catMap[name].amount += tx.amount;
  });

  const categoryBreakdown = Object.entries(catMap)
    .map(([name, val]) => ({ name, value: val.amount, color: val.color }))
    .sort((a, b) => b.value - a.value);

  // Aggregate Net Trend
  const monthlyTrend = [
    { name: 'Income', Value: totalIncome },
    { name: 'Expenses', Value: totalExpense },
    { name: 'Net Savings', Value: netSavings },
  ];

  const COLORS = ['#ef4444', '#f97316', '#eab308', '#8b5cf6', '#ec4899', '#d946ef', '#14b8a6', '#06b6d4'];

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Aesthetic Analytics" description="Interactive spending charts and category outlays distributions" />

      {/* Filter toolbar */}
      <Card className="glass border-border/40 p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="h-4 w-4 text-primary" />
            <span className="font-semibold uppercase tracking-wider text-xs">Filter Insights:</span>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center">
            {/* Account Selector */}
            <Select value={accountFilter} onValueChange={(val: any) => setAccountFilter(val || 'ALL')}>
              <SelectTrigger className="h-9 min-w-[130px] bg-background/30">
                <SelectValue placeholder="Account">
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

            {/* Month Selector */}
            <Select value={monthFilter} onValueChange={(val: any) => setMonthFilter(val || 'ALL')}>
              <SelectTrigger className="h-9 min-w-[120px] bg-background/30">
                <SelectValue placeholder="Month">
                  {monthFilter === 'ALL' ? 'All Months' : `Month ${monthFilter}`}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Months</SelectItem>
                {Array.from({ length: 12 }, (_, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>
                    {new Date(0, i).toLocaleString('en-US', { month: 'long' })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Year Selector */}
            <Select value={yearFilter} onValueChange={(val: any) => setYearFilter(val || 'ALL')}>
              <SelectTrigger className="h-9 min-w-[100px] bg-background/30">
                <SelectValue placeholder="Year">
                  {yearFilter === 'ALL' ? 'All Years' : yearFilter}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Years</SelectItem>
                <SelectItem value="2025">2025</SelectItem>
                <SelectItem value="2026">2026</SelectItem>
                <SelectItem value="2027">2027</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Seeded Cash Inflow"
          value={totalIncome}
          prefix="₹"
          icon={<DollarSign className="h-4 w-4 text-success" />}
        />
        <StatCard
          title="Seeded Outflows"
          value={totalExpense}
          prefix="₹"
          icon={<TrendingUp className="h-4 w-4 text-destructive" />}
        />
        <StatCard
          title="Net Saving Rate"
          value={netSavings}
          prefix="₹"
          icon={<BarChart3 className="h-4 w-4 text-primary" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="glass border-border bg-card/60 backdrop-blur-xl">
          <CardHeader>
            <CardTitle>Spending by Category</CardTitle>
            <CardDescription>Breakdown of expenses logged</CardDescription>
          </CardHeader>
          <CardContent className="h-72 flex items-center justify-center">
            {categoryBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categoryBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip
                    contentStyle={{ backgroundColor: 'rgba(23, 23, 23, 0.9)', borderColor: 'rgba(255, 255, 255, 0.1)', borderRadius: '8px' }}
                    labelStyle={{ color: '#fff' }}
                    formatter={(val: any) => [`₹${Number(val).toLocaleString()}`, 'Amount']}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-muted-foreground text-sm">No category records found for these filters</div>
            )}
          </CardContent>
        </Card>

        <Card className="glass border-border bg-card/60 backdrop-blur-xl">
          <CardHeader>
            <CardTitle>Seeded Aggregates</CardTitle>
            <CardDescription>Consolidated flow bars comparison</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val}`} />
                <ChartTooltip
                  contentStyle={{ backgroundColor: 'rgba(23, 23, 23, 0.9)', borderColor: 'rgba(255, 255, 255, 0.1)', borderRadius: '8px' }}
                  labelStyle={{ color: '#fff' }}
                  formatter={(val: any) => [`₹${Number(val).toLocaleString()}`, 'Value']}
                />
                <Bar dataKey="Value" fill="var(--color-primary, #f59e0b)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Category List Breakdown Progress Table */}
      <Card className="glass border-border bg-card/60 backdrop-blur-xl">
        <CardHeader>
          <CardTitle>Detailed Category Consumption</CardTitle>
          <CardDescription>Ranked outlays mapped against total expenses</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {categoryBreakdown.map((item) => {
            const pct = totalExpense > 0 ? (item.value / totalExpense) * 100 : 0;
            return (
              <div key={item.name} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="font-semibold">{item.name}</span>
                    <span className="text-xs text-muted-foreground font-mono">({pct.toFixed(1)}%)</span>
                  </div>
                  <span className="font-mono font-bold">{formatCurrency(item.value)}</span>
                </div>
                <Progress value={pct} className="w-full">
                  <ProgressTrack className="h-2 bg-muted rounded-full overflow-hidden w-full">
                    <ProgressIndicator
                      className="h-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: item.color }}
                    />
                  </ProgressTrack>
                </Progress>
              </div>
            );
          })}
          {categoryBreakdown.length === 0 && (
            <div className="text-center py-6 text-muted-foreground text-sm">
              No categories mapped for selected filters.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
