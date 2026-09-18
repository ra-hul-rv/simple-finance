import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const updateSchema = z.object({
  amount: z.number().positive('Amount must be positive').optional(),
  description: z.string().min(1).optional(),
  personName: z.string().min(1).optional(),
  date: z.string().transform((str) => new Date(str)).optional(),
  categoryId: z.string().uuid('Invalid category ID').optional().nullable(),
  merchant: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

async function getUserIdFromRequest(request: Request): Promise<string | null> {
  const session = await auth();
  return session?.user?.id || null;
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const validated = updateSchema.parse(body);

    // Verify ownership
    const existing = await prisma.externalSpend.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const updated = await prisma.externalSpend.update({
      where: { id },
      data: {
        ...(validated.amount !== undefined && { amount: validated.amount }),
        ...(validated.description !== undefined && { description: validated.description }),
        ...(validated.personName !== undefined && { personName: validated.personName }),
        ...(validated.date !== undefined && { date: validated.date }),
        ...(validated.categoryId !== undefined && { categoryId: validated.categoryId }),
        ...(validated.merchant !== undefined && { merchant: validated.merchant }),
        ...(validated.notes !== undefined && { notes: validated.notes }),
      },
      include: {
        category: {
          select: { id: true, name: true, color: true, parent: { select: { name: true } } },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    if (error?.name === 'ZodError') {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Failed to update external spend:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const existing = await prisma.externalSpend.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await prisma.externalSpend.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete external spend:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
