import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const templateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  amount: z.number().optional().nullable(),
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER', 'INVESTMENT', 'CREDIT_CARD_PAYMENT', 'REFUND', 'INTEREST', 'DIVIDEND']),
  flowType: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  merchant: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  accountId: z.string().uuid('Invalid account ID'),
  categoryId: z.string().uuid('Invalid category ID').optional().nullable(),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const templates = await prisma.transactionTemplate.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: { name: 'asc' },
    });

    const formatted = templates.map((tpl: any) => ({
      ...tpl,
      amount: tpl.amount ? Number(tpl.amount) : null,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Failed to get templates:', error);
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
    const validated = templateSchema.parse(body);

    const template = await prisma.transactionTemplate.create({
      data: {
        ...validated,
        userId: session.user.id,
      },
    });

    return NextResponse.json(template);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    console.error('Failed to create template:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
