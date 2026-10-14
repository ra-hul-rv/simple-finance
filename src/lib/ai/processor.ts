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

Special rule for transaction creation:
If the user asks to add, create, log, or record a transaction (income, expense, or transfer), ALWAYS select:
{"operation": "propose_create_transaction", "params": {
  "amount": <numeric amount, e.g. 11716.21>,
  "description": "<title, item, or description>",
  "type": "EXPENSE" | "INCOME" | "TRANSFER",
  "categoryName": "<category if mentioned>",
  "accountName": "<account if mentioned>",
  "merchant": "<merchant or store if mentioned>",
  "notes": "<notes or private notes if mentioned>",
  "date": "<YYYY-MM-DD or DD/MM/YYYY>",
  "time": "<optional time, e.g. 10:10 PM or 22:10 if mentioned>"
}}

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

  // Heuristic safety net: If model returned null operation but user explicitly asked to create/add a transaction
  if (!intent.operation) {
    const isCreateTxRequest =
      /(?:create|add|record|insert|log|save|spent|paid)\s+(?:a\s+)?(?:new\s+)?(?:transaction|expense|income|spend|payment)/i.test(userMessage) ||
      (/(?:amount|total|paid)\s*[:=]/i.test(userMessage) && /(?:category|account|title|merchant|store)\s*[:=]/i.test(userMessage));

    if (isCreateTxRequest) {
      intent.operation = 'propose_create_transaction';
      intent.params = intent.params || {};
    }
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

  // For transaction creation, augment/salvage params directly from user message if missing
  if (operation.id === 'propose_create_transaction') {
    const rawParams = (intent.params && typeof intent.params === 'object' ? { ...intent.params } : {}) as Record<string, unknown>;

    // 1. Amount: e.g. "Amount: 11716.21" or "for ₹11716.21"
    if (!rawParams.amount && !rawParams.price && !rawParams.cost && !rawParams.total && !rawParams.paid) {
      const amtMatch = userMessage.match(/(?:final\s*amount\s*paid|amount|total|paid|price|cost|for|₹|rs\.?)\s*[:=]?\s*₹?\s*([\d,]+(?:\.\d{1,2})?)/i);
      if (amtMatch) rawParams.amount = amtMatch[1];
    }

    // 2. Title/Description: e.g. "Title: Sony WF-1000XM5 Wireless Earbuds"
    if (!rawParams.description && !rawParams.title && !rawParams.name && !rawParams.item) {
      const titleMatch = userMessage.match(/(?:title|item|description|product|name)\s*[:=]\s*([^\n\r]+)/i);
      if (titleMatch) rawParams.description = titleMatch[1].trim();
    }

    // 3. Category: e.g. "Category: Electronics"
    if (!rawParams.categoryName && !rawParams.category && !rawParams.cat) {
      const catMatch = userMessage.match(/(?:category|cat)\s*[:=]\s*([^\n\r]+)/i);
      if (catMatch) rawParams.categoryName = catMatch[1].trim();
    }

    // 4. Account: e.g. "Account: AmazonPay"
    if (!rawParams.accountName && !rawParams.account && !rawParams.bank && !rawParams.wallet) {
      const accMatch = userMessage.match(/(?:account|acc|bank|wallet)\s*[:=]\s*([^\n\r]+)/i);
      if (accMatch) rawParams.accountName = accMatch[1].trim();
    }

    // 5. Merchant / Store: e.g. "Store / Merchant: Clicktech Retail Private Ltd"
    if (!rawParams.merchant && !rawParams.store && !rawParams.vendor) {
      const merchMatch = userMessage.match(/(?:store\s*\/\s*merchant|merchant|store|vendor|seller)\s*[:=]\s*([^\n\r]+)/i);
      if (merchMatch) rawParams.merchant = merchMatch[1].trim();
    }

    // 6. Date: e.g. "Date: 11/10/2026"
    if (!rawParams.date) {
      const dateMatch = userMessage.match(/(?:order\s*date|date)\s*[:=]\s*([^\n\r|]+)/i);
      if (dateMatch) rawParams.date = dateMatch[1].trim();
    }

    // 7. Notes: e.g. "Private Note: ..."
    if (!rawParams.notes && !rawParams.privateNote && !rawParams.note) {
      const noteMatch = userMessage.match(/(?:private\s*note|notes?|memo|details)\s*[:=]\s*([^\n\r]+(?:\n[^\n\r]+)*)/i);
      if (noteMatch) rawParams.notes = noteMatch[1].trim();
    }

    // 8. Location: e.g. "Location: Online"
    if (!rawParams.location) {
      const locMatch = userMessage.match(/(?:location)\s*[:=]\s*([^\n\r]+)/i);
      if (locMatch) rawParams.location = locMatch[1].trim();
    }

    // 9. Type: e.g. "Type: Expense"
    if (!rawParams.type) {
      const typeMatch = userMessage.match(/(?:type)\s*[:=]\s*([^\n\r]+)/i);
      if (typeMatch) rawParams.type = typeMatch[1].trim();
    }

    // 10. Time: e.g. "Time: 10:10 PM" or standalone "10:10 PM" or "10:10 AM" or "22:10"
    if (!rawParams.time) {
      const timeExplicit = userMessage.match(/(?:order\s*time|transaction\s*time|time)\s*[:=]\s*([0-9]{1,2}[:.][0-9]{2}(?:\s*[ap]\.?m\.?)?)/i);
      if (timeExplicit) {
        rawParams.time = timeExplicit[1].trim();
      } else {
        const standaloneTime = userMessage.match(/\b([0-1]?[0-9]|2[0-3])[:.]([0-5][0-9])\s*([ap]\.?m\.?)\b/i);
        if (standaloneTime) {
          rawParams.time = standaloneTime[0].trim();
        }
      }
    }

    intent.params = rawParams;
  }

  // Validate parameters via Zod schema
  let validatedParams: Record<string, unknown>;
  try {
    validatedParams = operation.parameters.parse(intent.params || {}) as Record<string, unknown>;
  } catch (valErr: unknown) {
    console.warn('[AI Processor] Parameter validation error:', valErr, intent.params);
    return {
      message:
        'I recognized your transaction request, but could not determine a valid positive amount. Please provide a clear amount (for example: "Amount: ₹11,716.21").',
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
