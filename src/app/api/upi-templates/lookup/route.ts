import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const lookupSchema = z.object({
  upiId: z.string().min(1, 'UPI ID is required'),
  amount: z.number().optional().nullable(),
  merchant: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER', 'INVESTMENT', 'CREDIT_CARD_PAYMENT', 'REFUND', 'INTEREST', 'DIVIDEND']).optional().default('EXPENSE'),
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

export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized: Missing or invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const validated = lookupSchema.parse(body);

    const cleanUpiId = validated.upiId.trim().toLowerCase();

    // 1. Search for existing UPI template
    const existing = await prisma.upiTemplate.findUnique({
      where: {
        userId_upiId: {
          userId,
          upiId: cleanUpiId,
        },
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

    if (existing) {
      // Increment usage count and update lastUsedAt
      const updated = await prisma.upiTemplate.update({
        where: { id: existing.id },
        data: {
          usageCount: { increment: 1 },
          lastUsedAt: new Date(),
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
        matched: true,
        autoCreated: false,
        template: {
          ...updated,
          amount: updated.amount ? Number(updated.amount) : null,
        },
      });
    }

    // 2. If not found, auto-create a new template record so user can configure it in UI
    const titleName = validated.merchant?.trim() || cleanUpiId;
    const newTemplate = await prisma.upiTemplate.create({
      data: {
        userId,
        upiId: cleanUpiId,
        title: titleName,
        type: validated.type || 'EXPENSE',
        amount: validated.amount || null,
        merchant: validated.merchant?.trim() || null,
        description: validated.description?.trim() || `Auto-created for ${cleanUpiId}`,
        location: validated.location?.trim() || null,
        autoCreated: true,
        usageCount: 1,
        lastUsedAt: new Date(),
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
      matched: false,
      autoCreated: true,
      message: 'New UPI ID captured automatically. Please assign account & category in Simple Finance Templates page.',
      template: {
        ...newTemplate,
        amount: newTemplate.amount ? Number(newTemplate.amount) : null,
      },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    console.error('Failed lookup for UPI template:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
