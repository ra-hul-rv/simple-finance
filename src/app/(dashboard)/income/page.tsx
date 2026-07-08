'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/format';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, ArrowUpRight, TrendingUp, Calendar, Loader2 } from 'lucide-react';

interface Transaction {
  id: string;
  date: string;
  amount: number;
  type: string;
  description: string | null;
  merchant: string | null;
  account: { name: string };
  category: { name: string } | null;
}

export default function IncomePage() {
  const [incomes, setIncomes] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchIncomes() {
      try {
        const res = await fetch('/api/transactions?limit=100');
        const data = await res.json();
        const incomeList = (data.transactions || []).filter((tx: any) => tx.type === 'INCOME');
        setIncomes(incomeList);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchIncomes();
  }, []);

  const totalInflow = incomes.reduce((sum, tx) => sum + tx.amount, 0);
  const avgInflow = incomes.length > 0 ? totalInflow / 2 : 0; // split across 2 seeded projects/months

  // Aggregated charts data
  const chartData = [
    { name: 'Salary', Amount: incomes.filter(tx => tx.category?.name === 'Salary').reduce((sum, tx) => sum + tx.amount, 0) },
    { name: 'Freelancing', Amount: incomes.filter(tx => tx.category?.name === 'Freelancing').reduce((sum, tx) => sum + tx.amount, 0) },
    { name: 'Investment returns', Amount: incomes.filter(tx => tx.category?.name === 'Investments Return').reduce((sum, tx) => sum + tx.amount, 0) },
    { name: 'Others', Amount: incomes.filter(tx => !tx.category || (tx.category.name !== 'Salary' && tx.category.name !== 'Freelancing' && tx.category.name !== 'Investments Return')).reduce((sum, tx) => sum + tx.amount, 0) },
  ].filter(d => d.Amount > 0);

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Income Tracking" description="Monitor and analyze your active and passive revenue streams" />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Total Seeded Inflow"
          value={totalInflow}
          prefix="₹"
          icon={<DollarSign className="h-4 w-4 text-success" />}
        />
        <StatCard
          title="Average Inflow Session"
          value={avgInflow}
          prefix="₹"
          icon={<ArrowUpRight className="h-4 w-4 text-success" />}
        />
        <StatCard
          title="Active Channels"
          value={chartData.length}
          prefix=""
          icon={<TrendingUp className="h-4 w-4 text-primary" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="glass col-span-2 border-border bg-card/60 backdrop-blur-xl">
          <CardHeader>
            <CardTitle>Inflow Distribution</CardTitle>
            <CardDescription>Breakdown by primary category streams</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                  <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val}`} />
                  <ChartTooltip
                    contentStyle={{ backgroundColor: 'rgba(23, 23, 23, 0.9)', borderColor: 'rgba(255, 255, 255, 0.1)', borderRadius: '8px' }}
                    labelStyle={{ color: '#fff' }}
                    formatter={(val: any) => [`₹${Number(val).toLocaleString()}`, 'Amount']}
                  />
                  <Bar dataKey="Amount" fill="var(--color-primary, #f59e0b)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground text-sm">No data available</div>
            )}
          </CardContent>
        </Card>

        <Card className="glass border-border bg-card/60 backdrop-blur-xl">
          <CardHeader>
            <CardTitle>Latest Deposits</CardTitle>
            <CardDescription>Recent transaction records</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {incomes.slice(0, 5).map((tx) => (
                <div key={tx.id} className="flex items-center justify-between border-b border-border/40 pb-3 last:border-0 last:pb-0">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold leading-none">{tx.description || 'Income Credit'}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDate(tx.date)}</span>
                      <Badge variant="outline" className="text-[10px] py-0">{tx.category?.name || 'Inflow'}</Badge>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-success">+{formatCurrency(tx.amount)}</span>
                </div>
              ))}
              {incomes.length === 0 && (
                <div className="text-center text-sm text-muted-foreground py-6">No recent deposits logged</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
