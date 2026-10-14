import { z } from 'zod';
import prisma from '@/lib/prisma';
import { Operation, OperationResult } from './types';

export const getAccountBalancesOperation: Operation = {
  id: 'get_account_balances',
  name: 'Get Account Balances',
  description: 'Get all active accounts grouped by type (Bank Accounts, Credit Cards, Wallets, Investments, Loans) with balances and Net Worth.',
  category: 'read',
  parameters: z.object({}),
  execute: async (userId: string): Promise<OperationResult> => {
    const accounts = await prisma.account.findMany({
      where: { userId, status: 'ACTIVE' },
      include: { creditCard: true },
      orderBy: { name: 'asc' },
    });

    let totalAssets = 0;
    let totalLiabilities = 0;

    const grouped: Record<string, Array<{ id: string; name: string; type: string; balance: number; currency: string }>> = {
      bankAccounts: [],
      creditCards: [],
      wallets: [],
      investments: [],
      loans: [],
      other: [],
    };

    for (const acc of accounts) {
      const bal = Number(acc.balance);
      const item = {
        id: acc.id,
        name: acc.name,
        type: acc.type,
        balance: Math.round(bal * 100) / 100,
        currency: acc.currency,
      };

      if (['SAVINGS', 'CURRENT', 'CASH'].includes(acc.type)) {
        grouped.bankAccounts.push(item);
      } else if (acc.type === 'CREDIT_CARD') {
        grouped.creditCards.push(item);
      } else if (acc.type === 'WALLET') {
        grouped.wallets.push(item);
      } else if (['STOCKS', 'MUTUAL_FUNDS', 'CRYPTO', 'FIXED_DEPOSIT', 'EPF', 'PPF', 'NPS'].includes(acc.type)) {
        grouped.investments.push(item);
      } else if (acc.type === 'LOAN') {
        grouped.loans.push(item);
      } else {
        grouped.other.push(item);
      }

      if (bal >= 0) {
        totalAssets += bal;
      } else {
        totalLiabilities += Math.abs(bal);
      }
    }

    const netWorth = totalAssets - totalLiabilities;

    return {
      success: true,
      data: {
        totalAssets: Math.round(totalAssets * 100) / 100,
        totalLiabilities: Math.round(totalLiabilities * 100) / 100,
        netWorth: Math.round(netWorth * 100) / 100,
        groupedAccounts: grouped,
        accountCount: accounts.length,
      },
      summary: `Total Net Worth is ₹${netWorth.toLocaleString('en-IN')} (Assets: ₹${totalAssets.toLocaleString('en-IN')}, Liabilities: ₹${totalLiabilities.toLocaleString('en-IN')}). Across ${accounts.length} active accounts.`,
    };
  },
};

export const getCreditCardSummaryOperation: Operation = {
  id: 'get_credit_card_summary',
  name: 'Get Credit Card Summary',
  description: 'Get total outstanding dues, available credit limit, statement/due dates, and details for all credit cards.',
  category: 'read',
  parameters: z.object({}),
  execute: async (userId: string): Promise<OperationResult> => {
    const cards = await prisma.creditCard.findMany({
      where: { userId },
      include: { account: true },
      orderBy: { order: 'asc' },
    });

    let totalOutstanding = 0;
    let totalLimit = 0;
    let totalAvailable = 0;

    const cardDetails = cards.map((c) => {
      // In Simple Finance, outstanding is tracked both in creditCard.outstandingBalance and -account.balance
      const outstanding = Number(c.outstandingBalance) || Math.max(0, -Number(c.account?.balance || 0));
      const limit = Number(c.creditLimit);
      const available = Math.max(0, limit - outstanding);

      totalOutstanding += outstanding;
      totalLimit += limit;
      totalAvailable += available;

      return {
        cardName: c.cardName,
        accountName: c.account?.name,
        lastFourDigits: c.lastFourDigits ? `•••• ${c.lastFourDigits}` : null,
        outstandingBalance: Math.round(outstanding * 100) / 100,
        creditLimit: Math.round(limit * 100) / 100,
        availableCredit: Math.round(available * 100) / 100,
        dueDate: c.dueDate ? `Day ${c.dueDate} of month` : 'Not set',
        statementDate: c.statementDate ? `Day ${c.statementDate} of month` : 'Not set',
      };
    });

    return {
      success: true,
      data: {
        totalOutstanding: Math.round(totalOutstanding * 100) / 100,
        totalLimit: Math.round(totalLimit * 100) / 100,
        totalAvailable: Math.round(totalAvailable * 100) / 100,
        cards: cardDetails,
      },
      summary: `You have ${cards.length} credit card(s) with total outstanding balance of ₹${totalOutstanding.toLocaleString('en-IN')} against total credit limit of ₹${totalLimit.toLocaleString('en-IN')} (Available: ₹${totalAvailable.toLocaleString('en-IN')}).`,
    };
  },
};
