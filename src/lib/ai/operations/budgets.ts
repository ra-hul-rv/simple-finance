import { z } from 'zod';
import prisma from '@/lib/prisma';
import { Operation, OperationResult } from './types';

export const getBudgetStatusOperation: Operation = {
  id: 'get_budget_status',
  name: 'Get Budget Status',
  description: 'Get monthly budget status, limits, current spending, remaining balance, and usage percentage per category.',
  category: 'read',
  parameters: z.object({
    month: z.number().int().min(1).max(12).optional(),
    year: z.number().int().min(2000).max(2100).optional(),
  }) as z.ZodType<unknown>,
  execute: async (userId: string, params: Record<string, unknown>): Promise<OperationResult> => {
    const now = new Date();
    const month = (params.month as number) || now.getMonth() + 1;
    const year = (params.year as number) || now.getFullYear();

    const budgets = await prisma.budget.findMany({
      where: { userId, month, year },
      include: { category: true },
      orderBy: { amount: 'desc' },
    });

    let totalBudget = 0;
    let totalSpent = 0;

    const formatted = budgets.map((b) => {
      const limit = Number(b.amount);
      const spent = Number(b.spent);
      const remaining = limit - spent;
      const percent = limit > 0 ? ((spent / limit) * 100).toFixed(1) : '0';

      totalBudget += limit;
      totalSpent += spent;

      return {
        id: b.id,
        category: b.category.name,
        budgetLimit: limit,
        spent,
        remaining,
        percentUsed: `${percent}%`,
        isOverBudget: spent > limit,
      };
    });

    const totalRemaining = totalBudget - totalSpent;
    const overallPercent = totalBudget > 0 ? ((totalSpent / totalBudget) * 100).toFixed(1) : '0';

    return {
      success: true,
      data: {
        month,
        year,
        totalBudget,
        totalSpent,
        totalRemaining,
        overallPercentUsed: `${overallPercent}%`,
        budgets: formatted,
      },
      summary: `For ${month}/${year}: Overall budget is ₹${totalBudget.toLocaleString('en-IN')}, spent ₹${totalSpent.toLocaleString('en-IN')} (${overallPercent}% used), remaining ₹${totalRemaining.toLocaleString('en-IN')}. ${formatted.filter((b) => b.isOverBudget).length} category(ies) over budget.`,
    };
  },
};
