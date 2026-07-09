import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import * as z from 'zod';

const recurringSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  amount: z.number().positive('Amount must be positive'),
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER', 'INVESTMENT']),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'SEMI_ANNUALLY', 'YEARLY']),
  startDate: z.string(),
  endDate: z.string().optional().nullable(),
  nextDate: z.string().optional(),
  isActive: z.boolean().optional(),
  accountId: z.string().uuid(),
  categoryId: z.string().uuid().optional().nullable(),
  description: z.string().optional().nullable(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const validated = recurringSchema.parse(body);

    const updated = await prisma.recurringTransaction.update({
      where: { id, userId: session.user.id },
      data: {
        name: validated.name,
        amount: validated.amount,
        type: validated.type,
        frequency: validated.frequency,
        startDate: new Date(validated.startDate),
        endDate: validated.endDate ? new Date(validated.endDate) : null,
        nextDate: validated.nextDate ? new Date(validated.nextDate) : undefined,
        isActive: validated.isActive,
        description: validated.description || null,
        accountId: validated.accountId,
        categoryId: validated.categoryId || null,
      },
    });

    return NextResponse.json({
      ...updated,
      amount: Number(updated.amount),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    console.error('Failed to update recurring transaction:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    await prisma.recurringTransaction.delete({
      where: { id, userId: session.user.id },
    });

    return NextResponse.json({ success: true, message: 'Recurring transaction deleted successfully' });
  } catch (error) {
    console.error('Failed to delete recurring transaction:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
