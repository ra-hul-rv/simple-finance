import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import * as z from 'zod';

const creditCardUpdateSchema = z.object({
  cardName: z.string().min(2),
  lastFourDigits: z.string().regex(/^\d{4}$/).optional().nullable(),
  cardNumber: z.string().optional().nullable(),
  cardHolderName: z.string().optional().nullable(),
  expiryDate: z.string().optional().nullable(),
  cvv: z.string().optional().nullable(),
  template: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  creditLimit: z.number().positive(),
  outstandingBalance: z.number().nonnegative(),
  dueDate: z.number().min(1).max(31).optional().nullable(),
  statementDate: z.number().min(1).max(31).optional().nullable(),
  minimumDue: z.number().nonnegative().optional().nullable(),
  interestRate: z.number().positive().optional().nullable(),
  rewardsBalance: z.number().nonnegative().default(0),
  color: z.string().default('#6366f1'),
  accountId: z.string().uuid(),
});

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
    const validated = creditCardUpdateSchema.parse(body);

    const existingCard = await prisma.creditCard.findUnique({
      where: { id, userId: session.user.id },
    });

    if (!existingCard) {
      return NextResponse.json({ error: 'Credit card not found' }, { status: 404 });
    }

    const availableCredit = validated.creditLimit - validated.outstandingBalance;

    const updatedCard = await prisma.creditCard.update({
      where: { id },
      data: {
        ...validated,
        availableCredit,
      },
    });

    return NextResponse.json({
      ...updatedCard,
      creditLimit: Number(updatedCard.creditLimit),
      outstandingBalance: Number(updatedCard.outstandingBalance),
      availableCredit: Number(updatedCard.availableCredit),
      minimumDue: updatedCard.minimumDue ? Number(updatedCard.minimumDue) : null,
      interestRate: updatedCard.interestRate ? Number(updatedCard.interestRate) : null,
      rewardsBalance: Number(updatedCard.rewardsBalance),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    console.error('Failed to update credit card:', error);
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

    const existingCard = await prisma.creditCard.findUnique({
      where: { id, userId: session.user.id },
    });

    if (!existingCard) {
      return NextResponse.json({ error: 'Credit card not found' }, { status: 404 });
    }

    await prisma.creditCard.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete credit card:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
