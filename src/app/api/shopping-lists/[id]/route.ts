import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const shoppingListUpdateSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  color: z.string().optional(),
  isCompleted: z.boolean().optional(),
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
    const validated = shoppingListUpdateSchema.parse(body);

    // Verify ownership
    const existing = await prisma.shoppingList.findUnique({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Shopping list not found' }, { status: 404 });
    }

    const updated = await prisma.shoppingList.update({
      where: { id },
      data: validated,
      include: {
        items: true,
      },
    });

    return NextResponse.json({
      ...updated,
      items: updated.items.map((item) => ({
        ...item,
        estimatedPrice: item.estimatedPrice ? Number(item.estimatedPrice) : null,
      })),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    console.error('Failed to update shopping list:', error);
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
    const existing = await prisma.shoppingList.findUnique({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Shopping list not found' }, { status: 404 });
    }

    await prisma.shoppingList.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete shopping list:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
