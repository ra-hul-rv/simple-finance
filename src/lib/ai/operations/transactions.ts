import { z } from 'zod';
import prisma from '@/lib/prisma';
import { Prisma, TransactionType } from '@prisma/client';
import { Operation, OperationResult } from './types';

export const getRecentTransactionsOperation: Operation = {
  id: 'get_recent_transactions',
  name: 'Get Recent Transactions',
  description: 'Retrieve the most recent transactions with account, category, and date details.',
  category: 'read',
  parameters: z.object({
    limit: z.number().int().min(1).max(50).default(10),
    type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER', 'INVESTMENT', 'CREDIT_CARD_PAYMENT', 'REFUND', 'INTEREST', 'DIVIDEND']).optional(),
    accountName: z.string().optional(),
  }) as z.ZodType<unknown>,
  execute: async (userId: string, params: Record<string, unknown>): Promise<OperationResult> => {
    const limit = (params.limit as number) || 10;
    const where: Record<string, unknown> = { userId };

    if (params.type) {
      where.type = params.type;
    }

    if (params.accountName) {
      where.account = { name: { contains: params.accountName as string, mode: 'insensitive' } };
    }

    const transactions = await prisma.transaction.findMany({
      where,
      take: limit,
      orderBy: { date: 'desc' },
      include: {
        account: { select: { name: true } },
        category: { select: { name: true } },
        transferToAccount: { select: { name: true } },
      },
    });

    const formatted = transactions.map((t) => ({
      id: t.id,
      date: t.date.toISOString().split('T')[0],
      time: t.time || null,
      amount: Number(t.amount),
      type: t.type,
      description: t.description || 'No description',
      merchant: t.merchant || null,
      account: t.account.name,
      category: t.category?.name || 'Uncategorized',
      transferTo: t.transferToAccount?.name || null,
    }));

    return {
      success: true,
      data: {
        count: formatted.length,
        transactions: formatted,
      },
      summary: `Retrieved ${formatted.length} recent transactions. Latest: ${formatted[0]?.description || 'None'} (₹${formatted[0]?.amount.toLocaleString('en-IN') || 0} on ${formatted[0]?.date || 'N/A'}).`,
    };
  },
};

export const searchTransactionsOperation: Operation = {
  id: 'search_transactions',
  name: 'Search Transactions',
  description: 'Search transactions by keyword, merchant name, amount range, or date range.',
  category: 'read',
  parameters: z.object({
    query: z.string().optional(),
    merchant: z.string().optional(),
    minAmount: z.number().optional(),
    maxAmount: z.number().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER', 'INVESTMENT', 'CREDIT_CARD_PAYMENT', 'REFUND', 'INTEREST', 'DIVIDEND']).optional(),
    limit: z.number().int().min(1).max(50).default(20),
  }) as z.ZodType<unknown>,
  execute: async (userId: string, params: Record<string, unknown>): Promise<OperationResult> => {
    const where: Prisma.TransactionWhereInput = { userId };

    const query = params.query as string | undefined;
    if (query) {
      where.OR = [
        { description: { contains: query, mode: 'insensitive' } },
        { merchant: { contains: query, mode: 'insensitive' } },
        { notes: { contains: query, mode: 'insensitive' } },
      ];
    }

    const merchant = params.merchant as string | undefined;
    if (merchant) {
      where.merchant = { contains: merchant, mode: 'insensitive' };
    }

    const type = params.type as TransactionType | undefined;
    if (type) {
      where.type = type;
    }

    const minAmount = params.minAmount as number | undefined;
    const maxAmount = params.maxAmount as number | undefined;
    if (minAmount !== undefined || maxAmount !== undefined) {
      const amountFilter: Prisma.DecimalFilter = {};
      if (minAmount !== undefined) amountFilter.gte = minAmount;
      if (maxAmount !== undefined) amountFilter.lte = maxAmount;
      where.amount = amountFilter;
    }

    const startDate = params.startDate as string | undefined;
    const endDate = params.endDate as string | undefined;
    if (startDate || endDate) {
      const dateFilter: Prisma.DateTimeFilter = {};
      if (startDate) dateFilter.gte = new Date(startDate);
      if (endDate) dateFilter.lte = new Date(endDate);
      where.date = dateFilter;
    }

    const limit = (params.limit as number) || 20;

    const transactions = await prisma.transaction.findMany({
      where,
      take: limit,
      orderBy: { date: 'desc' },
      include: {
        account: { select: { name: true } },
        category: { select: { name: true } },
      },
    });

    const formatted = transactions.map((t) => ({
      id: t.id,
      date: t.date.toISOString().split('T')[0],
      time: t.time || null,
      amount: Number(t.amount),
      type: t.type,
      description: t.description,
      merchant: t.merchant,
      account: t.account.name,
      category: t.category?.name || 'Uncategorized',
    }));

    const totalMatching = formatted.reduce((sum, t) => sum + t.amount, 0);

    return {
      success: true,
      data: {
        matchCount: formatted.length,
        totalAmount: Math.round(totalMatching * 100) / 100,
        transactions: formatted,
      },
      summary: `Found ${formatted.length} transactions matching search. Total amount: ₹${totalMatching.toLocaleString('en-IN')}.`,
    };
  },
};
