import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const reorderSchema = z.array(
  z.object({
    id: z.string().uuid(),
    order: z.number().int(),
  })
);

export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = reorderSchema.parse(body);

    // Run updates in a transaction
    await prisma.$transaction(
      validated.map((item) =>
        prisma.creditCard.update({
          where: {
            id: item.id,
            userId: session.user.id,
          },
          data: {
            order: item.order,
          },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to reorder credit cards:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
