import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import * as z from 'zod';

const creditCardSchema = z.object({
  cardName: z.string().min(2, 'Card name must be at least 2 characters'),
  lastFourDigits: z.string().regex(/^\d{4}$/, 'Must be exactly 4 digits').optional().nullable(),
  cardNumber: z.string().optional().nullable(),
  cardHolderName: z.string().optional().nullable(),
  expiryDate: z.string().optional().nullable(),
  cvv: z.string().optional().nullable(),
  template: z.string().optional().nullable(),
  creditLimit: z.number().positive('Limit must be positive'),
  outstandingBalance: z.number().nonnegative('Outstanding balance must be non-negative'),
  dueDate: z.number().min(1).max(31).optional().nullable(),
  statementDate: z.number().min(1).max(31).optional().nullable(),
  minimumDue: z.number().nonnegative().optional().nullable(),
  interestRate: z.number().positive().optional().nullable(),
  rewardsBalance: z.number().nonnegative().default(0),
  color: z.string().default('#6366f1'),
  accountId: z.string().uuid(),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cards = await prisma.creditCard.findMany({
      where: { userId: session.user.id },
      include: {
        account: true,
      },
      orderBy: { cardName: 'asc' },
    });

    const formatted = cards.map((c: any) => ({
      ...c,
      creditLimit: Number(c.creditLimit),
      outstandingBalance: Number(c.outstandingBalance),
      availableCredit: Number(c.availableCredit),
      minimumDue: c.minimumDue ? Number(c.minimumDue) : null,
      interestRate: c.interestRate ? Number(c.interestRate) : null,
      rewardsBalance: Number(c.rewardsBalance),
      account: { ...c.account, balance: Number(c.account.balance) },
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Failed to get credit cards:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = creditCardSchema.parse(body);

    const availableCredit = validated.creditLimit - validated.outstandingBalance;

    const card = await prisma.creditCard.create({
      data: {
        cardName: validated.cardName,
        lastFourDigits: validated.lastFourDigits,
        cardNumber: validated.cardNumber,
        cardHolderName: validated.cardHolderName,
        expiryDate: validated.expiryDate,
        cvv: validated.cvv,
        template: validated.template,
        creditLimit: validated.creditLimit,
        outstandingBalance: validated.outstandingBalance,
        availableCredit,
        dueDate: validated.dueDate,
        statementDate: validated.statementDate,
        minimumDue: validated.minimumDue,
        interestRate: validated.interestRate,
        rewardsBalance: validated.rewardsBalance,
        color: validated.color,
        accountId: validated.accountId,
        userId: session.user.id,
      },
    });

    return NextResponse.json({
      ...card,
      creditLimit: Number(card.creditLimit),
      outstandingBalance: Number(card.outstandingBalance),
      availableCredit: Number(card.availableCredit),
      minimumDue: card.minimumDue ? Number(card.minimumDue) : null,
      interestRate: card.interestRate ? Number(card.interestRate) : null,
      rewardsBalance: Number(card.rewardsBalance),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    console.error('Failed to create credit card:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
