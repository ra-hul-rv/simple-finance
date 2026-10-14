import { z } from 'zod';
import prisma from '@/lib/prisma';
import { Operation, OperationResult } from './types';

export function getDateRange(period: string, customStart?: string, customEnd?: string): { start: Date; end: Date; label: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  switch (period) {
    case 'this_month': {
      const start = new Date(year, month, 1, 0, 0, 0, 0);
      const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
      return { start, end, label: 'This Month' };
    }
    case 'last_month': {
      const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
      const end = new Date(year, month, 0, 23, 59, 59, 999);
      return { start, end, label: 'Last Month' };
    }
    case 'this_year': {
      const start = new Date(year, 0, 1, 0, 0, 0, 0);
      const end = new Date(year, 11, 31, 23, 59, 59, 999);
      return { start, end, label: 'This Year' };
    }
    case 'last_3_months': {
      const start = new Date(year, month - 2, 1, 0, 0, 0, 0);
      const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
      return { start, end, label: 'Last 3 Months' };
    }
    case 'last_6_months': {
      const start = new Date(year, month - 5, 1, 0, 0, 0, 0);
      const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
      return { start, end, label: 'Last 6 Months' };
    }
    case 'custom': {
      const start = customStart ? new Date(customStart) : new Date(year, month, 1);
      const end = customEnd ? new Date(customEnd) : new Date(year, month + 1, 0, 23, 59, 59, 999);
      return { start, end, label: `Custom (${start.toISOString().split('T')[0]} to ${end.toISOString().split('T')[0]})` };
    }
    default: {
      const start = new Date(year, month, 1, 0, 0, 0, 0);
      const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
      return { start, end, label: 'This Month' };
    }
  }
}

export const getSpendingSummaryOperation: Operation = {
  id: 'get_spending_summary',
  name: 'Get Spending Summary',
  description: 'Get total income, total expenditure, net savings, and top spending categories for a given period (this_month, last_month, this_year, last_3_months, last_6_months, custom).',
  category: 'read',
  parameters: z.object({
    period: z.enum(['this_month', 'last_month', 'this_year', 'last_3_months', 'last_6_months', 'custom']).default('this_month'),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }) as z.ZodType<unknown>,
  execute: async (userId: string, params: Record<string, unknown>): Promise<OperationResult> => {
    const { start, end, label } = getDateRange(
      (params.period as string) || 'this_month',
      params.startDate as string | undefined,
      params.endDate as string | undefined
    );

    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        date: { gte: start, lte: end },
      },
      include: { category: true },
      orderBy: { date: 'desc' },
    });

    let totalIncome = 0;
    let totalExpenses = 0;
    let totalInvestments = 0;
    const categoryMap = new Map<string, number>();

    for (const tx of transactions) {
      const amt = Number(tx.amount);
      if (tx.type === 'INCOME' || tx.type === 'REFUND' || tx.type === 'INTEREST' || tx.type === 'DIVIDEND') {
        totalIncome += amt;
      } else if (tx.type === 'EXPENSE') {
        totalExpenses += amt;
        const catName = tx.category?.name || 'Uncategorized';
        categoryMap.set(catName, (categoryMap.get(catName) || 0) + amt);
      } else if (tx.type === 'INVESTMENT') {
        totalInvestments += amt;
      }
    }

    const netSavings = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? ((netSavings / totalIncome) * 100).toFixed(1) : '0.0';

    const topCategories = Array.from(categoryMap.entries())
      .map(([name, amount]) => ({ name, amount: Math.round(amount * 100) / 100 }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    return {
      success: true,
      data: {
        period: label,
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
        totalIncome: Math.round(totalIncome * 100) / 100,
        totalExpenses: Math.round(totalExpenses * 100) / 100,
        totalInvestments: Math.round(totalInvestments * 100) / 100,
        netSavings: Math.round(netSavings * 100) / 100,
        savingsRate: `${savingsRate}%`,
        transactionCount: transactions.length,
        topCategories,
      },
      summary: `For ${label}: Total Income was ₹${totalIncome.toLocaleString('en-IN')}, Total Expenses were ₹${totalExpenses.toLocaleString('en-IN')}, Net Savings ₹${netSavings.toLocaleString('en-IN')} (Savings Rate: ${savingsRate}%). Top category: ${topCategories[0]?.name || 'N/A'} (₹${topCategories[0]?.amount.toLocaleString('en-IN') || 0}).`,
    };
  },
};

