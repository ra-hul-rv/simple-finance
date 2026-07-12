import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const itemCreateSchema = z.object({
  name: z.string().min(1, 'Item name is required'),
  estimatedPrice: z.number().nullish(),
  quantity: z.number().int().min(1).default(1),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: listId } = await params;
    const body = await request.json();
    const validated = itemCreateSchema.parse(body);

    // Verify list ownership
    const list = await prisma.shoppingList.findUnique({
      where: { id: listId, userId: session.user.id },
    });

    if (!list) {
      return NextResponse.json({ error: 'Shopping list not found' }, { status: 404 });
    }

    const item = await prisma.shoppingListItem.create({
      data: {
        name: validated.name,
        estimatedPrice: validated.estimatedPrice,
        quantity: validated.quantity,
        listId,
      },
    });

    return NextResponse.json({
      ...item,
      estimatedPrice: item.estimatedPrice ? Number(item.estimatedPrice) : null,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    console.error('Failed to add shopping item:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
