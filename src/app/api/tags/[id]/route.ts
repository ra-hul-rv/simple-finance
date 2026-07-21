import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const updateTagSchema = z.object({
  name: z.string().min(1, 'Tag name is required').max(50).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid color format').optional(),
  icon: z.string().max(30).optional(),
  description: z.string().max(500).optional().nullable(),
  budget: z.number().positive().optional().nullable(),
  peopleCount: z.number().int().min(1).optional().nullable(),
  people: z.string().max(2000).optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  status: z.enum(['ACTIVE', 'COMPLETED', 'CANCELLED']).optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const tag = await prisma.tag.findFirst({
      where: { id, userId: session.user.id },
      include: {
        transactions: {
          include: {
            transaction: {
              include: {
                account: true,
                category: {
                  include: { parent: true },
                },
              },
            },
          },
        },
      },
    });

    if (!tag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    const txList = tag.transactions.map((tt: any) => tt.transaction);

    const totalIncome = txList
      .filter((tx: any) => tx.type === 'INCOME' || tx.type === 'REFUND')
      .reduce((sum: number, tx: any) => sum + Number(tx.amount), 0);

    const totalExpense = txList
      .filter((tx: any) => tx.type === 'EXPENSE')
      .reduce((sum: number, tx: any) => sum + Number(tx.amount), 0);

    // Category breakdown
    const categoryMap = new Map<string, { name: string; amount: number; color: string }>();
    txList.filter((tx: any) => tx.type === 'EXPENSE' && tx.category).forEach((tx: any) => {
      const catName = tx.category.parent ? `${tx.category.parent.name} > ${tx.category.name}` : tx.category.name;
      const existing = categoryMap.get(catName) || { name: catName, amount: 0, color: tx.category.color || '#6366f1' };
      existing.amount += Number(tx.amount);
      categoryMap.set(catName, existing);
    });

    return NextResponse.json({
      id: tag.id,
      name: tag.name,
      color: tag.color,
      icon: tag.icon,
      description: tag.description,
      budget: tag.budget ? Number(tag.budget) : null,
      peopleCount: tag.peopleCount,
      people: tag.people,
      startDate: tag.startDate,
      endDate: tag.endDate,
      notes: tag.notes,
      status: tag.status,
      createdAt: tag.createdAt,
      updatedAt: tag.updatedAt,
      transactionCount: txList.length,
      totalIncome,
      totalExpense,
      netAmount: totalIncome - totalExpense,
      categoryBreakdown: Array.from(categoryMap.values()).sort((a, b) => b.amount - a.amount),
      transactions: txList.map((tx: any) => ({
        id: tx.id,
        date: tx.date,
        amount: Number(tx.amount),
        type: tx.type,
        description: tx.description,
        merchant: tx.merchant,
        notes: tx.notes,
        account: tx.account ? { id: tx.account.id, name: tx.account.name } : null,
        category: tx.category ? {
          id: tx.category.id,
          name: tx.category.name,
          color: tx.category.color,
          parent: tx.category.parent ? { name: tx.category.parent.name } : null,
        } : null,
      })).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    });
  } catch (error) {
    console.error('Failed to get tag:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

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
    const validated = updateTagSchema.parse(body);

    // Verify ownership
    const existing = await prisma.tag.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    // Check for duplicate name if name is being changed
    if (validated.name && validated.name !== existing.name) {
      const duplicate = await prisma.tag.findUnique({
        where: {
          userId_name: {
            userId: session.user.id,
            name: validated.name,
          },
        },
      });

      if (duplicate) {
        return NextResponse.json({ error: 'A tag with this name already exists' }, { status: 409 });
      }
    }

    const updateData: any = {};
    if (validated.name !== undefined) updateData.name = validated.name;
    if (validated.color !== undefined) updateData.color = validated.color;
    if (validated.icon !== undefined) updateData.icon = validated.icon;
    if (validated.status !== undefined) updateData.status = validated.status;
    if ('description' in validated) updateData.description = validated.description || null;
    if ('budget' in validated) updateData.budget = validated.budget || null;
    if ('peopleCount' in validated) updateData.peopleCount = validated.peopleCount || null;
    if ('people' in validated) updateData.people = validated.people || null;
    if ('startDate' in validated) updateData.startDate = validated.startDate ? new Date(validated.startDate) : null;
    if ('endDate' in validated) updateData.endDate = validated.endDate ? new Date(validated.endDate) : null;
    if ('notes' in validated) updateData.notes = validated.notes || null;

    const updated = await prisma.tag.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ ...updated, budget: updated.budget ? Number(updated.budget) : null });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    console.error('Failed to update tag:', error);
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
    const existing = await prisma.tag.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    await prisma.tag.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete tag:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
