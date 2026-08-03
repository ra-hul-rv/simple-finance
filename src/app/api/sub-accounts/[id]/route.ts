import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const updateSubAccountSchema = z.object({
  name: z.string().min(1).optional(),
  balance: z.number().optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  iconPath: z.string().optional().nullable(),
  credentials: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const subAccount = await prisma.subAccount.findUnique({
      where: { id },
      include: {
        account: { select: { id: true, name: true, color: true, userId: true } },
        _count: { select: { transactions: true } },
      },
    });

    if (!subAccount || subAccount.account.userId !== session.user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...subAccount,
      balance: Number(subAccount.balance),
      transactionCount: subAccount._count.transactions,
    });
  } catch (error) {
    console.error('Failed to get sub-account:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

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
    const validated = updateSubAccountSchema.parse(body);

    // Verify ownership
    const existing = await prisma.subAccount.findUnique({
      where: { id },
      include: { account: { select: { userId: true, id: true } } },
    });

    if (!existing || existing.account.userId !== session.user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const updated = await prisma.$transaction(async (tx: any) => {
      // If balance is being manually adjusted, update parent wallet balance too
      if (validated.balance !== undefined) {
        const oldBalance = Number(existing.balance);
        const diff = validated.balance - oldBalance;
        if (diff !== 0) {
          await tx.account.update({
            where: { id: existing.accountId },
            data: { balance: { increment: diff } },
          });
        }
      }

      return tx.subAccount.update({
        where: { id },
        data: {
          ...(validated.name !== undefined && { name: validated.name }),
          ...(validated.balance !== undefined && { balance: validated.balance }),
          ...(validated.color !== undefined && { color: validated.color }),
          ...(validated.icon !== undefined && { icon: validated.icon }),
          ...(validated.iconPath !== undefined && { iconPath: validated.iconPath }),
          ...(validated.credentials !== undefined && { credentials: validated.credentials }),
          ...(validated.notes !== undefined && { notes: validated.notes }),
          ...(validated.isActive !== undefined && { isActive: validated.isActive }),
        },
      });
    });

    return NextResponse.json({
      ...updated,
      balance: Number(updated.balance),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    console.error('Failed to update sub-account:', error);
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

    const existing = await prisma.subAccount.findUnique({
      where: { id },
      include: { account: { select: { userId: true, id: true } } },
    });

    if (!existing || existing.account.userId !== session.user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Deduct sub-account's balance from parent wallet
    await prisma.$transaction(async (tx: any) => {
      const balance = Number(existing.balance);
      if (balance !== 0) {
        await tx.account.update({
          where: { id: existing.accountId },
          data: { balance: { decrement: balance } },
        });
      }
      await tx.subAccount.delete({ where: { id } });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete sub-account:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
