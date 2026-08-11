import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const upiTemplateSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  upiId: z.string().min(1, 'UPI ID is required'),
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER', 'INVESTMENT', 'CREDIT_CARD_PAYMENT', 'REFUND', 'INTEREST', 'DIVIDEND']).default('EXPENSE'),
  amount: z.number().optional().nullable(),
  merchant: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  accountId: z.string().uuid('Invalid account ID').optional().nullable(),
  categoryId: z.string().uuid('Invalid category ID').optional().nullable(),
  autoCreated: z.boolean().optional().default(false),
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

export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const templates = await prisma.upiTemplate.findMany({
      where: { userId },
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
      orderBy: [
        { autoCreated: 'desc' },
        { updatedAt: 'desc' },
      ],
    });

    const formatted = templates.map((tpl: any) => ({
      ...tpl,
      amount: tpl.amount ? Number(tpl.amount) : null,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Failed to fetch UPI templates:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = upiTemplateSchema.parse(body);

    const cleanUpiId = validated.upiId.trim().toLowerCase();

    const existing = await prisma.upiTemplate.findUnique({
      where: {
        userId_upiId: {
          userId,
          upiId: cleanUpiId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'A template with this UPI ID already exists', existingId: existing.id },
        { status: 400 }
      );
    }

    const template = await prisma.upiTemplate.create({
      data: {
        title: validated.title.trim(),
        upiId: cleanUpiId,
        type: validated.type,
        amount: validated.amount || null,
        merchant: validated.merchant?.trim() || null,
        location: validated.location?.trim() || null,
        description: validated.description?.trim() || null,
        notes: validated.notes?.trim() || null,
        accountId: validated.accountId || null,
        categoryId: validated.categoryId || null,
        autoCreated: validated.autoCreated || false,
        userId,
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
      ...template,
      amount: template.amount ? Number(template.amount) : null,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    console.error('Failed to create UPI template:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
