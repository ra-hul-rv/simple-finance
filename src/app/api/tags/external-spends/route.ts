import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const externalSpendSchema = z.object({
  tagId: z.string().uuid('Invalid tag ID'),
  amount: z.number().positive('Amount must be positive'),
  description: z.string().min(1, 'Description is required'),
  personName: z.string().min(1, 'Person name is required'),
  date: z.string().transform((str) => new Date(str)),
  categoryId: z.string().uuid('Invalid category ID').optional().nullable(),
  merchant: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

async function getUserIdFromRequest(request: Request): Promise<string | null> {
  const session = await auth();
  return session?.user?.id || null;
}

export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = externalSpendSchema.parse(body);

    // Verify the tag belongs to this user
    const tag = await prisma.tag.findFirst({
      where: { id: validated.tagId, userId },
    });

    if (!tag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    const spend = await prisma.externalSpend.create({
      data: {
        amount: validated.amount,
        description: validated.description,
        personName: validated.personName,
        date: validated.date,
        categoryId: validated.categoryId || null,
        merchant: validated.merchant || null,
        notes: validated.notes || null,
        tagId: validated.tagId,
        userId,
      },
      include: {
        category: {
          select: { id: true, name: true, color: true, parent: { select: { name: true } } },
        },
      },
    });

    return NextResponse.json(spend, { status: 201 });
  } catch (error: any) {
    if (error?.name === 'ZodError') {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Failed to create external spend:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
