import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Atomic data wipe within transaction scope
    await prisma.$transaction([
      prisma.auditLog.deleteMany({ where: { userId: session.user.id } }),
      prisma.notification.deleteMany({ where: { userId: session.user.id } }),
      prisma.lending.deleteMany({ where: { userId: session.user.id } }),
      prisma.fixedDeposit.deleteMany({ where: { userId: session.user.id } }),
      prisma.creditCard.deleteMany({ where: { userId: session.user.id } }),
      prisma.investment.deleteMany({ where: { userId: session.user.id } }),
      prisma.budget.deleteMany({ where: { userId: session.user.id } }),
      prisma.subscription.deleteMany({ where: { userId: session.user.id } }),
      prisma.recurringTransaction.deleteMany({ where: { userId: session.user.id } }),
      prisma.transactionTag.deleteMany({ where: { transaction: { userId: session.user.id } } }),
      prisma.transaction.deleteMany({ where: { userId: session.user.id } }),
      prisma.category.deleteMany({ where: { userId: session.user.id } }),
      prisma.account.deleteMany({ where: { userId: session.user.id } }),
    ]);

    return NextResponse.json({ success: true, message: 'All transactions and ledger data wiped clean' });
  } catch (error) {
    console.error('Failed to reset account data:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
