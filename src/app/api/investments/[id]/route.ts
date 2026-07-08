import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import * as z from 'zod';

const investmentSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  type: z.enum(['STOCKS', 'MUTUAL_FUNDS', 'GOLD', 'CRYPTO', 'FIXED_DEPOSIT', 'BONDS', 'EPF', 'PPF', 'NPS', 'OTHER']),
  investedAmount: z.number().positive('Invested amount must be positive'),
  currentValue: z.number().nonnegative('Current value must be non-negative'),
  units: z.number().optional().nullable(),
  purchaseDate: z.string(),
  platform: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
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
    const validated = investmentSchema.parse(body);

    const updated = await prisma.investment.update({
      where: { id, userId: session.user.id },
      data: {
        ...validated,
        purchaseDate: new Date(validated.purchaseDate),
      },
    });

    return NextResponse.json({
      ...updated,
      investedAmount: Number(updated.investedAmount),
      currentValue: Number(updated.currentValue),
      units: updated.units ? Number(updated.units) : null,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    console.error('Failed to update investment:', error);
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

    await prisma.investment.delete({
      where: { id, userId: session.user.id },
    });

    return NextResponse.json({ success: true, message: 'Investment deleted successfully' });
  } catch (error) {
    console.error('Failed to delete investment:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
