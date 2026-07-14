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

      const loan = await prisma.loan.findUnique({
        where: { id, userId: session.user.id },
      });

      if (!loan) {
        return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
      }

      const newBalance = Number(loan.outstandingBalance) - Number(amountCollected);

      // Start transaction to update loan, account balance, and create transaction record
      const result = await prisma.$transaction(async (tx) => {
        // 1. Update loan outstanding balance and status if fully collected
        const updatedLoan = await tx.loan.update({
          where: { id },
          data: {
            outstandingBalance: newBalance <= 0 ? 0 : newBalance,
            status: newBalance <= 0 ? 'SETTLED' : 'ACTIVE',
          },
        });

        // 2. Increment account balance if accountId is provided
        if (accountId) {
          await tx.account.update({
            where: { id: accountId },
            data: {
              balance: {
                increment: amountCollected,
              },
            },
          });

          // 3. Create transaction record
          await tx.transaction.create({
            data: {
              amount: amountCollected,
              type: 'INCOME',
              description: `Repayment from ${loan.borrowerName}`,
              notes: notes || `Partial repayment collection`,
              date: date ? new Date(date) : new Date(),
              accountId,
              userId: session.user.id,
            },
          });
        }

        return updatedLoan;
      });

      return NextResponse.json(result);
    } else {
      // General update
      const { borrowerName, totalLent, outstandingBalance, dueDate, interestRate, color, notes, status, accountId, personId } = body;

      const updated = await prisma.loan.update({
        where: { id, userId: session.user.id },
        data: {
          borrowerName,
          totalLent,
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
    console.error('Failed to update loan:', error);
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

    await prisma.loan.delete({
      where: { id, userId: session.user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete loan:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
