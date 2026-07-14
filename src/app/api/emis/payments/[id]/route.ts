import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const updateSchema = z.object({
  status: z.enum(['PENDING', 'PAID']),
  paidDate: z.string().optional().nullable(),
  paymentSource: z.enum(['SELF', 'FRIEND']).optional().nullable(),
  sourceAccountId: z.string().uuid().optional().nullable(),
});

async function syncCreditCardBalances(accountId: string, prismaClient: any) {
  const card = await prismaClient.creditCard.findUnique({
    where: { accountId },
  });

  if (!card) return;

  const account = await prismaClient.account.findUnique({
    where: { id: accountId },
  });

  if (!account) return;

  const outstanding = Math.max(0, -Number(account.balance));
  const available = Math.max(0, Number(card.creditLimit) - outstanding);

  await prismaClient.creditCard.update({
    where: { id: card.id },
    data: {
      outstandingBalance: outstanding,
      availableCredit: available,
    },
  });
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

    const resolvedParams = await params;
    const body = await request.json();
    const validated = updateSchema.parse(body);

    const payment = await prisma.emiPayment.findUnique({
      where: { id: resolvedParams.id },
      include: { emi: true },
    });

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    if (validated.status === 'PAID' && payment.status === 'PENDING') {
      // Execute within a Prisma Transaction
      const result = await prisma.$transaction(async (tx: any) => {
        let transactionId = null;

        if (validated.paymentSource && validated.sourceAccountId) {
          const amount = payment.amount;
          const date = validated.paidDate ? new Date(validated.paidDate) : new Date();

          if (validated.paymentSource === 'SELF') {
            // Transfer from Source Bank Account to EMI Card Account
            const createdTx = await tx.transaction.create({
              data: {
                amount: amount,
                type: 'CREDIT_CARD_PAYMENT',
                date: date,
                description: `EMI Payment: ${payment.emi.itemName} (Month ${payment.monthNumber})`,
                accountId: validated.sourceAccountId, // From Bank
                transferToAccountId: payment.emi.accountId, // To Card
                userId: session.user.id,
              },
            });
            transactionId = createdTx.id;

            // Decrement bank account
            await tx.account.update({
              where: { id: validated.sourceAccountId },
              data: { balance: { decrement: amount } },
            });

            // Increment card account
            await tx.account.update({
              where: { id: payment.emi.accountId },
              data: { balance: { increment: amount } },
            });
            
            await syncCreditCardBalances(validated.sourceAccountId, tx);
            await syncCreditCardBalances(payment.emi.accountId, tx);

          } else if (validated.paymentSource === 'FRIEND') {
            // Income from Friend to Source Bank Account
            const createdTx = await tx.transaction.create({
              data: {
                amount: amount,
                type: 'INCOME',
                flowType: 'EMI Recovery',
                date: date,
                description: `EMI Recovery: ${payment.emi.itemName} (Month ${payment.monthNumber})`,
                accountId: validated.sourceAccountId, // To Bank
                personId: payment.emi.personId,
                userId: session.user.id,
              },
            });
            transactionId = createdTx.id;

            // Increment bank account
            await tx.account.update({
              where: { id: validated.sourceAccountId },
              data: { balance: { increment: amount } },
            });
            
            await syncCreditCardBalances(validated.sourceAccountId, tx);
          }
        }

        // Update payment status
        const updatedPayment = await tx.emiPayment.update({
          where: { id: payment.id },
          data: {
            status: 'PAID',
            paidDate: validated.paidDate ? new Date(validated.paidDate) : new Date(),
            transactionId: transactionId,
          },
        });

        // Increment months paid on parent EMI
        await tx.emi.update({
          where: { id: payment.emiId },
          data: { monthsPaid: { increment: 1 } },
        });

        return updatedPayment;
      });
      return NextResponse.json(result);
    } 
    
    // If reverting to pending
    if (validated.status === 'PENDING' && payment.status === 'PAID') {
      const result = await prisma.$transaction(async (tx: any) => {
        // Find existing transaction to delete if we are reverting
        if (payment.transactionId) {
          const oldTx = await tx.transaction.findUnique({
            where: { id: payment.transactionId }
          });
          
          if (oldTx) {
            if (oldTx.type === 'CREDIT_CARD_PAYMENT' && oldTx.transferToAccountId) {
              await tx.account.update({
                where: { id: oldTx.accountId },
                data: { balance: { increment: oldTx.amount } },
              });
              await tx.account.update({
                where: { id: oldTx.transferToAccountId },
                data: { balance: { decrement: oldTx.amount } },
              });
              await syncCreditCardBalances(oldTx.accountId, tx);
              await syncCreditCardBalances(oldTx.transferToAccountId, tx);
            } else if (oldTx.type === 'INCOME') {
              await tx.account.update({
                where: { id: oldTx.accountId },
                data: { balance: { decrement: oldTx.amount } },
              });
              await syncCreditCardBalances(oldTx.accountId, tx);
            }
            await tx.transaction.delete({ where: { id: oldTx.id } });
          }
        }

        const updatedPayment = await tx.emiPayment.update({
          where: { id: payment.id },
          data: {
            status: 'PENDING',
            paidDate: null,
            transactionId: null,
          },
        });

        await tx.emi.update({
          where: { id: payment.emiId },
          data: { monthsPaid: { decrement: 1 } },
        });

        return updatedPayment;
      });
      return NextResponse.json(result);
    }

    return NextResponse.json(payment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    console.error('Failed to update emi payment:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
