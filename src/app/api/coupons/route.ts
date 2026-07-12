import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const couponSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  code: z.string().min(1, 'Code is required'),
  discountValue: z.number().nullish(),
  discountType: z.enum(['PERCENTAGE', 'FLAT_AMOUNT', 'FREE_SHIPPING', 'OTHER']).default('PERCENTAGE'),
  merchant: z.string().min(1, 'Merchant is required'),
  expiryDate: z.string().nullish().transform((str) => str ? new Date(str) : null),
  notes: z.string().nullish(),
  terms: z.string().nullish(),
  barcodePath: z.string().nullish(),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const coupons = await prisma.coupon.findMany({
      where: { userId: session.user.id },
      orderBy: { expiryDate: 'asc' },
    });

    const formatted = coupons.map((c) => ({
      ...c,
      discountValue: c.discountValue ? Number(c.discountValue) : null,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Failed to get coupons:', error);
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
    const validated = couponSchema.parse(body);

    const coupon = await prisma.coupon.create({
      data: {
        ...validated,
        userId: session.user.id,
      },
    });

    return NextResponse.json({
      ...coupon,
      discountValue: coupon.discountValue ? Number(coupon.discountValue) : null,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    console.error('Failed to create coupon:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
