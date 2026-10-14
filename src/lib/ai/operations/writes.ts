import { z } from 'zod';
import prisma from '@/lib/prisma';
import { TransactionType } from '@prisma/client';
import { Operation, OperationResult } from './types';

export const proposeCreateTransactionOperation: Operation = {
  id: 'propose_create_transaction',
  name: 'Propose Create Transaction',
  description: 'Propose adding a new transaction (income, expense, or transfer). Generates a preview for explicit user confirmation before writing to the database.',
  category: 'write',
  parameters: z.object({
    amount: z.number().positive(),
    type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER', 'INVESTMENT', 'CREDIT_CARD_PAYMENT', 'REFUND']).default('EXPENSE'),
    description: z.string().min(1),
    date: z.string().optional(),
    categoryName: z.string().optional(),
    accountName: z.string().optional(),
    merchant: z.string().optional(),
    notes: z.string().optional(),
    _confirmed: z.boolean().optional(),
  }) as z.ZodType<unknown>,
  execute: async (userId: string, params: Record<string, unknown>): Promise<OperationResult> => {
    // 1. Resolve Account
    let account = null;
    const accountName = params.accountName as string | undefined;
    if (accountName) {
      account = await prisma.account.findFirst({
        where: {
          userId,
          status: 'ACTIVE',
          name: { contains: accountName, mode: 'insensitive' },
        },
      });
    }

    if (!account) {
      // Fallback to default account or first active account
      account = await prisma.account.findFirst({
        where: { userId, status: 'ACTIVE' },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
      });
    }

    if (!account) {
      return { success: false, error: 'No active accounts found in your profile to attach this transaction.' };
    }

    // 2. Resolve Category
    let category = null;
    const categoryName = params.categoryName as string | undefined;
    if (categoryName) {
      category = await prisma.category.findFirst({
        where: {
          userId,
          isActive: true,
          name: { contains: categoryName, mode: 'insensitive' },
        },
      });
    }

    const txDate = params.date ? new Date(params.date as string) : new Date();
    const amount = Number(params.amount);
    const type = (params.type as TransactionType) || 'EXPENSE';
    const description = (params.description as string) || 'Expense';
    const merchant = (params.merchant as string) || null;
    const notes = (params.notes as string) || null;

    // 3. IF NOT CONFIRMED: Return Preview ONLY
    if (!params._confirmed) {
      return {
        success: true,
        data: {
          action: 'CREATE_TRANSACTION',
          amount,
          type,
          description,
          date: txDate.toISOString().split('T')[0],
          accountId: account.id,
          accountName: account.name,
          categoryId: category?.id || null,
          categoryName: category?.name || 'Uncategorized',
          merchant,
          notes,
        },
        summary: `Proposed: Add ${type} of ₹${amount.toLocaleString('en-IN')} for "${description}" in ${account.name} (Category: ${category?.name || 'Uncategorized'}).`,
      };
    }

    // 4. IF CONFIRMED: Execute atomic write with balance sync
    const createdTx = await prisma.$transaction(async (tx) => {
      const record = await tx.transaction.create({
        data: {
          userId,
          amount,
          type,
          description: description.charAt(0).toUpperCase() + description.slice(1),
          merchant,
          notes,
          date: txDate,
          accountId: account.id,
          categoryId: category?.id || null,
          status: 'COMPLETED',
        },
      });

      // Update account balance
      if (['INCOME', 'REFUND', 'INTEREST', 'DIVIDEND'].includes(type)) {
        await tx.account.update({
          where: { id: account.id },
          data: { balance: { increment: amount } },
        });
      } else if (['EXPENSE', 'INVESTMENT'].includes(type)) {
        await tx.account.update({
          where: { id: account.id },
          data: { balance: { decrement: amount } },
        });
      }

      // Sync budget if EXPENSE
      if (type === 'EXPENSE' && category?.id) {
        const txMonth = txDate.getMonth() + 1;
        const txYear = txDate.getFullYear();
        const budget = await tx.budget.findFirst({
          where: { userId, categoryId: category.id, month: txMonth, year: txYear },
        });
        if (budget) {
          await tx.budget.update({
            where: { id: budget.id },
            data: { spent: { increment: amount } },
          });
        }
      }

      // Sync credit card balance if account is a credit card
      const card = await tx.creditCard.findUnique({
        where: { accountId: account.id },
      });
      if (card) {
        const updatedAcc = await tx.account.findUnique({ where: { id: account.id } });
        const outstanding = Math.max(0, -Number(updatedAcc?.balance || 0));
        const available = Math.max(0, Number(card.creditLimit) - outstanding);
        await tx.creditCard.update({
          where: { id: card.id },
          data: { outstandingBalance: outstanding, availableCredit: available },
        });
      }

      return record;
    });

    return {
      success: true,
      data: {
        id: createdTx.id,
        amount: Number(createdTx.amount),
        type: createdTx.type,
        description: createdTx.description,
        date: createdTx.date.toISOString().split('T')[0],
      },
      summary: `Successfully created transaction "${createdTx.description}" for ₹${Number(createdTx.amount).toLocaleString('en-IN')}.`,
    };
  },
};
