import { Prisma } from '@prisma/client';
import { callAssistantAi, getAssistantConfig } from './assistant-config';
import { buildSchemaContext, buildFinancialContext } from './context';
import { getOperation, getOperationList } from './operations';
import { createPendingAction } from './actions';

export interface ProcessResult {
  message: string;
  pendingActionId?: string;
  pendingActionPreview?: unknown;
  operationId?: string;
  operationData?: unknown;
}

export async function processUserMessage(
  userId: string,
  userMessage: string,
  conversationId: string,
  conversationHistory: Array<{ role: string; content: string }>
): Promise<ProcessResult> {
  const config = getAssistantConfig();
  if (!config.enabled) {
    return {
      message:
        'The AI Financial Assistant is currently disabled. Please enable it by setting AI_ENABLED=true in your environment configuration.',
    };
  }

  // 1. Prepare schema and financial context
  const schemaContext = buildSchemaContext();
  const financialContext = await buildFinancialContext(userId);
  const operationList = getOperationList();

  // 2. PASS 1: Intent Detection
  const intentSystemPrompt = `${schemaContext}${financialContext}

You are an intent parser. Determine the user's intent and select ONE appropriate operation if data is needed.
You MUST respond with a JSON object ONLY. No markdown code blocks, no other text.

Formats:
If data is needed:
{"operation": "operation_id", "params": { ... }}

If no operation or simple conversation:
{"operation": null, "response": "Your friendly reply or question"}

Available operations:
${operationList.map((op) => `- ${op.id} (${op.category}): ${op.description}`).join('\n')}
`;

  // Take recent history to maintain conversational context
  const recentHistory = conversationHistory.slice(-6);
  const intentMessages = [
    { role: 'system', content: intentSystemPrompt },
    ...recentHistory,
    { role: 'user', content: userMessage },
  ];

  let intentRaw = '';
  try {
    intentRaw = await callAssistantAi({
      messages: intentMessages,
      temperature: 0.1,
      max_tokens: 400,
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown connection error';
    console.error('[AI Processor] Pass 1 inference failed:', errMsg);
    return {
      message: `Failed to connect to the local AI assistant. (${errMsg})`,
    };
  }

  // Parse Intent JSON safely
  let intent: { operation?: string | null; params?: Record<string, unknown>; response?: string } = {};
  try {
    let clean = intentRaw.trim();
    if (clean.startsWith('```')) {
      clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    }
    intent = JSON.parse(clean);
  } catch {
    console.warn('[AI Processor] Could not parse intent JSON, using fallback:', intentRaw);
    return { message: intentRaw };
  }

  // If no operation is required, return conversational response
  if (!intent.operation) {
    return {
      message:
        intent.response ||
        "I'm here to help you analyze your finances, account balances, spending, or record transactions. How can I assist?",
    };
  }

  // Lookup approved operation
  const operation = getOperation(intent.operation);
  if (!operation) {
    return {
      message: `I identified the need for an operation (${intent.operation}), but it is not available in the approved registry. Could you clarify your question?`,
    };
  }

  // Safety check: Check if write actions are enabled
  if (operation.category === 'write' && !config.writesEnabled) {
    return {
      message:
        'I can prepare answers and analyze your finances, but database write actions are currently disabled (AI_ALLOW_WRITES=false). An administrator must enable write permissions.',
    };
  }

  // Validate parameters via Zod schema
  let validatedParams: Record<string, unknown>;
  try {
    validatedParams = operation.parameters.parse(intent.params || {}) as Record<string, unknown>;
  } catch (valErr: unknown) {
    console.warn('[AI Processor] Parameter validation error:', valErr);
    return {
      message:
        'I understood your request but need a bit more detail (such as a valid amount, date, or category). Could you please specify?',
    };
  }

  // Execute operation against database (deterministic)
  let opResult;
  try {
    opResult = await operation.execute(userId, validatedParams);
  } catch (execErr: unknown) {
    console.error('[AI Processor] Execution error:', execErr);
    return {
      message: 'An error occurred while fetching your financial data from the database.',
    };
  }

  if (!opResult.success) {
    return {
      message: opResult.error || 'Unable to retrieve financial data for this query.',
    };
  }

  // If this is a write proposal, create a PendingAction and return confirmation card
  if (operation.category === 'write') {
    const pendingAction = await createPendingAction({
      userId,
      conversationId,
      operationId: operation.id,
      parameters: validatedParams as Prisma.InputJsonValue,
      preview: (opResult.data ?? {}) as Prisma.InputJsonValue,
    });

    return {
      message:
        'I have prepared this transaction proposal for you. Please review the details below and confirm to save it to your records.',
      pendingActionId: pendingAction.id,
      pendingActionPreview: opResult.data,
      operationId: operation.id,
    };
  }

  // 3. PASS 2: Natural presentation of authoritative database facts
  const presentationSystemPrompt = `You are the local AI Financial Assistant for Simple Finance.
The user asked a question, and the system retrieved verified, authoritative database records.
Present this data clearly, politely, and concisely to the user.

Presentation Guidelines:
- Highlight key metrics in bold.
- Use Indian Rupee symbol (₹) for all currency figures.
- Use markdown tables or bulleted lists for breakdowns.
- State facts directly without saying "According to the database" or adding unnecessary disclaimers.
`;

  const presentationMessages = [
    { role: 'system', content: presentationSystemPrompt },
    { role: 'user', content: userMessage },
    {
      role: 'assistant',
      content: `Authoritative Database Results:\n${JSON.stringify(opResult.data, null, 2)}\n\nFactual Summary:\n${opResult.summary || ''}`,
    },
    {
      role: 'user',
      content: 'Summarize and present these exact figures clearly to me now.',
    },
  ];

  let finalMessage = '';
  try {
    finalMessage = await callAssistantAi({
      messages: presentationMessages,
      temperature: 0.3,
      max_tokens: 1200,
    });
  } catch (presentationErr: unknown) {
    console.warn('[AI Processor] Pass 2 formatting error, falling back to summary:', presentationErr);
    // Graceful fallback to verified server summary so the user is never left without data
    finalMessage = opResult.summary || JSON.stringify(opResult.data, null, 2);
  }

  return {
    message: finalMessage,
    operationId: operation.id,
    operationData: opResult.data,
  };
}
