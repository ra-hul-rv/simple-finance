import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import * as z from 'zod';

const loanSchema = z.object({
  borrowerName: z.string().min(2, 'Borrower name is required'),
  totalLent: z.number().positive('Total lent must be positive'),
  outstandingBalance: z.number().nonnegative('Outstanding balance cannot be negative'),
  dueDate: z.string().optional().nullable(),
  interestRate: z.number().optional().nullable(),
  color: z.string().optional(),
  notes: z.string().optional().nullable(),
  accountId: z.string().uuid().optional().nullable(),
  personId: z.string().uuid().optional().nullable(),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const loans = await prisma.loan.findMany({
      where: { userId: session.user.id },
      include: { account: true },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = loans.map((l: any) => ({
      ...l,
      totalLent: Number(l.totalLent),
      outstandingBalance: Number(l.outstandingBalance),
      interestRate: l.interestRate ? Number(l.interestRate) : null,
      account: l.account ? { ...l.account, balance: Number(l.account.balance) } : null,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Failed to get loans:', error);
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
    const validated = loanSchema.parse(body);

    const loan = await prisma.loan.create({
      data: {
        ...validated,
        dueDate: validated.dueDate ? new Date(validated.dueDate) : null,
        userId: session.user.id,
      },
    });

    return NextResponse.json({
      ...loan,
      totalLent: Number(loan.totalLent),
      outstandingBalance: Number(loan.outstandingBalance),
      interestRate: loan.interestRate ? Number(loan.interestRate) : null,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    console.error('Failed to create loan:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
