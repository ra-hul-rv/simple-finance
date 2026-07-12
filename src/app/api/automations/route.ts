import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const automationSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  triggerType: z.enum(['TRANSACTION_CREATED', 'SCHEDULED']),
  isActive: z.boolean().default(true),
  conditions: z.array(z.object({
    field: z.string(), // "description", "accountId", "amount", "type"
    operator: z.string(), // "contains", "equals", "gt", "lt"
    value: z.any(),
  })),
  actions: z.array(z.object({
    type: z.string(), // "setCategory", "setDescription", "addTag", "createTransaction"
    value: z.any(),
  })),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']).nullable().optional(),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rules = await prisma.automationRule.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(rules);
  } catch (error) {
    console.error('Failed to get automation rules:', error);
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
    const validated = automationSchema.parse(body);

    // If scheduled, set initial nextExecution
    let nextExecution: Date | null = null;
    if (validated.triggerType === 'SCHEDULED') {
      nextExecution = new Date(); // triggers first time immediately or on next run check
    }

    const rule = await prisma.automationRule.create({
      data: {
        name: validated.name,
        triggerType: validated.triggerType,
        isActive: validated.isActive,
        conditions: validated.conditions as any,
        actions: validated.actions as any,
        frequency: validated.frequency || null,
        nextExecution,
        userId: session.user.id,
      },
    });

    return NextResponse.json(rule);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    console.error('Failed to create automation rule:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
