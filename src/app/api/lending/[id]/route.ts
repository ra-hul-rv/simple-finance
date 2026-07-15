import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

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

    // Check if it's a repayment collection or general update
    if (body.amountCollected !== undefined) {
      const { amountCollected, accountId, date, notes } = body;

      const lending = await prisma.lending.findUnique({
        where: { id, userId: session.user.id },
      });

      if (!lending) {
        return NextResponse.json({ error: 'Lending record not found' }, { status: 404 });
      }

      const newBalance = Number(lending.outstandingBalance) - Number(amountCollected);

      // Start transaction to update lending, account balance, and create transaction record
      const result = await prisma.$transaction(async (tx) => {
        // 1. Update lending outstanding balance and status if fully collected
        const updatedLending = await tx.lending.update({
          where: { id },
          data: {
            outstandingBalance: newBalance <= 0 ? 0 : newBalance,
            status: newBalance <= 0 ? 'SETTLED' : 'ACTIVE',
          },
        });

        // 2. Adjust account balance and create transaction
        if (accountId) {
          if (lending.type === 'LENT') {
            // Collecting lent money -> INCOME, balance increases
            await tx.account.update({
              where: { id: accountId },
              data: { balance: { increment: amountCollected } },
            });

            await tx.transaction.create({
              data: {
                amount: amountCollected,
                type: 'INCOME',
                description: `Repayment from ${lending.personName}`,
                notes: notes || `Partial repayment collection`,
                date: date ? new Date(date) : new Date(),
                accountId,
                userId: session.user.id,
                lendingId: id,
              },
            });
          } else {
            // Repaying borrowed money -> EXPENSE, balance decreases
            await tx.account.update({
              where: { id: accountId },
              data: { balance: { decrement: amountCollected } },
            });

            await tx.transaction.create({
              data: {
                amount: amountCollected,
                type: 'EXPENSE',
                description: `Repaying ${lending.personName}`,
                notes: notes || `Partial repayment`,
                date: date ? new Date(date) : new Date(),
                accountId,
                userId: session.user.id,
                lendingId: id,
              },
            });
          }
        }

        return updatedLending;
      });

      return NextResponse.json(result);
    } else {
      // General update
      const { type, personName, totalAmount, outstandingBalance, dueDate, interestRate, color, notes, status, accountId, personId } = body;

      const updated = await prisma.lending.update({
        where: { id, userId: session.user.id },
        data: {
          type,
          personName,
          totalAmount,
          outstandingBalance,
          dueDate: dueDate ? new Date(dueDate) : null,
          interestRate,
          color,
          notes,
          status,
          accountId,
          personId,
        },
      });

      return NextResponse.json(updated);
    }
  } catch (error) {
    console.error('Failed to update lending:', error);
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

    await prisma.lending.delete({
      where: { id, userId: session.user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete lending:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
