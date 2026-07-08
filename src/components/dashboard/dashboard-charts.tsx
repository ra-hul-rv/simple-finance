'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formatCompactCurrency } from '@/lib/format';

interface DashboardChartsProps {
  monthlySpending: { name: string; amount: number }[];
  incomeVsExpense: { month: string; income: number; expense: number }[];
  categoryBreakdown: { name: string; value: number; color: string }[];
  netWorthGrowth: { date: string; amount: number }[];
}

export function DashboardCharts({
  monthlySpending,
  incomeVsExpense,
  categoryBreakdown,
  netWorthGrowth,
}: DashboardChartsProps) {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border border-border bg-popover p-3 shadow-md">
          <p className="text-xs font-semibold text-muted-foreground">{label}</p>
          {payload.map((pld: any) => (
            <p key={pld.name} className="text-sm font-bold mt-1" style={{ color: pld.color || pld.fill }}>
              {pld.name}: {formatCompactCurrency(pld.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {/* Income vs Expense Chart */}
      <Card className="glass md:col-span-2">
        <CardHeader>
          <CardTitle className="text-base font-bold tracking-tight uppercase label-uppercase">Cash Flow (Income vs Expense)</CardTitle>
          <CardDescription>Visual comparison of monthly earnings against spendings</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] pl-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={incomeVsExpense} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-success)" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="var(--color-success)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-destructive)" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="var(--color-destructive)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="month"
                stroke="var(--muted-foreground)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="var(--muted-foreground)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => formatCompactCurrency(value)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                name="Income"
                type="monotone"
                dataKey="income"
                stroke="var(--color-success)"
                fillOpacity={1}
                fill="url(#colorIncome)"
                strokeWidth={2}
              />
              <Area
                name="Expense"
                type="monotone"
                dataKey="expense"
                stroke="var(--color-destructive)"
                fillOpacity={1}
                fill="url(#colorExpense)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Category breakdown Pie Chart */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-base font-bold tracking-tight uppercase label-uppercase">Top Spending Categories</CardTitle>
          <CardDescription>Distribution of expenses for current month</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex flex-col justify-center">
          {categoryBreakdown.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No data available
            </div>
          ) : (
            <>
              <div className="relative h-[200px] w-full">
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
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Total</span>
                  <span className="text-lg font-extrabold tracking-tight">
                    {formatCompactCurrency(categoryBreakdown.reduce((sum, item) => sum + item.value, 0))}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4 px-4 overflow-y-auto max-h-[80px] scrollbar-thin">
                {categoryBreakdown.slice(0, 4).map((entry) => (
                  <div key={entry.name} className="flex items-center gap-1.5 text-xs">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                    <span className="truncate text-muted-foreground">{entry.name}</span>
                    <span className="font-semibold ml-auto">{formatCompactCurrency(entry.value)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Net Worth Growth Line Chart */}
      <Card className="glass md:col-span-2">
        <CardHeader>
          <CardTitle className="text-base font-bold tracking-tight uppercase label-uppercase">Net Worth Evolution</CardTitle>
          <CardDescription>Historical trend of total net worth growth</CardDescription>
        </CardHeader>
        <CardContent className="h-[280px] pl-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={netWorthGrowth} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="date"
                stroke="var(--muted-foreground)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="var(--muted-foreground)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => formatCompactCurrency(value)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                name="Net Worth"
                type="monotone"
                dataKey="amount"
                stroke="var(--primary)"
                strokeWidth={2.5}
                dot={{ stroke: 'var(--primary)', strokeWidth: 1.5, r: 3, fill: 'var(--card)' }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Monthly Spending Bar Chart */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-base font-bold tracking-tight uppercase label-uppercase">Monthly Outflow Trend</CardTitle>
          <CardDescription>Daily spending aggregated for current cycle</CardDescription>
        </CardHeader>
        <CardContent className="h-[280px] pl-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlySpending} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="name"
                stroke="var(--muted-foreground)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="var(--muted-foreground)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => formatCompactCurrency(value)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="amount" fill="var(--primary)" radius={[4, 4, 0, 0]}>
                {monthlySpending.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={index === monthlySpending.length - 1 ? 'var(--primary)' : 'oklch(0.72 0.17 55 / 40%)'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
