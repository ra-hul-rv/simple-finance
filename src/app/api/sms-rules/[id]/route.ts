import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

async function getUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id || null;
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.smsRule.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const updated = await prisma.smsRule.update({
      where: { id },
      data: {
        label: body.label ?? existing.label,
        aiNote: body.aiNote !== undefined ? body.aiNote : existing.aiNote,
        defaultType: body.defaultType !== undefined ? body.defaultType : existing.defaultType,
        defaultCategoryId: body.defaultCategoryId !== undefined ? body.defaultCategoryId : existing.defaultCategoryId,
        defaultAccountId: body.defaultAccountId !== undefined ? body.defaultAccountId : existing.defaultAccountId,
        defaultMerchant: body.defaultMerchant !== undefined ? body.defaultMerchant : existing.defaultMerchant,
        defaultDescription: body.defaultDescription !== undefined ? body.defaultDescription : existing.defaultDescription,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update SMS rule:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    const existing = await prisma.smsRule.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await prisma.smsRule.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete SMS rule:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
