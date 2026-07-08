import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const updateTransactionSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  type: z.enum([
    'INCOME',
    'EXPENSE',
    'TRANSFER',
    'INVESTMENT',
    'CREDIT_CARD_PAYMENT',
    'REFUND',
    'INTEREST',
    'DIVIDEND',
  ]),
  date: z.string().transform((str) => new Date(str)),
  description: z.string().min(1, 'Description is required'),
  merchant: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  accountId: z.string().uuid(),
  categoryId: z.string().uuid().optional().nullable(),
  transferToAccountId: z.string().uuid().optional().nullable(),
});

// Revert balances for a transaction
async function revertBalances(tx: any, prismaClient: any) {
  const amount = Number(tx.amount);
  
  if (tx.type === 'INCOME' || tx.type === 'REFUND' || tx.type === 'INTEREST' || tx.type === 'DIVIDEND') {
    await prismaClient.account.update({
      where: { id: tx.accountId },
      data: { balance: { decrement: amount } },
    });
  } else if (tx.type === 'EXPENSE' || tx.type === 'INVESTMENT') {
    await prismaClient.account.update({
      where: { id: tx.accountId },
      data: { balance: { increment: amount } },
    });
  } else if (tx.type === 'TRANSFER' || tx.type === 'CREDIT_CARD_PAYMENT') {
    // Revert source (increment it back)
    await prismaClient.account.update({
      where: { id: tx.accountId },
      data: { balance: { increment: amount } },
    });
    // Revert destination (decrement it back)
    if (tx.transferToAccountId) {
      await prismaClient.account.update({
        where: { id: tx.transferToAccountId },
        data: { balance: { decrement: amount } },
      });
    }
  }

  // Revert budget spent
  if (tx.type === 'EXPENSE' && tx.categoryId) {
    const txMonth = new Date(tx.date).getMonth() + 1;
    const txYear = new Date(tx.date).getFullYear();

    const budget = await prismaClient.budget.findFirst({
      where: {
        userId: tx.userId,
        categoryId: tx.categoryId,
        month: txMonth,
        year: txYear,
      },
    });

    if (budget) {
      await prismaClient.budget.update({
        where: { id: budget.id },
        data: { spent: { decrement: amount } },
      });
    }
  }
}

// Apply balances for a transaction
async function applyBalances(tx: any, prismaClient: any) {
  const amount = Number(tx.amount);

  if (tx.type === 'INCOME' || tx.type === 'REFUND' || tx.type === 'INTEREST' || tx.type === 'DIVIDEND') {
    await prismaClient.account.update({
      where: { id: tx.accountId },
      data: { balance: { increment: amount } },
    });
  } else if (tx.type === 'EXPENSE' || tx.type === 'INVESTMENT') {
    await prismaClient.account.update({
      where: { id: tx.accountId },
      data: { balance: { decrement: amount } },
    });
  } else if (tx.type === 'TRANSFER' || tx.type === 'CREDIT_CARD_PAYMENT') {
    if (!tx.transferToAccountId) {
      throw new Error('Destination account is required for transfers');
    }
    // Decrement source
    await prismaClient.account.update({
      where: { id: tx.accountId },
      data: { balance: { decrement: amount } },
    });
    // Increment destination
    await prismaClient.account.update({
      where: { id: tx.transferToAccountId },
      data: { balance: { increment: amount } },
    });
  }

  // Update budget spent
  if (tx.type === 'EXPENSE' && tx.categoryId) {
    const txMonth = new Date(tx.date).getMonth() + 1;
    const txYear = new Date(tx.date).getFullYear();

    const budget = await prismaClient.budget.findFirst({
      where: {
        userId: tx.userId,
        categoryId: tx.categoryId,
        month: txMonth,
        year: txYear,
      },
    });

    if (budget) {
      await prismaClient.budget.update({
        where: { id: budget.id },
        data: { spent: { increment: amount } },
      });
    }
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const transaction = await prisma.transaction.findFirst({
      where: { id, userId: session.user.id },
      include: {
        account: true,
        category: true,
        transferToAccount: true,
      },
    });

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...transaction,
      amount: Number(transaction.amount),
    });
  } catch (error) {
    console.error('Failed to get transaction:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

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
    const validated = updateTransactionSchema.parse(body);

    const updatedTx = await prisma.$transaction(async (tx: any) => {
      // Find old transaction
      const oldTx = await tx.transaction.findFirst({
        where: { id, userId: session.user.id },
      });

      if (!oldTx) {
        throw new Error('Transaction not found');
      }

      // Revert previous effects on accounts & budgets
      await revertBalances(oldTx, tx);

      // Save new transaction details
      const newTx = await tx.transaction.update({
        where: { id },
        data: {
          amount: validated.amount,
          type: validated.type,
          date: validated.date,
          description: validated.description,
          merchant: validated.merchant || null,
          location: validated.location || null,
          notes: validated.notes || null,
          accountId: validated.accountId,
          categoryId: validated.categoryId || null,
          transferToAccountId: validated.transferToAccountId || null,
        },
      });

      // Apply new effects
      await applyBalances(newTx, tx);

      return newTx;
    });

    return NextResponse.json({
      ...updatedTx,
      amount: Number(updatedTx.amount),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    console.error('Failed to update transaction:', error);
    return NextResponse.json({ error: (error as any).message || 'Internal Server Error' }, { status: 500 });
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

    await prisma.$transaction(async (tx: any) => {
      const transaction = await tx.transaction.findFirst({
        where: { id, userId: session.user.id },
      });

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      // Revert balances
      await revertBalances(transaction, tx);

      // Delete the transaction record
      await tx.transaction.delete({
        where: { id },
      });
    });

    return NextResponse.json({ success: true, message: 'Transaction deleted successfully' });
  } catch (error) {
    console.error('Failed to delete transaction:', error);
    return NextResponse.json({ error: (error as any).message || 'Internal Server Error' }, { status: 500 });
  }
}
