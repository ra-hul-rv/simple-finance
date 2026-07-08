import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import * as z from 'zod';

const recurringSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  amount: z.number().positive('Amount must be positive'),
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER', 'INVESTMENT']),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']),
  startDate: z.string(),
  endDate: z.string().optional().nullable(),
  accountId: z.string().uuid(),
  categoryId: z.string().uuid().optional().nullable(),
  description: z.string().optional().nullable(),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const recurrings = await prisma.recurringTransaction.findMany({
      where: { userId: session.user.id },
      include: {
        account: true,
        category: true,
      },
      orderBy: { nextDate: 'asc' },
    });

    const formatted = recurrings.map((r: any) => ({
      ...r,
      amount: Number(r.amount),
      account: { ...r.account, balance: Number(r.account.balance) },
      category: r.category ? { ...r.category, budgetAmount: r.category.budgetAmount ? Number(r.category.budgetAmount) : null } : null,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Failed to get recurring transactions:', error);
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
    const validated = recurringSchema.parse(body);

    const nextDate = new Date(validated.startDate);

    const recurring = await prisma.recurringTransaction.create({
      data: {
        name: validated.name,
        amount: validated.amount,
        type: validated.type,
        frequency: validated.frequency,
        startDate: new Date(validated.startDate),
        endDate: validated.endDate ? new Date(validated.endDate) : null,
        nextDate,
        description: validated.description || null,
        accountId: validated.accountId,
        categoryId: validated.categoryId || null,
        userId: session.user.id,
      },
    });

    return NextResponse.json({
      ...recurring,
      amount: Number(recurring.amount),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    console.error('Failed to create recurring transaction:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
