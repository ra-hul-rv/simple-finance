import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const itemUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  estimatedPrice: z.number().nullable().optional(),
  quantity: z.number().int().min(1).optional(),
  checked: z.boolean().optional(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: listId, itemId } = await params;
    const body = await request.json();
    const validated = itemUpdateSchema.parse(body);

    // Verify ownership of the list
    const list = await prisma.shoppingList.findUnique({
      where: { id: listId, userId: session.user.id },
    });

    if (!list) {
      return NextResponse.json({ error: 'Shopping list not found or unauthorized' }, { status: 404 });
    }

    // Verify item exists on that list
    const item = await prisma.shoppingListItem.findUnique({
      where: { id: itemId, listId },
    });

    if (!item) {
      return NextResponse.json({ error: 'Item not found in this list' }, { status: 404 });
    }

    const updated = await prisma.shoppingListItem.update({
      where: { id: itemId },
      data: validated,
    });

    return NextResponse.json({
      ...updated,
      estimatedPrice: updated.estimatedPrice ? Number(updated.estimatedPrice) : null,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    console.error('Failed to update shopping item:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: listId, itemId } = await params;

    // Verify ownership of the list
    const list = await prisma.shoppingList.findUnique({
      where: { id: listId, userId: session.user.id },
    });

    if (!list) {
      return NextResponse.json({ error: 'Shopping list not found or unauthorized' }, { status: 404 });
    }

    // Verify item exists on that list
    const item = await prisma.shoppingListItem.findUnique({
      where: { id: itemId, listId },
    });

    if (!item) {
      return NextResponse.json({ error: 'Item not found in this list' }, { status: 404 });
    }

    await prisma.shoppingListItem.delete({
      where: { id: itemId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete shopping item:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
