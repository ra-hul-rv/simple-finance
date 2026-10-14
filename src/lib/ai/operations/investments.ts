import { z } from 'zod';
import prisma from '@/lib/prisma';
import { Operation, OperationResult } from './types';

export const getInvestmentSummaryOperation: Operation = {
  id: 'get_investment_summary',
  name: 'Get Investment Summary',
  description: 'Get summary of all investment assets (stocks, mutual funds, crypto, gold, etc.) with current value and returns.',
  category: 'read',
  parameters: z.object({}),
  execute: async (userId: string): Promise<OperationResult> => {
    const investments = await prisma.investment.findMany({
      where: { userId },
      orderBy: { currentValue: 'desc' },
    });

    let totalInvested = 0;
    let totalCurrent = 0;

    const formatted = investments.map((inv) => {
      const invested = Number(inv.investedAmount);
      const current = Number(inv.currentValue);
      const gainLoss = current - invested;
      const gainLossPercent = invested > 0 ? ((gainLoss / invested) * 100).toFixed(2) : '0';

      totalInvested += invested;
      totalCurrent += current;

      return {
        id: inv.id,
        name: inv.name,
        type: inv.type,
        investedAmount: invested,
        currentValue: current,
        gainLoss: Math.round(gainLoss * 100) / 100,
        returnPercent: `${gainLossPercent}%`,
        platform: inv.platform || null,
      };
    });

    const netGain = totalCurrent - totalInvested;
    const netReturnPercent = totalInvested > 0 ? ((netGain / totalInvested) * 100).toFixed(2) : '0';

    return {
      success: true,
      data: {
        totalInvested: Math.round(totalInvested * 100) / 100,
        totalCurrentValue: Math.round(totalCurrent * 100) / 100,
        netGainLoss: Math.round(netGain * 100) / 100,
        netReturnPercent: `${netReturnPercent}%`,
        investments: formatted,
      },
      summary: `Total investments: Invested ₹${totalInvested.toLocaleString('en-IN')}, Current Value ₹${totalCurrent.toLocaleString('en-IN')} (Net Return: ${netGain >= 0 ? '+' : ''}₹${netGain.toLocaleString('en-IN')} or ${netReturnPercent}%).`,
    };
  },
};

export const getFixedDepositSummaryOperation: Operation = {
  id: 'get_fixed_deposit_summary',
  name: 'Get Fixed Deposit Summary',
  description: 'Get summary of all Fixed Deposits with bank names, principal amount, interest rates, and maturity details.',
  category: 'read',
  parameters: z.object({}),
  execute: async (userId: string): Promise<OperationResult> => {
    const fds = await prisma.fixedDeposit.findMany({
      where: { userId },
      orderBy: { maturityDate: 'asc' },
    });

    let totalPrincipal = 0;
    let totalMaturity = 0;
    let totalInterest = 0;

    const formatted = fds.map((fd) => {
      const principal = Number(fd.principal);
      const maturity = Number(fd.maturityAmount);
      const interestEarned = Number(fd.interestEarned);

      totalPrincipal += principal;
      totalMaturity += maturity;
      totalInterest += interestEarned;

      const daysToMaturity = Math.ceil((new Date(fd.maturityDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

      return {
        id: fd.id,
        bankName: fd.bankName,
        principal,
        interestRate: `${Number(fd.interestRate)}%`,
        maturityDate: fd.maturityDate.toISOString().split('T')[0],
        maturityAmount: maturity,
        daysToMaturity: daysToMaturity > 0 ? daysToMaturity : 0,
        isMatured: daysToMaturity <= 0,
      };
    });

    return {
      success: true,
      data: {
        count: fds.length,
        totalPrincipal: Math.round(totalPrincipal * 100) / 100,
        totalMaturityAmount: Math.round(totalMaturity * 100) / 100,
        totalInterestEarned: Math.round(totalInterest * 100) / 100,
        fixedDeposits: formatted,
      },
      summary: `You have ${fds.length} Fixed Deposit(s) with total principal of ₹${totalPrincipal.toLocaleString('en-IN')} maturing into ₹${totalMaturity.toLocaleString('en-IN')}.`,
    };
  },
};
