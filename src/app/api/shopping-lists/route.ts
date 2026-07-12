import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const shoppingListSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  color: z.string().default('#ec4899'),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const lists = await prisma.shoppingList.findMany({
      where: { userId: session.user.id },
      include: {
        items: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Format Decimal values
    const formattedLists = lists.map((list) => ({
      ...list,
      items: list.items.map((item) => ({
        ...item,
        estimatedPrice: item.estimatedPrice ? Number(item.estimatedPrice) : null,
      })),
    }));

    return NextResponse.json(formattedLists);
  } catch (error) {
    console.error('Failed to fetch shopping lists:', error);
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
    const validated = shoppingListSchema.parse(body);

    const list = await prisma.shoppingList.create({
      data: {
        ...validated,
        userId: session.user.id,
      },
      include: {
        items: true,
      },
    });

    return NextResponse.json(list);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    console.error('Failed to create shopping list:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
