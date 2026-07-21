import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const tagSchema = z.object({
  name: z.string().min(1, 'Tag name is required').max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid color format').default('#6366f1'),
  icon: z.string().max(30).default('tag'),
  description: z.string().max(500).optional().nullable(),
  budget: z.number().positive().optional().nullable(),
  peopleCount: z.number().int().min(1).optional().nullable(),
  people: z.string().max(2000).optional().nullable(), // JSON array string
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  status: z.enum(['ACTIVE', 'COMPLETED', 'CANCELLED']).default('ACTIVE'),
});

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const withDetails = searchParams.get('details') === 'true';

    const whereClause: any = { userId: session.user.id };
    if (status && status !== 'ALL') {
      whereClause.status = status;
    }

    const tags = await prisma.tag.findMany({
      where: whereClause,
      include: {
        transactions: {
          include: {
            transaction: {
              include: {
                category: {
                  include: {
                    parent: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = tags.map((tag) => {
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

      return {
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
        ...(withDetails ? {
          transactions: txList.map((tx: any) => ({
            id: tx.id,
            date: tx.date,
            amount: Number(tx.amount),
            type: tx.type,
            description: tx.description,
            merchant: tx.merchant,
            category: tx.category ? {
              id: tx.category.id,
              name: tx.category.name,
              color: tx.category.color,
              parent: tx.category.parent ? { name: tx.category.parent.name } : null,
            } : null,
          })).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        } : {}),
      };
    });

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Failed to get tags:', error);
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
    const validated = tagSchema.parse(body);

    // Check for duplicate name
    const existing = await prisma.tag.findUnique({
      where: {
        userId_name: {
          userId: session.user.id,
          name: validated.name,
        },
      },
    });

    if (existing) {
      return NextResponse.json({ error: 'A tag with this name already exists' }, { status: 409 });
    }

    const tag = await prisma.tag.create({
      data: {
        name: validated.name,
        color: validated.color,
        icon: validated.icon || 'tag',
        description: validated.description || null,
        budget: validated.budget || null,
        peopleCount: validated.peopleCount || null,
        people: validated.people || null,
        startDate: validated.startDate ? new Date(validated.startDate) : null,
        endDate: validated.endDate ? new Date(validated.endDate) : null,
        notes: validated.notes || null,
        status: validated.status || 'ACTIVE',
        userId: session.user.id,
      },
    });

    return NextResponse.json({ ...tag, budget: tag.budget ? Number(tag.budget) : null }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    console.error('Failed to create tag:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
