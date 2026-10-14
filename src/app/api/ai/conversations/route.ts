import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const conversations = await prisma.aiConversation.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: 'desc' },
      take: 50,
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { messages: true },
        },
      },
    });

    return NextResponse.json(conversations);
  } catch (error: unknown) {
    console.error('[API Conversations] Error listing conversations:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const title = typeof body.title === 'string' && body.title.trim().length > 0
      ? body.title.trim().slice(0, 50)
      : 'New Chat';

    const conversation = await prisma.aiConversation.create({
      data: {
        userId: session.user.id,
        title,
      },
    });

    return NextResponse.json(conversation, { status: 201 });
  } catch (error: unknown) {
    console.error('[API Conversations] Error creating conversation:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create conversation' },
      { status: 500 }
    );
  }
}
