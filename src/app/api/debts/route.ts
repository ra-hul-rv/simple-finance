import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import * as z from 'zod';

const debtSchema = z.object({
  lenderName: z.string().min(2, 'Lender name is required'),
  totalBorrowed: z.number().positive('Total borrowed must be positive'),
  outstandingBalance: z.number().nonnegative('Outstanding balance cannot be negative'),
  dueDate: z.string().optional().nullable(),
  interestRate: z.number().optional().nullable(),
  color: z.string().optional(),
  notes: z.string().optional().nullable(),
  accountId: z.string().uuid().optional().nullable(),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const debts = await prisma.debt.findMany({
      where: { userId: session.user.id },
      include: { account: true },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = debts.map((d: any) => ({
      ...d,
      totalBorrowed: Number(d.totalBorrowed),
      outstandingBalance: Number(d.outstandingBalance),
      interestRate: d.interestRate ? Number(d.interestRate) : null,
      account: d.account ? { ...d.account, balance: Number(d.account.balance) } : null,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Failed to get debts:', error);
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
    const validated = debtSchema.parse(body);

    const debt = await prisma.debt.create({
      data: {
        ...validated,
        dueDate: validated.dueDate ? new Date(validated.dueDate) : null,
        userId: session.user.id,
      },
    });

    return NextResponse.json({
      ...debt,
      totalBorrowed: Number(debt.totalBorrowed),
      outstandingBalance: Number(debt.outstandingBalance),
      interestRate: debt.interestRate ? Number(debt.interestRate) : null,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    console.error('Failed to create debt:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