export const getSpendingByCategoryOperation: Operation = {
  id: 'get_spending_by_category',
  name: 'Get Spending by Category',
  description: 'Get detailed spending breakdown aggregated by category for a period (e.g. this_month, last_month, etc.).',
  category: 'read',
  parameters: z.object({
    period: z.enum(['this_month', 'last_month', 'this_year', 'last_3_months', 'last_6_months', 'custom']).default('this_month'),
    type: z.enum(['EXPENSE', 'INCOME']).default('EXPENSE'),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }) as z.ZodType<unknown>,
  execute: async (userId: string, params: Record<string, unknown>): Promise<OperationResult> => {
    const { start, end, label } = getDateRange(
      (params.period as string) || 'this_month',
      params.startDate as string | undefined,
      params.endDate as string | undefined
    );
    const targetType = (params.type as 'EXPENSE' | 'INCOME') || 'EXPENSE';

    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        type: targetType,
        date: { gte: start, lte: end },
      },
      include: { category: true },
    });

    const categoryMap = new Map<string, { amount: number; count: number; color?: string }>();
    let total = 0;

    for (const tx of transactions) {
      const amt = Number(tx.amount);
      total += amt;
      const catName = tx.category?.name || 'Uncategorized';
      const existing = categoryMap.get(catName) || { amount: 0, count: 0, color: tx.category?.color };
      existing.amount += amt;
      existing.count += 1;
      categoryMap.set(catName, existing);
    }

    const categories = Array.from(categoryMap.entries())
      .map(([name, val]) => ({
        category: name,
        amount: Math.round(val.amount * 100) / 100,
        transactionCount: val.count,
        percentage: total > 0 ? `${((val.amount / total) * 100).toFixed(1)}%` : '0%',
        color: val.color,
      }))
      .sort((a, b) => b.amount - a.amount);

    return {
      success: true,
      data: {
        period: label,
        type: targetType,
        totalAmount: Math.round(total * 100) / 100,
        categories,
      },
      summary: `Total ${targetType.toLowerCase()} for ${label}: ₹${total.toLocaleString('en-IN')} across ${categories.length} categories. Highest: ${categories[0]?.category || 'None'} with ₹${categories[0]?.amount.toLocaleString('en-IN') || 0}.`,
    };
  },
};

export const comparePeriodsOperation: Operation = {
  id: 'compare_periods',
  name: 'Compare Periods',
  description: 'Compare financial income and expenses between two periods (e.g. this month vs last month).',
  category: 'read',
  parameters: z.object({
    period1: z.enum(['this_month', 'last_month', 'last_3_months']).default('this_month'),
    period2: z.enum(['last_month', 'this_month', 'last_3_months']).default('last_month'),
  }) as z.ZodType<unknown>,
  execute: async (userId: string, params: Record<string, unknown>): Promise<OperationResult> => {
    const p1 = getDateRange((params.period1 as string) || 'this_month');
    const p2 = getDateRange((params.period2 as string) || 'last_month');

    const [txs1, txs2] = await Promise.all([
      prisma.transaction.findMany({
        where: { userId, date: { gte: p1.start, lte: p1.end } },
      }),
      prisma.transaction.findMany({
        where: { userId, date: { gte: p2.start, lte: p2.end } },
      }),
    ]);

    const summarize = (txs: Array<{ amount: unknown; type: string }>) => {
      let income = 0;
      let expenses = 0;
      for (const t of txs) {
        const amt = Number(t.amount);
        if (['INCOME', 'REFUND', 'INTEREST', 'DIVIDEND'].includes(t.type)) income += amt;
        else if (t.type === 'EXPENSE') expenses += amt;
      }
      return { income: Math.round(income), expenses: Math.round(expenses), savings: Math.round(income - expenses) };
    };

    const s1 = summarize(txs1);
    const s2 = summarize(txs2);

    const expenseDiff = s1.expenses - s2.expenses;
    const expenseDiffPercent = s2.expenses > 0 ? ((expenseDiff / s2.expenses) * 100).toFixed(1) : 'N/A';

    return {
      success: true,
      data: {
        period1: { label: p1.label, ...s1 },
        period2: { label: p2.label, ...s2 },
        difference: {
          expenseDifference: expenseDiff,
          expenseChangePercent: `${expenseDiffPercent}%`,
          incomeDifference: s1.income - s2.income,
        },
      },
      summary: `Comparison of ${p1.label} vs ${p2.label}: Expenses went from ₹${s2.expenses.toLocaleString('en-IN')} to ₹${s1.expenses.toLocaleString('en-IN')} (${expenseDiff >= 0 ? '+' : ''}${expenseDiffPercent}%). Income went from ₹${s2.income.toLocaleString('en-IN')} to ₹${s1.income.toLocaleString('en-IN')}.`,
    };
  },
};
