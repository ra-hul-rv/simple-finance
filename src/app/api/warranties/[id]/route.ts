import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const warrantyUpdateSchema = z.object({
  productName: z.string().min(1).optional(),
  purchaseDate: z.string().transform((str) => new Date(str)).optional(),
  warrantyMonths: z.number().int().min(1).optional(),
  purchasePrice: z.number().nullable().optional(),
  store: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  receiptPath: z.string().nullable().optional(),
  reminderDays: z.number().int().optional(),
  isExpired: z.boolean().optional(),
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
    const validated = warrantyUpdateSchema.parse(body);

    // Verify ownership
    const existing = await prisma.warranty.findUnique({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Warranty not found' }, { status: 404 });
    }

    // Recompute expiry date if purchase date or warranty duration changed
    let expiryDate = existing.expiryDate;
    if (validated.purchaseDate || validated.warrantyMonths) {
      const pDate = validated.purchaseDate || existing.purchaseDate;
      const months = validated.warrantyMonths !== undefined ? validated.warrantyMonths : existing.warrantyMonths;
      expiryDate = new Date(pDate);
      expiryDate.setMonth(expiryDate.getMonth() + months);
    }

    const isExpired = expiryDate.getTime() < Date.now();

    const updated = await prisma.warranty.update({
      where: { id },
      data: {
        ...validated,
        expiryDate,
        isExpired: validated.isExpired !== undefined ? validated.isExpired : isExpired,
      },
    });

    return NextResponse.json({
      ...updated,
      purchasePrice: updated.purchasePrice ? Number(updated.purchasePrice) : null,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    console.error('Failed to update warranty:', error);
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
    const existing = await prisma.warranty.findUnique({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Warranty not found' }, { status: 404 });
    }

    await prisma.warranty.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete warranty:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
