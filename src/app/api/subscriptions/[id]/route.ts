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
    const validated = subscriptionSchema.parse(body);

    const updated = await prisma.subscription.update({
      where: { id, userId: session.user.id },
      data: {
        ...validated,
        renewalDate: new Date(validated.renewalDate),
      },
    });

    return NextResponse.json({
      ...updated,
      monthlyCost: Number(updated.monthlyCost),
      annualCost: updated.annualCost ? Number(updated.annualCost) : null,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    console.error('Failed to update subscription:', error);
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

    await prisma.subscription.delete({
      where: { id, userId: session.user.id },
    });

    return NextResponse.json({ success: true, message: 'Subscription deleted successfully' });
  } catch (error) {
    console.error('Failed to delete subscription:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
