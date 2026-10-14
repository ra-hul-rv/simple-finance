import { z } from 'zod';
import prisma from '@/lib/prisma';
import { Operation, OperationResult } from './types';

export const getLendingSummaryOperation: Operation = {
  id: 'get_lending_summary',
  name: 'Get Lending and Debts Summary',
  description: 'Get summary of money lent to others (receivables) and money borrowed from others (debts/payables).',
  category: 'read',
  parameters: z.object({}),
  execute: async (userId: string): Promise<OperationResult> => {
    const lendings = await prisma.lending.findMany({
      where: { userId, status: 'ACTIVE' },
      include: { person: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    interface LendingEntry {
      id: string;
      personName: string;
      type: string;
      totalAmount: number;
      outstandingBalance: number;
      dueDate: string | null;
    }

    let totalLent = 0;
    let totalBorrowed = 0;
    const lentList: LendingEntry[] = [];
    const borrowedList: LendingEntry[] = [];

    for (const item of lendings) {
      const outstanding = Number(item.outstandingBalance);
      const total = Number(item.totalAmount);
      const entry = {
        id: item.id,
        personName: item.personName || item.person?.name || 'Unknown',
        type: item.type,
        totalAmount: total,
        outstandingBalance: outstanding,
        dueDate: item.dueDate ? item.dueDate.toISOString().split('T')[0] : null,
      };

      if (item.type === 'LENT') {
        totalLent += outstanding;
        lentList.push(entry);
      } else {
        totalBorrowed += outstanding;
        borrowedList.push(entry);
      }
    }

    return {
      success: true,
      data: {
        totalMoneyLent: Math.round(totalLent * 100) / 100,
        totalMoneyBorrowed: Math.round(totalBorrowed * 100) / 100,
        netReceivable: Math.round((totalLent - totalBorrowed) * 100) / 100,
        lentList,
        borrowedList,
      },
      summary: `Lending Overview: Others owe you ₹${totalLent.toLocaleString('en-IN')} across ${lentList.length} record(s). You owe others ₹${totalBorrowed.toLocaleString('en-IN')} across ${borrowedList.length} record(s).`,
    };
  },
};
