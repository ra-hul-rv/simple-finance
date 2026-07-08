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

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const investments = await prisma.investment.findMany({
      where: { userId: session.user.id },
      orderBy: { purchaseDate: 'desc' },
    });

    const formatted = investments.map((inv: any) => ({
      ...inv,
      investedAmount: Number(inv.investedAmount),
      currentValue: Number(inv.currentValue),
      units: inv.units ? Number(inv.units) : null,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Failed to get investments:', error);
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
    const validated = investmentSchema.parse(body);

    const investment = await prisma.investment.create({
      data: {
        ...validated,
        purchaseDate: new Date(validated.purchaseDate),
        userId: session.user.id,
      },
    });

    return NextResponse.json({
      ...investment,
      investedAmount: Number(investment.investedAmount),
      currentValue: Number(investment.currentValue),
      units: investment.units ? Number(investment.units) : null,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    console.error('Failed to create investment:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
