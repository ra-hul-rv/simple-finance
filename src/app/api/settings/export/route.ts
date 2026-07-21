import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Fetch all user data
    const [
      user,
      settings,
      accounts,
      categories,
      tags,
      flowTypes,
      templates,
      transactions,
      recurringTransactions,
      budgets,
      investments,
      creditCards,
      fixedDeposits,
      subscriptions,
    ] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true, createdAt: true } }),
      prisma.userSettings.findUnique({ where: { userId } }),
      prisma.account.findMany({ where: { userId } }),
      prisma.category.findMany({ where: { userId } }),
      prisma.tag.findMany({ where: { userId } }),
      prisma.flowType.findMany({ where: { userId } }),
      prisma.transactionTemplate.findMany({ where: { userId } }),
      prisma.transaction.findMany({ where: { userId }, include: { tags: true } }),
      prisma.recurringTransaction.findMany({ where: { userId } }),
      prisma.budget.findMany({ where: { userId } }),
      prisma.investment.findMany({ where: { userId } }),
      prisma.creditCard.findMany({ where: { userId } }),
      prisma.fixedDeposit.findMany({ where: { userId } }),
      prisma.subscription.findMany({ where: { userId } }),
    ]);

    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      user,
      settings,
      accounts,
      categories,
      tags,
      flowTypes,
      templates,
      transactions,
      recurringTransactions,
      budgets,
      investments,
      creditCards,
      fixedDeposits,
      subscriptions,
    };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="simple-finance-export-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error) {
    console.error('Failed to export data:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
