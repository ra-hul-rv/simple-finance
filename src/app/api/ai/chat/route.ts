import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { processUserMessage } from '@/lib/ai/processor';
import { getAssistantConfig } from '@/lib/ai/assistant-config';

const chatRequestSchema = z.object({
  message: z.string().trim().min(1, 'Message cannot be empty').max(2000, 'Message is too long (max 2000 characters)'),
  conversationId: z.string().uuid().optional().nullable(),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    const config = getAssistantConfig();
    if (!config.enabled) {
      return NextResponse.json(
        {
          error: 'AI Assistant is currently disabled.',
          message: 'The AI assistant is disabled on this server. Set AI_ENABLED=true in the environment to enable it.',
        },
        { status: 503 }
      );
    }

    const body = await request.json();
    const validated = chatRequestSchema.parse(body);

    let conversation;
    let isNewConversation = false;

    if (validated.conversationId) {
      conversation = await prisma.aiConversation.findFirst({
        where: { id: validated.conversationId, userId },
      });
    }

    if (!conversation) {
      isNewConversation = true;
      const initialTitle = validated.message.slice(0, 40) + (validated.message.length > 40 ? '...' : '');
      conversation = await prisma.aiConversation.create({
        data: {
          userId,
          title: initialTitle,
        },
      });
    }

    // Load recent conversation history (last 10 messages)
    const historyRecords = await prisma.aiMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const conversationHistory = historyRecords.reverse().map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // Record user message
    await prisma.aiMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'user',
        content: validated.message,
      },
    });

    // Execute AI pipeline
    const result = await processUserMessage(
      userId,
      validated.message,
      conversation.id,
      conversationHistory
    );

    // Record assistant response
    const assistantMessage = await prisma.aiMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'assistant',
        content: result.message,
        metadata: {
          operationId: result.operationId || null,
          pendingActionId: result.pendingActionId || null,
          hasPreview: !!result.pendingActionPreview,
        },
      },
    });

    // Update conversation timestamp
    await prisma.aiConversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({
      messageId: assistantMessage.id,
      message: result.message,
      conversationId: conversation.id,
      conversationTitle: conversation.title,
      isNewConversation,
      pendingAction: result.pendingActionId
        ? {
            id: result.pendingActionId,
            preview: result.pendingActionPreview,
            operationId: result.operationId,
          }
        : null,
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    console.error('[API Chat] Error in AI chat route:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error while processing AI request' },
      { status: 500 }
    );
  }
}
