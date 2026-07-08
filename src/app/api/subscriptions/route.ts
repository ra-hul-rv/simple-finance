import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import * as z from 'zod';

const subscriptionSchema = z.object({
  service: z.string().min(2, 'Service name must be at least 2 characters'),
  monthlyCost: z.number().positive('Cost must be positive'),
  annualCost: z.number().optional().nullable(),
  renewalDate: z.string(),
  status: z.enum(['ACTIVE', 'PAUSED', 'CANCELLED', 'EXPIRED']),
  description: z.string().optional().nullable(),
  url: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  accountId: z.string().uuid().optional().nullable(),
  categoryId: z.string().uuid().optional().nullable(),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const subscriptions = await prisma.subscription.findMany({
      where: { userId: session.user.id },
      include: {
        account: true,
        category: true,
      },
      orderBy: { renewalDate: 'asc' },
    });

    const formatted = subscriptions.map((s: any) => ({
      ...s,
      monthlyCost: Number(s.monthlyCost),
      annualCost: s.annualCost ? Number(s.annualCost) : null,
      account: s.account ? { ...s.account, balance: Number(s.account.balance) } : null,
      category: s.category ? { ...s.category, budgetAmount: s.category.budgetAmount ? Number(s.category.budgetAmount) : null } : null,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Failed to get subscriptions:', error);
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
    const validated = subscriptionSchema.parse(body);

    const subscription = await prisma.subscription.create({
      data: {
        ...validated,
        renewalDate: new Date(validated.renewalDate),
        userId: session.user.id,
      },
    });

    return NextResponse.json({
      ...subscription,
      monthlyCost: Number(subscription.monthlyCost),
      annualCost: subscription.annualCost ? Number(subscription.annualCost) : null,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    console.error('Failed to create subscription:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
