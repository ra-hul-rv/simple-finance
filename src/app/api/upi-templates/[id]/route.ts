import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const updateUpiTemplateSchema = z.object({
  title: z.string().min(1, 'Title is required').optional(),
  upiId: z.string().min(1, 'UPI ID is required').optional(),
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER', 'INVESTMENT', 'CREDIT_CARD_PAYMENT', 'REFUND', 'INTEREST', 'DIVIDEND']).optional(),
  amount: z.number().optional().nullable(),
  merchant: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  accountId: z.string().uuid('Invalid account ID').optional().nullable(),
  categoryId: z.string().uuid('Invalid category ID').optional().nullable(),
  autoCreated: z.boolean().optional(),
});

async function getUserIdFromRequest(request: Request): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (token) {
      const settings = await prisma.userSettings.findFirst({
        where: { webhookToken: token },
        select: { userId: true },
      });
      if (settings?.userId) return settings.userId;
    }
  }

  const session = await auth();
  return session?.user?.id || null;
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const validated = updateUpiTemplateSchema.parse(body);

    const existing = await prisma.upiTemplate.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'UPI template not found' }, { status: 404 });
    }

    let cleanUpiId = existing.upiId;
    if (validated.upiId) {
      cleanUpiId = validated.upiId.trim().toLowerCase();

      if (cleanUpiId !== existing.upiId) {
        const conflict = await prisma.upiTemplate.findUnique({
          where: {
            userId_upiId: {
              userId,
              upiId: cleanUpiId,
            },
          },
        });
        if (conflict) {
          return NextResponse.json({ error: 'Another template with this UPI ID already exists' }, { status: 400 });
        }
      }
    }

    // If accountId or categoryId is being set manually by the user, mark autoCreated = false
    const shouldClearAutoCreated = (validated.accountId !== undefined || validated.categoryId !== undefined) ? false : (validated.autoCreated ?? existing.autoCreated);

    const updated = await prisma.upiTemplate.update({
      where: { id },
      data: {
        title: validated.title !== undefined ? validated.title.trim() : existing.title,
        upiId: cleanUpiId,
        type: validated.type ?? existing.type,
        amount: validated.amount !== undefined ? validated.amount : existing.amount,
        merchant: validated.merchant !== undefined ? (validated.merchant?.trim() || null) : existing.merchant,
        location: validated.location !== undefined ? (validated.location?.trim() || null) : existing.location,
        description: validated.description !== undefined ? (validated.description?.trim() || null) : existing.description,
        notes: validated.notes !== undefined ? (validated.notes?.trim() || null) : existing.notes,
        accountId: validated.accountId !== undefined ? (validated.accountId || null) : existing.accountId,
        categoryId: validated.categoryId !== undefined ? (validated.categoryId || null) : existing.categoryId,
        autoCreated: shouldClearAutoCreated,
      },
      include: {
        account: {
          select: { id: true, name: true, color: true, type: true },
        },
        category: {
          include: {
            parent: {
              select: { id: true, name: true, color: true },
            },
          },
        },
      },
    });

    return NextResponse.json({
      ...updated,
      amount: updated.amount ? Number(updated.amount) : null,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    console.error('Failed to update UPI template:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.upiTemplate.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'UPI template not found' }, { status: 404 });
    }

    await prisma.upiTemplate.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Failed to delete UPI template:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
