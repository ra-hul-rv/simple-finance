import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const convertSchema = z.object({
  accountId: z.string().min(1, 'Account is required'),
  categoryId: z.string().min(1, 'Category is required'),
  description: z.string().min(1, 'Description is required'),
  date: z.string().default(() => new Date().toISOString()),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: listId } = await params;
    const body = await request.json();
    const validated = convertSchema.parse(body);

    // Verify ownership and get list with items
    const list = await prisma.shoppingList.findUnique({
      where: { id: listId, userId: session.user.id },
      include: { items: true },
    });

    if (!list) {
      return NextResponse.json({ error: 'Shopping list not found' }, { status: 404 });
    }

    // Filter checked items
    const checkedItems = list.items.filter((item) => item.checked);
    if (checkedItems.length === 0) {
      return NextResponse.json(
        { error: 'Cannot convert list. No checked items found.' },
        { status: 400 }
      );
    }

    // Calculate total cost
    let totalCost = 0;
    for (const item of checkedItems) {
      const price = item.estimatedPrice ? Number(item.estimatedPrice) : 0;
      totalCost += price * item.quantity;
    }

    if (totalCost <= 0) {
      return NextResponse.json(
        { error: 'Cannot convert list. Total cost must be greater than zero.' },
        { status: 400 }
      );
    }

    // Verify account exists and belongs to user
    const account = await prisma.account.findUnique({
      where: { id: validated.accountId, userId: session.user.id },
    });

    if (!account) {
      return NextResponse.json({ error: 'Selected account not found' }, { status: 404 });
    }

    // Perform database updates in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Transaction record
      const transaction = await tx.transaction.create({
        data: {
          userId: session.user.id,
          accountId: validated.accountId,
          categoryId: validated.categoryId,
          amount: totalCost,
          type: 'EXPENSE',
          description: validated.description,
          date: new Date(validated.date),
          status: 'COMPLETED',
        },
      });

      // 2. Deduct from Account balance
      await tx.account.update({
        where: { id: validated.accountId },
        data: {
          balance: {
            decrement: totalCost,
          },
        },
      });

      // 3. Mark the Shopping List as completed
      await tx.shoppingList.update({
        where: { id: listId },
        data: {
          isCompleted: true,
        },
      });

      return transaction;
    });

    return NextResponse.json({
      success: true,
      transaction: {
        ...result,
        amount: Number(result.amount),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    console.error('Failed to convert shopping list to expense:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
