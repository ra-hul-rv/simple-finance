import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import * as z from 'zod';

const budgetSchema = z.object({
  amount: z.number().positive('Budget amount must be positive'),
  categoryId: z.string().uuid(),
  month: z.number().min(1).max(12),
  year: z.number().min(2000).max(2100),
});

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));

    const budgets = await prisma.budget.findMany({
      where: {
        userId: session.user.id,
        month,
        year,
      },
      include: {
        category: true,
      },
    });

    const formatted = budgets.map((b: any) => ({
      ...b,
      amount: Number(b.amount),
      spent: Number(b.spent),
      category: {
        ...b.category,
        budgetAmount: b.category.budgetAmount ? Number(b.category.budgetAmount) : null,
      },
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Failed to get budgets:', error);
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
    const validated = budgetSchema.parse(body);

    // Calculate current month's transactions spent value for this category
    const transactions = await prisma.transaction.findMany({
      where: {
        userId: session.user.id,
        categoryId: validated.categoryId,
        type: 'EXPENSE',
        date: {
          gte: new Date(validated.year, validated.month - 1, 1),
          lt: new Date(validated.year, validated.month, 1),
        },
      },
    });

    const totalSpent = transactions.reduce((sum, tx) => sum + Number(tx.amount), 0);

    // Upsert budget
    const budget = await prisma.budget.upsert({
      where: {
        userId_categoryId_month_year: {
          userId: session.user.id,
          categoryId: validated.categoryId,
          month: validated.month,
          year: validated.year,
        },
      },
      update: {
        amount: validated.amount,
        spent: totalSpent,
      },
      create: {
        amount: validated.amount,
        spent: totalSpent,
        month: validated.month,
        year: validated.year,
        categoryId: validated.categoryId,
        userId: session.user.id,
      },
    });

    // Also update category's default budgetAmount
    await prisma.category.update({
      where: { id: validated.categoryId },
      data: { budgetAmount: validated.amount },
    });

    return NextResponse.json({
      ...budget,
      amount: Number(budget.amount),
      spent: Number(budget.spent),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    console.error('Failed to create/update budget:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
