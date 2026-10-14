import { z } from 'zod';
import prisma from '@/lib/prisma';
import { Operation, OperationResult } from './types';

export const getSubscriptionsOperation: Operation = {
  id: 'get_subscriptions',
  name: 'Get Subscriptions',
  description: 'Get all active recurring subscriptions (Netflix, Spotify, iCloud, etc.) with monthly/annual cost and upcoming renewal dates.',
  category: 'read',
  parameters: z.object({}),
  execute: async (userId: string): Promise<OperationResult> => {
    const subscriptions = await prisma.subscription.findMany({
      where: { userId, status: 'ACTIVE' },
      orderBy: { renewalDate: 'asc' },
    });

    let totalMonthlyCost = 0;

    const formatted = subscriptions.map((sub) => {
      const monthly = Number(sub.monthlyCost);
      totalMonthlyCost += monthly;
      const daysToRenewal = Math.ceil((new Date(sub.renewalDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

      return {
        id: sub.id,
        service: sub.service,
        monthlyCost: monthly,
        annualCost: sub.annualCost ? Number(sub.annualCost) : monthly * 12,
        renewalDate: sub.renewalDate.toISOString().split('T')[0],
        daysToRenewal: daysToRenewal > 0 ? daysToRenewal : 0,
      };
    });

    return {
      success: true,
      data: {
        activeCount: subscriptions.length,
        totalMonthlyCost: Math.round(totalMonthlyCost * 100) / 100,
        estimatedAnnualCost: Math.round(totalMonthlyCost * 12 * 100) / 100,
        subscriptions: formatted,
      },
      summary: `You have ${subscriptions.length} active subscription(s) totaling ₹${totalMonthlyCost.toLocaleString('en-IN')}/month (~₹${(totalMonthlyCost * 12).toLocaleString('en-IN')}/year). Next renewal: ${formatted[0]?.service || 'None'} on ${formatted[0]?.renewalDate || 'N/A'}.`,
    };
  },
};

export const getRecurringPaymentsOperation: Operation = {
  id: 'get_recurring_payments',
  name: 'Get Recurring Payments',
  description: 'Get scheduled recurring transactions, frequencies (monthly, weekly, etc.), and next due dates.',
  category: 'read',
  parameters: z.object({}),
  execute: async (userId: string): Promise<OperationResult> => {
    const recurring = await prisma.recurringTransaction.findMany({
      where: { userId, isActive: true },
      include: {
        account: { select: { name: true } },
        category: { select: { name: true } },
      },
      orderBy: { nextDate: 'asc' },
    });

    const formatted = recurring.map((r) => ({
      id: r.id,
      name: r.name,
      amount: Number(r.amount),
      frequency: r.frequency,
      type: r.type,
      nextDate: r.nextDate.toISOString().split('T')[0],
      account: r.account.name,
      category: r.category?.name || 'Uncategorized',
    }));

    return {
      success: true,
      data: {
        count: recurring.length,
        recurringTransactions: formatted,
      },
      summary: `You have ${recurring.length} active recurring payment schedule(s). Next up: ${formatted[0]?.name || 'None'} (₹${formatted[0]?.amount.toLocaleString('en-IN') || 0} on ${formatted[0]?.nextDate || 'N/A'}).`,
    };
  },
};
