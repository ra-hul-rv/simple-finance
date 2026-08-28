import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const accountSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum([
    'SAVINGS',
    'CURRENT',
    'CASH',
    'CREDIT_CARD',
    'DEBIT_CARD',
    'FIXED_DEPOSIT',
    'STOCKS',
    'MUTUAL_FUNDS',
    'CRYPTO',
    'LOAN',
    'EPF',
    'PPF',
    'NPS',
    'WALLET',
    'OTHER',
  ]),
  institution: z.string().nullish(),
  accountNumber: z.string().nullish(),
  balance: z.number().default(0),
  openingBalance: z.number().default(0),
  currency: z.string().default('INR'),
  interestRate: z.number().nullish(),
  creditLimit: z.number().nullish(),
  color: z.string().default('#6366f1'),
  icon: z.string().default('wallet'),
  notes: z.string().nullish(),
});

async function getUserIdFromRequest(request: Request): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (token) {
      const settings = await prisma.userSettings.findFirst({
        where: { webhookToken: token },
        select: { userId: true },
      });
      if (settings?.userId) return settings.userId;
    }
  }

  const session = await auth();
  return session?.user?.id || null;
}

export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accounts = await prisma.account.findMany({
      where: { userId },
      include: {
        subAccounts: {
          select: {
            id: true,
            name: true,
            balance: true,
            color: true,
            icon: true,
            iconPath: true,
            isActive: true,
            _count: { select: { transactions: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Format Decimal fields to standard numbers
    const formattedAccounts = accounts.map((acc: any) => ({
      ...acc,
      balance: Number(acc.balance),
      openingBalance: Number(acc.openingBalance),
      interestRate: acc.interestRate ? Number(acc.interestRate) : null,
      creditLimit: acc.creditLimit ? Number(acc.creditLimit) : null,
      subAccounts: (acc.subAccounts || []).map((sa: any) => ({
        ...sa,
        balance: Number(sa.balance),
        transactionCount: sa._count?.transactions || 0,
      })),
    }));

    return NextResponse.json(formattedAccounts);
  } catch (error) {
    console.error('Failed to get accounts:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = accountSchema.parse(body);

    const account = await prisma.account.create({
      data: {
        ...validated,
        userId,
      },
    });

    return NextResponse.json({
      ...account,
      balance: Number(account.balance),
      openingBalance: Number(account.openingBalance),
      interestRate: account.interestRate ? Number(account.interestRate) : null,
      creditLimit: account.creditLimit ? Number(account.creditLimit) : null,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    console.error('Failed to create account:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
