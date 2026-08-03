import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const subAccountSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  accountId: z.string().uuid('Invalid account ID'),
  balance: z.number().default(0),
  color: z.string().default('#6366f1'),
  icon: z.string().default('zap'),
  iconPath: z.string().optional().nullable(),
  credentials: z.string().optional().nullable(), // JSON string
  notes: z.string().optional().nullable(),
});

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    const whereClause: any = {};

    if (accountId) {
      // Verify the account belongs to the user
      const account = await prisma.account.findFirst({
        where: { id: accountId, userId: session.user.id },
      });
      if (!account) {
        return NextResponse.json({ error: 'Account not found' }, { status: 404 });
      }
      whereClause.accountId = accountId;
    } else {
      // Get all sub-accounts for all wallet accounts owned by this user
      const walletAccounts = await prisma.account.findMany({
        where: { userId: session.user.id, type: 'WALLET' },
        select: { id: true },
      });
      whereClause.accountId = { in: walletAccounts.map(a => a.id) };
    }

    const subAccounts = await prisma.subAccount.findMany({
      where: whereClause,
      include: {
        account: { select: { name: true, color: true } },
        _count: { select: { transactions: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const formatted = subAccounts.map((sa: any) => ({
      ...sa,
      balance: Number(sa.balance),
      transactionCount: sa._count.transactions,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Failed to get sub-accounts:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = subAccountSchema.parse(body);

    // Verify the account belongs to the user and is a WALLET type
    const account = await prisma.account.findFirst({
      where: { id: validated.accountId, userId: session.user.id },
    });

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    if (account.type !== 'WALLET') {
      return NextResponse.json({ error: 'Sub-accounts can only be added to WALLET type accounts' }, { status: 400 });
    }

    const subAccount = await prisma.$transaction(async (tx: any) => {
      const sa = await tx.subAccount.create({
        data: {
          name: validated.name,
          accountId: validated.accountId,
          balance: validated.balance,
          color: validated.color,
          icon: validated.icon,
          iconPath: validated.iconPath || null,
          credentials: validated.credentials || null,
          notes: validated.notes || null,
        },
      });

      // Update parent wallet balance to include this sub-account's initial balance
      if (validated.balance > 0) {
        await tx.account.update({
          where: { id: validated.accountId },
          data: { balance: { increment: validated.balance } },
        });
      }

      return sa;
    });

    return NextResponse.json({
      ...subAccount,
      balance: Number(subAccount.balance),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    console.error('Failed to create sub-account:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
