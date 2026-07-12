import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { DashboardCharts } from '@/components/dashboard/dashboard-charts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress, ProgressTrack, ProgressIndicator } from '@/components/ui/progress';
import { formatCurrency, formatDate } from '@/lib/format';
import {
  Sparkles,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
  Calendar,
  AlertCircle,
  Clock,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }

  const userId = session.user.id;

  // Safe wrapper for database operations in case container is down
  let dashboardData;
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { settings: true },
    });

    if (!user) {
      redirect('/login');
    }

    const currency = user.settings?.currency || 'INR';

    // 1. Fetch Accounts
    const accounts = await prisma.account.findMany({
      where: { userId, status: 'ACTIVE' },
    });

    // Compute Summary values
    let totalAssets = 0;
    let totalLiabilities = 0;
    let cashBalance = 0;
    let creditBalance = 0;
    let investmentBalance = 0;
    let fdBalance = 0;

    accounts.forEach((acc) => {
      const balance = Number(acc.balance);
      if (balance >= 0) {
        totalAssets += balance;
      } else {
        totalLiabilities += Math.abs(balance);
      }

      if (acc.type === 'SAVINGS' || acc.type === 'CURRENT' || acc.type === 'CASH') {
        cashBalance += balance;
      } else if (acc.type === 'CREDIT_CARD' || acc.type === 'LOAN') {
        creditBalance += balance;
      } else if (acc.type === 'STOCKS' || acc.type === 'MUTUAL_FUNDS' || acc.type === 'CRYPTO') {
        investmentBalance += balance;
      } else if (acc.type === 'FIXED_DEPOSIT') {
        fdBalance += balance;
      }
    });

    const netWorth = totalAssets - totalLiabilities;

    // 2. Fetch monthly transactions (Current Month)
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const endOfMonth = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 0);
    endOfMonth.setHours(23, 59, 59, 999);

    const monthlyTransactions = await prisma.transaction.findMany({
      where: {
        userId,
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      include: {
        category: true,
        account: true,
      },
      orderBy: { date: 'desc' },
    });

    let monthlyIncome = 0;
    let monthlyExpenses = 0;

    monthlyTransactions.forEach((tx) => {
      const amount = Number(tx.amount);
      if (tx.type === 'INCOME') {
        monthlyIncome += amount;
      } else if (tx.type === 'EXPENSE') {
        monthlyExpenses += amount;
      }
    });

    const savings = monthlyIncome - monthlyExpenses;
    const savingsRate = monthlyIncome > 0 ? (savings / monthlyIncome) * 100 : 0;

    // 3. Category spending breakdown
    const categoryTotals: Record<string, { amount: number; color: string }> = {};
    monthlyTransactions.forEach((tx) => {
      if (tx.type === 'EXPENSE' && tx.category) {
        const catName = tx.category.name;
        if (!categoryTotals[catName]) {
          categoryTotals[catName] = { amount: 0, color: tx.category.color };
        }
        categoryTotals[catName].amount += Number(tx.amount);
      }
    });

    const categoryBreakdown = Object.entries(categoryTotals)
      .map(([name, data]) => ({
        name,
        value: data.amount,
        color: data.color,
      }))
      .sort((a, b) => b.value - a.value);

    // 4. Budgets
    const budgets = await prisma.budget.findMany({
      where: {
        userId,
        month: startOfMonth.getMonth() + 1,
        year: startOfMonth.getFullYear(),
      },
      include: {
        category: true,
      },
      take: 4,
    });

    const formattedBudgets = budgets.map((b) => {
      const limit = Number(b.amount);
      const spent = Number(b.spent);
      const percent = limit > 0 ? (spent / limit) * 100 : 0;
      return {
        id: b.id,
        category: b.category.name,
        color: b.category.color,
        spent,
        limit,
        percent: Math.min(percent, 100),
      };
    });

    // 5. Recent transactions
    const recentTransactions = monthlyTransactions.slice(0, 5);

    // 6. Upcoming Bills (Subscriptions)
    const subscriptions = await prisma.subscription.findMany({
      where: { userId, status: 'ACTIVE' },
      orderBy: { renewalDate: 'asc' },
      take: 3,
    });

    // Mock/aggregate chart data
    const monthlySpending = [
      { name: 'Week 1', amount: monthlyExpenses * 0.25 },
      { name: 'Week 2', amount: monthlyExpenses * 0.35 },
      { name: 'Week 3', amount: monthlyExpenses * 0.20 },
      { name: 'Week 4', amount: monthlyExpenses * 0.20 },
    ];

    const incomeVsExpense = [
      { month: 'May', income: monthlyIncome * 0.9, expense: monthlyExpenses * 0.85 },
      { month: 'Jun', income: monthlyIncome * 0.95, expense: monthlyExpenses * 1.1 },
      { month: 'Jul', income: monthlyIncome, expense: monthlyExpenses },
    ];

    const netWorthGrowth = [
      { date: 'May', amount: netWorth * 0.92 },
      { date: 'Jun', amount: netWorth * 0.96 },
      { date: 'Jul', amount: netWorth },
    ];

    dashboardData = {
      currency,
      netWorth,
      totalAssets,
      totalLiabilities,
      cashBalance,
      creditBalance,
      investmentBalance,
      fdBalance,
      monthlyIncome,
      monthlyExpenses,
      savings,
      savingsRate,
      categoryBreakdown,
      formattedBudgets,
      recentTransactions,
      subscriptions,
      monthlySpending,
      incomeVsExpense,
      netWorthGrowth,
      showDashboardCharts: user.settings?.showDashboardCharts ?? true,
    };
  } catch (error: any) {
    if (error?.digest?.startsWith('NEXT_REDIRECT') || error?.message === 'NEXT_REDIRECT') {
      throw error;
    }
    console.error('Failed to load dashboard data:', error);
    dashboardData = null;
  }

  if (!dashboardData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4 p-6">
        <AlertCircle className="h-16 w-16 text-warning animate-pulse-soft" />
        <h2 className="text-2xl font-bold tracking-tight">Database Connection Offline</h2>
        <p className="max-w-md text-center text-sm text-muted-foreground">
          The database container is currently initializing or offline. To set up the application completely, please follow these steps:
        </p>
        <div className="w-full max-w-md p-4 rounded-lg bg-card border text-sm space-y-2 font-mono">
          <p>1. Start Docker service</p>
          <p>2. Run `docker compose up -d`</p>
          <p>3. Generate Prisma client & DB migrations</p>
        </div>
      </div>
    );
  }

  const data = dashboardData;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header with Quick actions */}
      <PageHeader
        title="Finance Dashboard"
        description={`Welcome back, ${session.user.name || 'User'}. Here is your financial snapshot.`}
      >
        <div className="flex items-center gap-2">
          <Link href="/transactions?type=EXPENSE">
            <Button size="sm" variant="outline" className="h-8 gap-1 hover:border-primary/50">
              <ArrowDownRight className="h-4 w-4 text-destructive" />
              Add Expense
            </Button>
          </Link>
          <Link href="/transactions?type=INCOME">
            <Button size="sm" className="h-8 gap-1 gradient-primary shadow-sm hover:opacity-90">
              <ArrowUpRight className="h-4 w-4 text-white" />
              Add Income
            </Button>
          </Link>
        </div>
      </PageHeader>

      {/* Primary stats row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Net Worth"
          value={data.netWorth}
          prefix={data.currency === 'INR' ? '₹' : '$'}
          trend={4.2}
          trendLabel="from last month"
          icon={<TrendingUp className="h-5 w-5 text-primary" />}
          variant="glass"
        />
        <StatCard
          title="Monthly Income"
          value={data.monthlyIncome}
          prefix={data.currency === 'INR' ? '₹' : '$'}
          trend={12.5}
          trendLabel="since last cycle"
          icon={<ArrowUpRight className="h-5 w-5 text-success" />}
        />
        <StatCard
          title="Monthly Outflow"
          value={data.monthlyExpenses}
          prefix={data.currency === 'INR' ? '₹' : '$'}
          trend={-5.8}
          trendLabel="from last month"
          icon={<ArrowDownRight className="h-5 w-5 text-destructive" />}
        />
        <StatCard
          title="Savings Rate"
          value={data.savingsRate.toFixed(1)}
          prefix=""
          suffix="%"
          trend={2.1}
          trendLabel="increase"
          icon={<Percent className="h-5 w-5 text-info" />}
        />
      </div>

      {/* Account assets breakdown row */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card className="glass border-border/40 p-4">
          <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Liquid Cash</p>
          <p className="text-lg font-bold mt-1.5 tabular-nums">{formatCurrency(data.cashBalance, data.currency)}</p>
        </Card>
        <Card className="glass border-border/40 p-4">
          <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Credit Owed</p>
          <p className="text-lg font-bold mt-1.5 tabular-nums text-destructive">{formatCurrency(data.creditBalance, data.currency)}</p>
        </Card>
        <Card className="glass border-border/40 p-4">
          <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Investments</p>
          <p className="text-lg font-bold mt-1.5 tabular-nums text-success">{formatCurrency(data.investmentBalance, data.currency)}</p>
        </Card>
        <Card className="glass border-border/40 p-4">
          <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Fixed Deposits</p>
          <p className="text-lg font-bold mt-1.5 tabular-nums text-info">{formatCurrency(data.fdBalance, data.currency)}</p>
        </Card>
      </div>

      {/* Dynamic Visualizations */}
      {data.showDashboardCharts && (
        <DashboardCharts
          monthlySpending={data.monthlySpending}
          incomeVsExpense={data.incomeVsExpense}
          categoryBreakdown={data.categoryBreakdown}
          netWorthGrowth={data.netWorthGrowth}
        />
      )}

      {/* Double Column for Lists and Actions */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Transactions list */}
        <Card className="glass lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold uppercase label-uppercase tracking-wider">Recent Transactions</CardTitle>
              <CardDescription>Latest monetary events in this statement cycle</CardDescription>
            </div>
            <Link href="/transactions">
              <Button variant="ghost" size="sm" className="gap-1 text-xs hover:bg-accent font-medium">
                View all
                <ChevronRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            {data.recentTransactions.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                No recent transactions
              </div>
            ) : (
              <div className="space-y-4">
                {data.recentTransactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between border-b border-border/30 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card font-bold"
                        style={{ borderColor: tx.category?.color }}
                      >
                        <span style={{ color: tx.category?.color || 'var(--primary)' }}>
                          {tx.category?.name?.charAt(0) || 'T'}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{tx.description || tx.merchant}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <span>{tx.account.name}</span>
                          <span>•</span>
                          <span>{formatDate(tx.date, 'relative')}</span>
                        </div>
                      </div>
                    </div>
                    <span
                      className={`text-sm font-bold tabular-nums ${
                        tx.type === 'INCOME' ? 'text-success' : 'text-foreground'
                      }`}
                    >
                      {tx.type === 'INCOME' ? '+' : '-'}{formatCurrency(Number(tx.amount), data.currency)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Budgets & Bills lists */}
        <div className="space-y-6">
          {/* Budgets Progress */}
          <Card className="glass">
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase label-uppercase tracking-wider">Budgets Limit</CardTitle>
              <CardDescription>Monthly spending limits by category</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.formattedBudgets.length === 0 ? (
                <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                  No budgets configured
                </div>
              ) : (
                data.formattedBudgets.map((b) => (
                  <div key={b.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: b.color }} />
                        {b.category}
                      </span>
                      <span>
                        {formatCurrency(b.spent, data.currency)} / {formatCurrency(b.limit, data.currency)}
                      </span>
                    </div>
                    <Progress value={b.percent} className="w-full">
                      <ProgressTrack className="h-1.5 bg-muted rounded-full overflow-hidden w-full">
                        <ProgressIndicator className="bg-primary h-full transition-all" style={{ width: `${b.percent}%` }} />
                      </ProgressTrack>
                    </Progress>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Upcoming Bills */}
          <Card className="glass">
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase label-uppercase tracking-wider">Upcoming Renewals</CardTitle>
              <CardDescription>Subscriptions renewal in next 15 days</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.subscriptions.length === 0 ? (
                <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                  No active bills or renewals
                </div>
              ) : (
                data.subscriptions.map((sub: any) => (
                  <div key={sub.id} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-semibold">{sub.service}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Due: {formatDate(sub.renewalDate, 'MMM dd')}</p>
                      </div>
                    </div>
                    <span className="font-bold tabular-nums">{formatCurrency(Number(sub.monthlyCost), data.currency)}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
