import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

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

    const conversation = await prisma.aiConversation.findFirst({
      where: { id, userId: session.user.id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            role: true,
            content: true,
            metadata: true,
            createdAt: true,
          },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    return NextResponse.json(conversation);
  } catch (error: unknown) {
    console.error('[API Conversation Detail] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch conversation' },
      { status: 500 }
    );
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

    const conversation = await prisma.aiConversation.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    await prisma.aiConversation.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Conversation deleted.' });
  } catch (error: unknown) {
    console.error('[API Conversation Delete] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete conversation' },
      { status: 500 }
    );
  }
}
