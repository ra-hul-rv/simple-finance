import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

async function getUserId(request: Request): Promise<string | null> {
  const session = await auth();
  return session?.user?.id || null;
}

export async function GET(request: Request) {
  try {
    const userId = await getUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const rules = await prisma.smsRule.findMany({
      where: { userId },
      include: {
        category: { select: { id: true, name: true } },
        account: { select: { id: true, name: true } },
      },
      orderBy: { usageCount: 'desc' },
    });

    return NextResponse.json(rules);
  } catch (error) {
    console.error('Failed to get SMS rules:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getUserId(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { identifier, label, aiNote, defaultType, defaultCategoryId, defaultAccountId, defaultMerchant, defaultDescription } = body;

    if (!identifier || !label) {
      return NextResponse.json({ error: 'identifier and label are required' }, { status: 400 });
    }

    const rule = await prisma.smsRule.create({
      data: {
        userId,
        identifier: identifier.toUpperCase().trim(),
        label: label.trim(),
        aiNote: aiNote || null,
        defaultType: defaultType || null,
        defaultCategoryId: defaultCategoryId || null,
        defaultAccountId: defaultAccountId || null,
        defaultMerchant: defaultMerchant || null,
        defaultDescription: defaultDescription || null,
        autoCreated: false,
      },
    });

    return NextResponse.json(rule, { status: 201 });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'A rule with this identifier already exists' }, { status: 409 });
    }
    console.error('Failed to create SMS rule:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
