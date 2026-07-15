import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import * as z from 'zod';

const lendingSchema = z.object({
  type: z.enum(['LENT', 'BORROWED']),
  personName: z.string().min(2, 'Person name is required'),
  totalAmount: z.number().positive('Total amount must be positive'),
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

    const lendings = await prisma.lending.findMany({
      where: { userId: session.user.id },
      include: { 
        account: true, 
        person: true,
        transactions: { orderBy: { date: 'desc' } }
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = lendings.map((l: any) => ({
      ...l,
      totalAmount: Number(l.totalAmount),
      outstandingBalance: Number(l.outstandingBalance),
      interestRate: l.interestRate ? Number(l.interestRate) : null,
      account: l.account ? { ...l.account, balance: Number(l.account.balance) } : null,
      transactions: l.transactions.map((t: any) => ({
        ...t,
        amount: Number(t.amount),
      }))
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Failed to get lendings:', error);
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
    const validated = lendingSchema.parse(body);

    const result = await prisma.$transaction(async (tx) => {
      const lending = await tx.lending.create({
        data: {
          ...validated,
          dueDate: validated.dueDate ? new Date(validated.dueDate) : null,
          userId: session.user.id,
        },
      });

      if (validated.accountId) {
        if (validated.type === 'LENT') {
          // I lent money -> EXPENSE, balance decreases
          await tx.account.update({
            where: { id: validated.accountId },
            data: { balance: { decrement: validated.totalAmount } },
          });
          
          await tx.transaction.create({
            data: {
              amount: validated.totalAmount,
              type: 'EXPENSE',
              description: `Lent money to ${validated.personName}`,
              date: new Date(),
              accountId: validated.accountId,
              userId: session.user.id,
              lendingId: lending.id,
            },
          });
        } else {
          // I borrowed money -> INCOME, balance increases
          await tx.account.update({
            where: { id: validated.accountId },
            data: { balance: { increment: validated.totalAmount } },
          });

          await tx.transaction.create({
            data: {
              amount: validated.totalAmount,
              type: 'INCOME',
              description: `Borrowed money from ${validated.personName}`,
              date: new Date(),
              accountId: validated.accountId,
              userId: session.user.id,
              lendingId: lending.id,
            },
          });
        }
      }

      return lending;
    });

    return NextResponse.json({
      ...result,
      totalAmount: Number(result.totalAmount),
      outstandingBalance: Number(result.outstandingBalance),
      interestRate: result.interestRate ? Number(result.interestRate) : null,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    console.error('Failed to create lending:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
