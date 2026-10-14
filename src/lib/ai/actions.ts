import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { getOperation } from './operations';
import { getAssistantConfig } from './assistant-config';

const ACTION_EXPIRY_MINUTES = 15;

export interface CreatePendingActionParams {
  userId: string;
  conversationId?: string | null;
  operationId: string;
  parameters: Prisma.InputJsonValue;
  preview: Prisma.InputJsonValue;
}

export async function createPendingAction(params: CreatePendingActionParams) {
  const expiresAt = new Date(Date.now() + ACTION_EXPIRY_MINUTES * 60 * 1000);

  return prisma.pendingAction.create({
    data: {
      userId: params.userId,
      conversationId: params.conversationId || null,
      operationId: params.operationId,
      parameters: params.parameters,
      preview: params.preview,
      status: 'PENDING',
      expiresAt,
    },
  });
}

export async function confirmPendingAction(
  actionId: string,
  userId: string
): Promise<{ success: boolean; message: string; data?: unknown }> {
  // Enforce server-side configuration check
  const config = getAssistantConfig();
  if (!config.writesEnabled) {
    return {
      success: false,
      message: 'Database write actions are disabled on this server. Set AI_ALLOW_WRITES=true in the environment to enable them.',
    };
  }

  const action = await prisma.pendingAction.findUnique({
    where: { id: actionId },
  });

  if (!action) {
    return { success: false, message: 'Action not found.' };
  }

  // Strictly enforce user ownership
  if (action.userId !== userId) {
    return { success: false, message: 'Unauthorized access to this action.' };
  }

  // Replay protection: ensure action is strictly in PENDING state
  if (action.status !== 'PENDING') {
    return {
      success: false,
      message: `This action has already been ${action.status.toLowerCase()}.`,
    };
  }

  // Check expiration
  if (new Date() > action.expiresAt) {
    await prisma.pendingAction.update({
      where: { id: actionId },
      data: { status: 'EXPIRED' },
    });
    return {
      success: false,
      message: 'This proposed action has expired (15-minute window). Please submit a new request.',
    };
  }

  // Lookup approved operation
  const operation = getOperation(action.operationId);
  if (!operation) {
    return {
      success: false,
      message: 'The requested operation is no longer registered or approved.',
    };
  }

  // Re-validate parameters before execution
  let validatedParams: Record<string, unknown>;
  try {
    validatedParams = operation.parameters.parse(action.parameters) as Record<string, unknown>;
  } catch {
    return {
      success: false,
      message: 'Parameters are invalid or corrupted.',
    };
  }

  // Execute server-side write with confirmed flag
  try {
    const result = await operation.execute(userId, {
      ...validatedParams,
      _confirmed: true,
    });

    if (!result.success) {
      return {
        success: false,
        message: result.error || 'Failed to execute the transaction.',
      };
    }

    // Mark as EXECUTED to prevent replay
    await prisma.pendingAction.update({
      where: { id: actionId },
      data: {
        status: 'EXECUTED',
        executedAt: new Date(),
        result: (result.data || {}) as Prisma.InputJsonValue,
      },
    });

    return {
      success: true,
      message: result.summary || 'Transaction successfully created and balances updated.',
      data: result.data,
    };
  } catch (error: unknown) {
    console.error('[PendingAction] Execution failed:', error);
    return {
      success: false,
      message: `Execution failed: ${error instanceof Error ? error.message : 'Internal database error'}`,
    };
  }
}

export async function cancelPendingAction(
  actionId: string,
  userId: string
): Promise<{ success: boolean; message: string }> {
  const action = await prisma.pendingAction.findUnique({
    where: { id: actionId },
  });

  if (!action) {
    return { success: false, message: 'Action not found.' };
  }

  if (action.userId !== userId) {
    return { success: false, message: 'Unauthorized.' };
  }

  if (action.status !== 'PENDING') {
    return {
      success: false,
      message: `Action cannot be cancelled because it is already ${action.status.toLowerCase()}.`,
    };
  }

  await prisma.pendingAction.update({
    where: { id: actionId },
    data: { status: 'CANCELLED' },
  });

  return { success: true, message: 'Action proposal cancelled.' };
}
