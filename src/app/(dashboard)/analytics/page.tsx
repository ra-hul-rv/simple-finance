'use client';

import { useEffect, useState, useMemo } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Loader2, Calendar, ShoppingBag } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress, ProgressTrack, ProgressIndicator } from '@/components/ui/progress';

interface Transaction {
  id: string;
  date: string;
  amount: number;
  type: string;
  accountId: string;
  merchant: string | null;
  category: { id: string; name: string; color: string } | null;
}

interface Account {
  id: string;
  name: string;
}

const DATE_RANGES = [
  { label: 'This Month', value: 'THIS_MONTH', days: 30 },
  { label: 'Last 3 Months', value: '3_MONTHS', days: 90 },
  { label: 'Last 6 Months', value: '6_MONTHS', days: 180 },
  { label: 'This Year', value: 'THIS_YEAR', days: 365 },
  { label: 'All Time', value: 'ALL', days: 9999 },
];

export default function AnalyticsPage() {
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [accountFilter, setAccountFilter] = useState('ALL');
  const [dateRange, setDateRange] = useState('THIS_MONTH');

  const fetchAnalyticsData = async () => {
    try {
      const [txRes, accRes] = await Promise.all([
        fetch('/api/transactions?limit=5000'), // Fetch more for long trends
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

  // Filter Transactions
  const filteredTxs = useMemo(() => {
    const today = new Date();
    const range = DATE_RANGES.find(r => r.value === dateRange);
    
    let cutoff = new Date(0);
    if (range && range.value !== 'ALL') {
      if (range.value === 'THIS_MONTH') {
        cutoff = new Date(today.getFullYear(), today.getMonth(), 1);
      } else if (range.value === 'THIS_YEAR') {
        cutoff = new Date(today.getFullYear(), 0, 1);
      } else {
        cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - range.days);
      }
    }

    return txs.filter(tx => {
      const txDate = new Date(tx.date);
      const matchesAccount = accountFilter === 'ALL' || tx.accountId === accountFilter;
      const matchesDate = txDate >= cutoff;
      return matchesAccount && matchesDate;
    });
  }, [txs, accountFilter, dateRange]);

  // Aggregate Key Metrics
  const totalIncome = filteredTxs.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = filteredTxs.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + t.amount, 0);
  const netSavings = totalIncome - totalExpense;

  // Aggregate Time-Series (Expenses vs Income)
  const timeSeriesData = useMemo(() => {
    const isDaily = dateRange === 'THIS_MONTH';
    const grouped: Record<string, { dateLabel: string; expense: number; income: number }> = {};

    filteredTxs.forEach(tx => {
      const d = new Date(tx.date);
      // Group by day for "This Month", otherwise group by "Month-Year"
      const key = isDaily 
        ? d.toISOString().split('T')[0] 
        : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      
      const label = isDaily 
        ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

      if (!grouped[key]) {
        grouped[key] = { dateLabel: label, expense: 0, income: 0 };
      }
      
      if (tx.type === 'EXPENSE') grouped[key].expense += tx.amount;
      if (tx.type === 'INCOME') grouped[key].income += tx.amount;
    });

    return Object.keys(grouped).sort().map(key => grouped[key]);
  }, [filteredTxs, dateRange]);

  // Aggregate Category Breakdown
  const categoryBreakdown = useMemo(() => {
    const catMap: Record<string, { amount: number; color: string }> = {};
    filteredTxs.filter(t => t.type === 'EXPENSE').forEach((tx) => {
      const name = tx.category?.name || 'Uncategorized';
      const color = tx.category?.color || '#6b7280';
      if (!catMap[name]) catMap[name] = { amount: 0, color };
      catMap[name].amount += tx.amount;
    });
    return Object.entries(catMap)
      .map(([name, val]) => ({ name, value: val.amount, color: val.color }))
      .sort((a, b) => b.value - a.value);
  }, [filteredTxs]);

  // Aggregate Top Merchants
  const topMerchants = useMemo(() => {
    const merchMap: Record<string, number> = {};
    filteredTxs.filter(t => t.type === 'EXPENSE').forEach((tx) => {
      const name = tx.merchant || 'Unknown';
      if (!merchMap[name]) merchMap[name] = 0;
      merchMap[name] += tx.amount;
    });
    return Object.entries(merchMap)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10); // top 10
  }, [filteredTxs]);

  const COLORS = ['#ef4444', '#f97316', '#eab308', '#8b5cf6', '#ec4899', '#d946ef', '#14b8a6', '#06b6d4'];

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <PageHeader title="Analytics & Reports" description="Visualize your spending trends and discover where your money goes" />
        
        <div className="flex items-center gap-3">
          <Select value={accountFilter} onValueChange={setAccountFilter}>
            <SelectTrigger className="h-10 min-w-[160px] bg-card glass">
              <SelectValue placeholder="All Accounts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Accounts</SelectItem>
              {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="h-10 min-w-[150px] bg-card glass">
              <Calendar className="mr-2 h-4 w-4 text-primary" />
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              {DATE_RANGES.map(r => (
                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Top Metrics Row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Total Spent"
          value={totalExpense}
          prefix="₹"
          icon={<TrendingDown className="h-4 w-4 text-destructive" />}
        />
        <StatCard
          title="Total Income"
          value={totalIncome}
          prefix="₹"
          icon={<TrendingUp className="h-4 w-4 text-success" />}
        />
        <StatCard
          title="Net Cashflow"
          value={netSavings}
          prefix="₹"
          icon={<DollarSign className="h-4 w-4 text-primary" />}
        />
      </div>

      {/* Main Time-Series Chart */}
      <Card className="glass border-border bg-card/60 backdrop-blur-xl">
        <CardHeader>
          <CardTitle>Cashflow Over Time</CardTitle>
          <CardDescription>{dateRange === 'THIS_MONTH' ? 'Daily' : 'Monthly'} breakdown of your income and expenses</CardDescription>
        </CardHeader>
        <CardContent className="h-[350px]">
          {timeSeriesData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeSeriesData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted/30" />
                <XAxis dataKey="dateLabel" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val}`} />
                <ChartTooltip
                  contentStyle={{ backgroundColor: 'rgba(23, 23, 23, 0.95)', borderColor: 'rgba(255, 255, 255, 0.1)', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}
                  labelStyle={{ color: '#fff', fontWeight: 'bold', marginBottom: '8px' }}
                  formatter={(val: any, name: any) => [`₹${Number(val).toLocaleString()}`, name ? name.toString().charAt(0).toUpperCase() + name.toString().slice(1) : '']}
                />
                <Area type="monotone" dataKey="income" stroke="#22c55e" fillOpacity={1} fill="url(#colorIncome)" strokeWidth={2} activeDot={{ r: 6 }} />
                <Area type="monotone" dataKey="expense" stroke="#ef4444" fillOpacity={1} fill="url(#colorExpense)" strokeWidth={2} activeDot={{ r: 6 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
             <div className="h-full flex items-center justify-center text-muted-foreground">No data for this period</div>
          )}
        </CardContent>
      </Card>

      {/* Breakdown Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Category Breakdown */}
        <Card className="glass border-border bg-card/60 backdrop-blur-xl flex flex-col h-[500px]">
          <CardHeader>
            <CardTitle>Top Categories</CardTitle>
            <CardDescription>Where your money went</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            <div className="h-48 mb-6">
              {categoryBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {categoryBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip
                      contentStyle={{ backgroundColor: 'rgba(23, 23, 23, 0.95)', borderColor: 'rgba(255, 255, 255, 0.1)', borderRadius: '8px' }}
                      itemStyle={{ color: '#fff' }}
                      formatter={(val: any) => [`₹${Number(val).toLocaleString()}`, 'Amount']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No expenses found</div>
              )}
            </div>

            <div className="space-y-4">
              {categoryBreakdown.map((item) => {
                const pct = totalExpense > 0 ? (item.value / totalExpense) * 100 : 0;
                return (
                  <div key={item.name} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="font-semibold text-foreground/90">{item.name}</span>
                        <span className="text-xs text-muted-foreground font-mono bg-muted/50 px-1.5 py-0.5 rounded-md">{pct.toFixed(1)}%</span>
                      </div>
                      <span className="font-mono font-bold">{formatCurrency(item.value)}</span>
                    </div>
                    <Progress value={pct} className="h-1.5 w-full bg-muted/50 rounded-full">
                      <ProgressTrack className="h-full rounded-full overflow-hidden w-full">
                        <ProgressIndicator
                          className="h-full transition-all rounded-full"
                          style={{ width: `${pct}%`, backgroundColor: item.color }}
                        />
                      </ProgressTrack>
                    </Progress>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Top Merchants */}
        <Card className="glass border-border bg-card/60 backdrop-blur-xl flex flex-col h-[500px]">
          <CardHeader>
            <CardTitle>Top Merchants</CardTitle>
            <CardDescription>Your most frequent spending destinations</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {topMerchants.length > 0 ? (
              <div className="space-y-4">
                {topMerchants.map((merchant, idx) => {
                  const pct = totalExpense > 0 ? (merchant.amount / totalExpense) * 100 : 0;
                  return (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/30 transition-colors border border-transparent hover:border-border/30">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <ShoppingBag className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{merchant.name}</p>
                          <p className="text-xs text-muted-foreground">{pct.toFixed(1)}% of total</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold font-mono">{formatCurrency(merchant.amount)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No merchant data found</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
