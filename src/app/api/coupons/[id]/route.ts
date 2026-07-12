import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const couponUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  code: z.string().min(1).optional(),
  discountValue: z.number().nullable().optional(),
  discountType: z.enum(['PERCENTAGE', 'FLAT_AMOUNT', 'FREE_SHIPPING', 'OTHER']).optional(),
  merchant: z.string().min(1).optional(),
  expiryDate: z.string().nullable().optional().transform((str) => str ? new Date(str) : null),
  isUsed: z.boolean().optional(),
  notes: z.string().nullable().optional(),
  terms: z.string().nullable().optional(),
  barcodePath: z.string().nullable().optional(),
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
    const validated = couponUpdateSchema.parse(body);

    // Verify ownership
    const existing = await prisma.coupon.findUnique({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
    }

    const updated = await prisma.coupon.update({
      where: { id },
      data: validated,
    });

    return NextResponse.json({
      ...updated,
      discountValue: updated.discountValue ? Number(updated.discountValue) : null,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    console.error('Failed to update coupon:', error);
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
    const existing = await prisma.coupon.findUnique({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
    }

    await prisma.coupon.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete coupon:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
