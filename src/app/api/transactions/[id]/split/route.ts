import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const patchSplitSchema = z.object({
  splitCount: z.number().int().min(1).nullable(),
  splitType: z.enum(['MULTIPLY', 'DIVIDE']).nullable(),
});

export async function PATCH(
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
    const validated = patchSplitSchema.parse(body);

    const transaction = await prisma.transaction.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    const updatedTx = await prisma.transaction.update({
      where: { id },
      data: {
        splitCount: validated.splitCount,
        splitType: validated.splitType,
      },
    });

    return NextResponse.json({
      ...updatedTx,
      amount: Number(updatedTx.amount),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    console.error('Failed to update transaction split:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
