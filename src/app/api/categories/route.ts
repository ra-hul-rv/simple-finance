import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const categorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['INCOME', 'EXPENSE']),
  color: z.string().default('#6366f1'),
  icon: z.string().default('tag'),
  description: z.string().optional().nullable(),
  budgetAmount: z.number().optional().nullable(),
  parentId: z.string().uuid().optional().nullable(),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const categories = await prisma.category.findMany({
      where: {
        userId: session.user.id,
        isActive: true,
      },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    });

    const formatted = categories.map((cat: any) => ({
      ...cat,
      budgetAmount: cat.budgetAmount ? Number(cat.budgetAmount) : null,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Failed to get categories:', error);
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
    const validated = categorySchema.parse(body);

    const category = await prisma.category.create({
      data: {
        ...validated,
        userId: session.user.id,
      },
    });

    return NextResponse.json({
      ...category,
      budgetAmount: category.budgetAmount ? Number(category.budgetAmount) : null,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    console.error('Failed to create category:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
