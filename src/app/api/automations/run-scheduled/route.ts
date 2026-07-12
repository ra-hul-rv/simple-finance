import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();

    // Fetch all active scheduled automation rules for the user where nextExecution <= now
    const rules = await prisma.automationRule.findMany({
      where: {
        userId: session.user.id,
        triggerType: 'SCHEDULED',
        isActive: true,
        OR: [
          { nextExecution: null },
          { nextExecution: { lte: now } },
        ],
      },
    });

    let executedCount = 0;

    for (const rule of rules) {
      const actions = (rule.actions || []) as any[];
      const createTxAction = actions.find((a) => a.type === 'createTransaction');

      if (!createTxAction || !createTxAction.value) continue;

      const txDetails = createTxAction.value;
      const amount = Number(txDetails.amount);
      const accountId = txDetails.accountId;
      const categoryId = txDetails.categoryId || null;
      const type = txDetails.type || 'EXPENSE';
      const description = txDetails.description || 'Auto-generated Transaction';

      if (!accountId || isNaN(amount) || amount <= 0) continue;

      // Run database operations in a transaction
      await prisma.$transaction(async (tx) => {
        // 1. Create transaction record
        await tx.transaction.create({
          data: {
            userId: session.user.id,
            accountId,
            categoryId,
            amount,
            type,
            description,
            date: new Date(),
            status: 'COMPLETED',
          },
        });

        // 2. Adjust account balance
        if (type === 'EXPENSE' || type === 'INVESTMENT') {
          await tx.account.update({
            where: { id: accountId },
            data: {
              balance: {
                decrement: amount,
              },
            },
          });
        } else if (type === 'INCOME') {
          await tx.account.update({
            where: { id: accountId },
            data: {
              balance: {
                increment: amount,
              },
            },
          });
        }

        // 3. Compute next execution date based on frequency
        let nextExec = rule.nextExecution ? new Date(rule.nextExecution) : new Date();
        const frequency = rule.frequency || 'MONTHLY';

        if (frequency === 'DAILY') {
          nextExec.setDate(nextExec.getDate() + 1);
        } else if (frequency === 'WEEKLY') {
          nextExec.setDate(nextExec.getDate() + 7);
        } else if (frequency === 'MONTHLY') {
          nextExec.setMonth(nextExec.getMonth() + 1);
        } else if (frequency === 'YEARLY') {
          nextExec.setFullYear(nextExec.getFullYear() + 1);
        }

        // Ensure nextExec is in the future relative to the *rule's nextExecution*, but if it's lagging far behind, advance it until it exceeds now.
        while (nextExec.getTime() <= now.getTime()) {
          if (frequency === 'DAILY') {
            nextExec.setDate(nextExec.getDate() + 1);
          } else if (frequency === 'WEEKLY') {
            nextExec.setDate(nextExec.getDate() + 7);
          } else if (frequency === 'MONTHLY') {
            nextExec.setMonth(nextExec.getMonth() + 1);
          } else if (frequency === 'YEARLY') {
            nextExec.setFullYear(nextExec.getFullYear() + 1);
          }
        }

        // 4. Update the rule execution timestamp
        await tx.automationRule.update({
          where: { id: rule.id },
          data: {
            nextExecution: nextExec,
          },
        });
      });

      executedCount++;
    }

    return NextResponse.json({ success: true, executedCount });
  } catch (error) {
    console.error('Failed to run scheduled automations:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
