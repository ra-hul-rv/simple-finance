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

    // Check if it's a payment recording or a general update
    if (body.amountPaid !== undefined) {
      const { amountPaid, accountId, date, notes } = body;

      const debt = await prisma.debt.findUnique({
        where: { id, userId: session.user.id },
      });

      if (!debt) {
        return NextResponse.json({ error: 'Debt not found' }, { status: 404 });
      }

      const newBalance = Number(debt.outstandingBalance) - Number(amountPaid);

      // Start transaction to update debt, account balance, and create transaction record
      const result = await prisma.$transaction(async (tx) => {
        // 1. Update debt outstanding balance and status if fully paid
        const updatedDebt = await tx.debt.update({
          where: { id },
          data: {
            outstandingBalance: newBalance <= 0 ? 0 : newBalance,
            status: newBalance <= 0 ? 'SETTLED' : 'ACTIVE',
          },
        });

        // 2. Decrement account balance if accountId is provided
        if (accountId) {
          await tx.account.update({
            where: { id: accountId },
            data: {
              balance: {
                decrement: amountPaid,
              },
            },
          });

          // 3. Create transaction record
          await tx.transaction.create({
            data: {
              amount: amountPaid,
              type: 'EXPENSE',
              description: `Repayment to ${debt.lenderName}`,
              notes: notes || `Partial repayment for borrowing`,
              date: date ? new Date(date) : new Date(),
              accountId,
              userId: session.user.id,
            },
          });
        }

        return updatedDebt;
      });

      return NextResponse.json(result);
    } else {
      // General update
      const { lenderName, totalBorrowed, outstandingBalance, dueDate, interestRate, color, notes, status, accountId } = body;

      const updated = await prisma.debt.update({
        where: { id, userId: session.user.id },
        data: {
          lenderName,
          totalBorrowed,
          outstandingBalance,
          dueDate: dueDate ? new Date(dueDate) : null,
          interestRate,
          color,
          notes,
          status,
          accountId,
        },
      });

      return NextResponse.json(updated);
    }
  } catch (error) {
    console.error('Failed to update debt:', error);
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

    await prisma.debt.delete({
      where: { id, userId: session.user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete debt:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
