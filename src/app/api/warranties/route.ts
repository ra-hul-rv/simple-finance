import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const warrantySchema = z.object({
  productName: z.string().min(1, 'Product name is required'),
  purchaseDate: z.string().transform((str) => new Date(str)),
  warrantyMonths: z.number().int().min(1),
  purchasePrice: z.number().nullish(),
  store: z.string().nullish(),
  category: z.string().nullish(),
  notes: z.string().nullish(),
  receiptPath: z.string().nullish(),
  reminderDays: z.number().int().default(30),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const warranties = await prisma.warranty.findMany({
      where: { userId: session.user.id },
      orderBy: { expiryDate: 'asc' },
    });

    const formatted = warranties.map((w) => ({
      ...w,
      purchasePrice: w.purchasePrice ? Number(w.purchasePrice) : null,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Failed to get warranties:', error);
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
    const validated = warrantySchema.parse(body);

    // Calculate expiry date automatically based on purchase date and duration months
    const purchaseDate = validated.purchaseDate;
    const expiryDate = new Date(purchaseDate);
    expiryDate.setMonth(expiryDate.getMonth() + validated.warrantyMonths);

    // Determine if already expired
    const isExpired = expiryDate.getTime() < Date.now();

    const warranty = await prisma.warranty.create({
      data: {
        productName: validated.productName,
        purchaseDate: validated.purchaseDate,
        warrantyMonths: validated.warrantyMonths,
        expiryDate,
        purchasePrice: validated.purchasePrice,
        store: validated.store,
        category: validated.category,
        notes: validated.notes,
        receiptPath: validated.receiptPath,
        reminderDays: validated.reminderDays,
        isExpired,
        userId: session.user.id,
      },
    });

    return NextResponse.json({
      ...warranty,
      purchasePrice: warranty.purchasePrice ? Number(warranty.purchasePrice) : null,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    console.error('Failed to create warranty:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
