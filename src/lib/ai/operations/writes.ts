import { z } from 'zod';
import prisma from '@/lib/prisma';
import { TransactionType } from '@prisma/client';
import { Operation, OperationResult } from './types';

function parseFlexibleDate(dateVal?: unknown): string | undefined {
  if (!dateVal || typeof dateVal !== 'string') return undefined;
  const str = dateVal.trim();
  // Match DD/MM/YYYY or DD-MM-YYYY (e.g. 11/10/2026 or 11-10-2026)
  const dmyMatch = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }
  // Match YYYY-MM-DD
  const ymdMatch = str.match(/^\d{4}-\d{2}-\d{2}/);
  if (ymdMatch) {
    return ymdMatch[0];
  }
  // Standard parse
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  return undefined;
}

function parseFlexibleAmount(val: unknown): number {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    // Strip currency symbols (₹, $, Rs.), commas, spaces
    const cleaned = val.replace(/[^0-9.-]+/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

function parseFlexibleType(val: unknown): TransactionType {
  if (typeof val === 'string') {
    const upper = val.trim().toUpperCase();
    if (upper.includes('EXPENSE') || upper.includes('SPEND') || upper.includes('PAID') || upper.includes('DEBIT')) {
      return 'EXPENSE';
    }
    if (upper.includes('INCOME') || upper.includes('EARN') || upper.includes('CREDIT') || upper.includes('SALARY')) {
      return 'INCOME';
    }
    if (upper.includes('TRANSFER')) return 'TRANSFER';
    if (upper.includes('INVEST')) return 'INVESTMENT';
    if (upper.includes('REFUND')) return 'REFUND';
    if (upper.includes('CARD') || upper.includes('BILL')) return 'CREDIT_CARD_PAYMENT';
  }
  return 'EXPENSE';
}

function parseFlexibleTime(val: unknown): { formattedTime: string; hours: number; minutes: number } | undefined {
  if (!val || typeof val !== 'string') return undefined;
  const str = val.trim();
  const m = str.match(/^([0-1]?[0-9]|2[0-3])[.:]([0-5][0-9])(?:\s*([ap]\.?m\.?))?$/i);
  if (!m) return undefined;
  let hours = parseInt(m[1], 10);
  const minutes = parseInt(m[2], 10);
  const meridiem = m[3]?.replace(/\./g, '').toUpperCase();

  if (meridiem === 'PM' && hours < 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;

  let formattedTime = str;
  if (meridiem) {
    const displayHours = hours % 12 === 0 ? 12 : hours % 12;
    formattedTime = `${displayHours}:${minutes.toString().padStart(2, '0')} ${meridiem}`;
  } else {
    formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  return { formattedTime, hours, minutes };
}

export const proposeCreateTransactionOperation: Operation = {
  id: 'propose_create_transaction',
  name: 'Propose Create Transaction',
  description: 'Propose adding a new transaction (income, expense, or transfer). Parameters: amount (number), description (or title), type (EXPENSE, INCOME, TRANSFER), categoryName (or category), accountName (or account), merchant (or store), notes (or privateNote), date (YYYY-MM-DD or DD/MM/YYYY), time (optional string, e.g. 10:10 PM or 22:10).',
  category: 'write',
  parameters: z.preprocess((raw: unknown) => {
    if (!raw || typeof raw !== 'object') return {};
    const input = raw as Record<string, unknown>;

    // Build a case-insensitive and non-alphanumeric stripped lookup map
    const normalizedMap: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input)) {
      if (v !== undefined && v !== null) {
        normalizedMap[k.toLowerCase()] = v;
        normalizedMap[k.toLowerCase().replace(/[^a-z0-9]/g, '')] = v;
      }
    }

    const getVal = (...keys: string[]): unknown => {
      for (const k of keys) {
        if (input[k] !== undefined && input[k] !== null) return input[k];
        const lower = k.toLowerCase();
        if (normalizedMap[lower] !== undefined && normalizedMap[lower] !== null) return normalizedMap[lower];
        const clean = lower.replace(/[^a-z0-9]/g, '');
        if (normalizedMap[clean] !== undefined && normalizedMap[clean] !== null) return normalizedMap[clean];
      }
      return undefined;
    };

    // 1. Resolve Amount
    const rawAmount = getVal('amount', 'price', 'cost', 'total', 'paid', 'val', 'finalamountpaid', 'amountpaid');
    const amount = parseFlexibleAmount(rawAmount);

    // 2. Resolve Description / Title
    const rawDesc = getVal('description', 'title', 'name', 'item', 'product', 'subject', 'store', 'merchant');
    const description = rawDesc !== undefined && rawDesc !== null ? String(rawDesc).trim() : '';

    // 3. Resolve Type
    const rawType = getVal('type', 'transactiontype', 'txntype');
    const type = parseFlexibleType(rawType);

    // 4. Resolve Date & Time
    const rawDate = getVal('date', 'transactiondate', 'orderdate', 'txdate');
    const date = parseFlexibleDate(rawDate) || new Date().toISOString().split('T')[0];

    const rawTime = getVal('time', 'transactiontime', 'txtime', 'ordertime', 'timestamp');
    const parsedTime = parseFlexibleTime(rawTime);
    const time = parsedTime?.formattedTime;

    // 5. Resolve Category
    const rawCat = getVal('categoryname', 'category', 'cat', 'categorytype');

    // 6. Resolve Account
    const rawAcc = getVal('accountname', 'account', 'acc', 'wallet', 'bank', 'paymentmethod', 'paidfrom');

    // 7. Resolve Merchant / Store
    const rawMerchant = getVal('merchant', 'store', 'vendor', 'seller', 'payee', 'storemerchant');

    // 8. Resolve Notes & Location
    let notes = getVal('notes', 'note', 'privatenote', 'memo', 'comment', 'details');
    const location = getVal('location', 'place', 'city', 'country');
    if (location && typeof location === 'string' && location.trim().length > 0) {
      const locStr = `Location: ${location.trim()}`;
      notes = notes ? `${String(notes).trim()} | ${locStr}` : locStr;
    }

    return {
      amount,
      description,
      type,
      date,
      time,
      categoryName: rawCat ? String(rawCat).trim() : undefined,
      accountName: rawAcc ? String(rawAcc).trim() : undefined,
      merchant: rawMerchant ? String(rawMerchant).trim() : undefined,
      notes: notes ? String(notes).trim() : undefined,
      _confirmed: Boolean(input._confirmed),
    };
  }, z.object({
    amount: z.number().positive(),
    type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER', 'INVESTMENT', 'CREDIT_CARD_PAYMENT', 'REFUND']).default('EXPENSE'),
    description: z.string().min(1),
    date: z.string().optional(),
    time: z.string().optional(),
    categoryName: z.string().optional(),
    accountName: z.string().optional(),
    merchant: z.string().optional(),
    notes: z.string().optional(),
    _confirmed: z.boolean().optional(),
  })) as z.ZodType<unknown>,
  execute: async (userId: string, params: Record<string, unknown>): Promise<OperationResult> => {
    // 1. Resolve Account
    let account = null;
    const accountName = params.accountName as string | undefined;
    if (accountName) {
      account = await prisma.account.findFirst({
        where: {
          userId,
          status: 'ACTIVE',
          name: { contains: accountName.trim(), mode: 'insensitive' },
        },
      });

      if (!account) {
        // Fuzzy match across active accounts (e.g. AmazonPay -> Amazon Pay)
        const userAccounts = await prisma.account.findMany({
          where: { userId, status: 'ACTIVE' },
        });
        const cleanTarget = accountName.toLowerCase().replace(/[^a-z0-9]/g, '');
        account =
          userAccounts.find((a) => a.name.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanTarget) ||
          userAccounts.find((a) => {
            const cleanA = a.name.toLowerCase().replace(/[^a-z0-9]/g, '');
            return cleanA.includes(cleanTarget) || cleanTarget.includes(cleanA);
          }) ||
          null;
      }
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
          name: { contains: categoryName.trim(), mode: 'insensitive' },
        },
      });

      if (!category) {
        // Fuzzy match across active categories
        const userCategories = await prisma.category.findMany({
          where: { userId, isActive: true },
        });
        const cleanTarget = categoryName.toLowerCase().replace(/[^a-z0-9]/g, '');
        category =
          userCategories.find((c) => c.name.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanTarget) ||
          userCategories.find((c) => {
            const cleanC = c.name.toLowerCase().replace(/[^a-z0-9]/g, '');
            return cleanC.includes(cleanTarget) || cleanTarget.includes(cleanC);
          }) ||
          null;
      }
    }

    let txDate: Date;
    if (params.date && typeof params.date === 'string') {
      const parts = (params.date as string).split('-');
      if (parts.length === 3) {
        txDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      } else {
        txDate = new Date(params.date as string);
      }
    } else {
      txDate = new Date();
    }

    const timeStr = (params.time as string | undefined) || null;
    if (timeStr) {
      const parsedTime = parseFlexibleTime(timeStr);
      if (parsedTime) {
        txDate.setHours(parsedTime.hours, parsedTime.minutes, 0, 0);
      }
    }
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
          date: (params.date as string) || txDate.toISOString().split('T')[0],
          time: timeStr,
          accountId: account.id,
          accountName: account.name,
          categoryId: category?.id || null,
          categoryName: category?.name || 'Uncategorized',
          merchant,
          notes,
        },
        summary: `Proposed: Add ${type} of ₹${amount.toLocaleString('en-IN')} for "${description}" in ${account.name}${timeStr ? ` at ${timeStr}` : ''} (Category: ${category?.name || 'Uncategorized'}).`,
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
          time: timeStr,
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
