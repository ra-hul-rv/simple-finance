import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const updateAccountSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum([
    'SAVINGS',
    'CURRENT',
    'CASH',
    'CREDIT_CARD',
    'DEBIT_CARD',
    'FIXED_DEPOSIT',
    'STOCKS',
    'MUTUAL_FUNDS',
    'CRYPTO',
    'LOAN',
    'EPF',
    'PPF',
    'NPS',
    'OTHER',
  ]),
  institution: z.string().optional().nullable(),
  accountNumber: z.string().optional().nullable(),
  balance: z.number().optional(),
  openingBalance: z.number().optional(),
  currency: z.string().optional(),
  interestRate: z.number().optional().nullable(),
  creditLimit: z.number().optional().nullable(),
  color: z.string().optional(),
  icon: z.string().optional(),
  notes: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'CLOSED']).optional(),
});

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

    const account = await prisma.account.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        creditCard: true,
      },
    });

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...account,
      balance: Number(account.balance),
      openingBalance: Number(account.openingBalance),
      interestRate: account.interestRate ? Number(account.interestRate) : null,
      creditLimit: account.creditLimit ? Number(account.creditLimit) : null,
    });
  } catch (error) {
    console.error('Failed to get account:', error);
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
    const validated = updateAccountSchema.parse(body);

    // Verify ownership
    const existing = await prisma.account.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const updated = await prisma.account.update({
      where: { id },
      data: {
        ...validated,
        institution: validated.institution ?? undefined,
        accountNumber: validated.accountNumber ?? undefined,
        interestRate: validated.interestRate ?? undefined,
        creditLimit: validated.creditLimit ?? undefined,
        notes: validated.notes ?? undefined,
      },
    });

    return NextResponse.json({
      ...updated,
      balance: Number(updated.balance),
      openingBalance: Number(updated.openingBalance),
      interestRate: updated.interestRate ? Number(updated.interestRate) : null,
      creditLimit: updated.creditLimit ? Number(updated.creditLimit) : null,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    console.error('Failed to update account:', error);
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

    // Verify ownership
    const existing = await prisma.account.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    await prisma.account.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Failed to delete account:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
