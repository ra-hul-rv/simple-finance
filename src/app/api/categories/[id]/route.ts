import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const updateCategorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['INCOME', 'EXPENSE']),
  color: z.string().optional(),
  icon: z.string().optional(),
  description: z.string().optional().nullable(),
  budgetAmount: z.number().optional().nullable(),
  parentId: z.string().uuid().optional().nullable(),
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
    const validated = updateCategorySchema.parse(body);

    const existing = await prisma.category.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    const updated = await prisma.category.update({
      where: { id },
      data: {
        ...validated,
        budgetAmount: validated.budgetAmount ?? null,
        parentId: validated.parentId ?? null,
      },
    });

    return NextResponse.json({
      ...updated,
      budgetAmount: updated.budgetAmount ? Number(updated.budgetAmount) : null,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    console.error('Failed to update category:', error);
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

    const existing = await prisma.category.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // Unlink children categories safely so they don't get hard deleted or cause constraint errors
    await prisma.category.updateMany({
      where: { parentId: id },
      data: { parentId: null },
    });

    await prisma.category.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Failed to delete category:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
