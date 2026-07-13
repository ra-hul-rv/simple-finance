import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const flowTypeSchema = z.object({
  name: z.string().min(1).max(50),
  direction: z.enum(['INCOME', 'EXPENSE']),
  color: z.string().optional().default('#6366f1'),
  description: z.string().optional().nullable(),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const flowTypes = await prisma.flowType.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(flowTypes);
  } catch (error) {
    console.error('Failed to fetch flow types:', error);
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
    const validated = flowTypeSchema.parse(body);

    const flowType = await prisma.flowType.create({
      data: {
        ...validated,
        userId: session.user.id,
      },
    });

    return NextResponse.json(flowType, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    console.error('Failed to create flow type:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
