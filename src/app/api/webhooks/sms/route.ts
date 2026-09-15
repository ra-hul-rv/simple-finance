import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { callAi } from '@/lib/ai';

// GET handler to easily test if the webhook is alive and reachable
export async function GET() {
  return NextResponse.json({
    status: 'active',
    message: 'SMS Webhook endpoint is online and ready to receive POST requests from SMS Forwarder.'
  });
}

export async function POST(request: Request) {
  try {
    // 1. Identify User: Check for Bearer token if provided, otherwise fallback to primary user
    let userId: string | null = null;
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      if (token) {
        const userSettings = await prisma.userSettings.findFirst({
          where: { webhookToken: token },
          select: { userId: true }
        });
        if (userSettings?.userId) {
          userId = userSettings.userId;
        }
      }
    }

    // If no token or token not found, fallback to the primary user in the database
    if (!userId) {
      const primaryUser = await prisma.user.findFirst({
        orderBy: { createdAt: 'asc' },
        select: { id: true }
      });
      if (!primaryUser) {
        console.error('[SMS Webhook] No user found in database.');
        return NextResponse.json({ error: 'No user configured in the application' }, { status: 404 });
      }
      userId = primaryUser.id;
    }

    // 2. Read incoming payload from SMS Forwarder
    let rawBody: any;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    console.log('[SMS Webhook] Received payload:', JSON.stringify(rawBody));

    if (Array.isArray(rawBody)) {
      rawBody = rawBody[0];
    }

    // Unpack body if nested or passed directly
    let smsBody: any = rawBody;
    let stringBodyMessage: string | null = null;
    if (rawBody && typeof rawBody.body === 'object' && rawBody.body !== null) {
      smsBody = rawBody.body;
    } else if (typeof rawBody?.body === 'string') {
      stringBodyMessage = rawBody.body;
    }

    const rawMsg = smsBody?.raw;
    const smsParsed = smsBody?.parsed;
    const smsMeta = smsBody?.meta;

    const message =
      rawMsg?.message ||
      smsBody?.message ||
      smsBody?.text ||
      smsBody?.content ||
      smsBody?.msg ||
      stringBodyMessage ||
      (typeof rawBody === 'string' ? rawBody : null);

    const sender =
      rawMsg?.sender ||
      smsBody?.sender ||
      smsBody?.from ||
      smsBody?.senderName ||
      'Unknown';

    const smsTimestamp = rawMsg?.timestamp || smsBody?.timestamp || smsBody?.date;

    if (!message) {
      console.warn('[SMS Webhook] No message text found in payload:', rawBody);
      return NextResponse.json({ error: 'No SMS message found in payload' }, { status: 400 });
    }

    // 3. Map any pre-parsed data from SMS forwarder (if available)
    let forwarderType: string | null = null;
    if (smsParsed?.type) {
      const t = String(smsParsed.type).toUpperCase();
      if (t === 'DEBIT') forwarderType = 'EXPENSE';
      else if (t === 'CREDIT') forwarderType = 'INCOME';
      else forwarderType = t;
    }

    const forwarderAmount = smsParsed?.amount ? Number(smsParsed.amount) : null;
    const forwarderMerchant = smsParsed?.merchant || null;
    const forwarderAccountDigits = smsParsed?.account ? String(smsParsed.account) : null;
    const forwarderDate = smsTimestamp
      ? new Date(typeof smsTimestamp === 'number' && smsTimestamp < 10000000000 ? smsTimestamp * 1000 : smsTimestamp).toISOString()
      : null;

    // 4. Fetch user's categories, accounts, credit cards, SMS rules, settings, and flow types
    const [categories, accounts, creditCards, smsRules, userSettings, flowTypes] = await Promise.all([
      prisma.category.findMany({
        where: { userId, isActive: true },
        select: { id: true, name: true, type: true }
      }),
      prisma.account.findMany({
        where: { userId, status: 'ACTIVE' },
        select: { id: true, name: true, type: true, accountNumber: true }
      }),
      prisma.creditCard.findMany({
        where: { userId },
        select: { accountId: true, cardName: true, lastFourDigits: true, cardNumber: true }
      }),
      prisma.smsRule.findMany({
        where: { userId },
        select: {
          identifier: true, label: true, aiNote: true,
          defaultType: true, defaultCategoryId: true, defaultAccountId: true,
          defaultMerchant: true, defaultDescription: true
        }
      }),
      prisma.userSettings.findFirst({
        where: { userId },
        select: { aiProvider: true }
      }),
      prisma.flowType.findMany({
        where: { userId },
        select: { id: true, name: true, direction: true }
      })
    ]);

    // Group categories by type
    const expenseCategories = categories.filter(c => c.type === 'EXPENSE');
    const incomeCategories = categories.filter(c => c.type === 'INCOME');

    // 5. Try matching account by card or account number digits
    let matchedAccountId: string | null = null;
    if (forwarderAccountDigits) {
      const ccMatch = creditCards.find(
        cc =>
          cc.lastFourDigits === forwarderAccountDigits ||
          (cc.cardNumber && cc.cardNumber.endsWith(forwarderAccountDigits))
      );
      if (ccMatch) {
        matchedAccountId = ccMatch.accountId;
      } else {
        const accMatch = accounts.find(
          a => a.accountNumber && a.accountNumber.endsWith(forwarderAccountDigits)
        );
        if (accMatch) matchedAccountId = accMatch.id;
      }
    }

    // 6. Build the AI prompt with SMS rules included
    const rulesForPrompt = smsRules.map(r => ({
      identifier: r.identifier,
      label: r.label,
      note: r.aiNote || undefined,
      defaults: {
        type: r.defaultType || undefined,
        categoryId: r.defaultCategoryId || undefined,
        accountId: r.defaultAccountId || undefined,
        merchant: r.defaultMerchant || undefined,
        description: r.defaultDescription || undefined,
      }
    }));

    const systemPrompt = `You are a financial AI assistant. Parse SMS bank transaction alerts into structured JSON.
Only return valid JSON, no markdown, no explanation.

Expense Categories (use for type=EXPENSE):
${JSON.stringify(expenseCategories)}

Income Categories (use for type=INCOME):
${JSON.stringify(incomeCategories)}

User's Accounts (pick one accountId that best matches, or null):
${JSON.stringify(accounts.map(a => ({ id: a.id, name: a.name, type: a.type })))}

User's Flow Types (pick one flowType id if applicable, or null):
${JSON.stringify(flowTypes.map(f => ({ id: f.id, name: f.name, direction: f.direction })))}

${rulesForPrompt.length > 0 ? `The user has saved rules for known merchants/senders. Match the SMS to a rule by its identifier if possible. If a rule matches, use its "note" and "defaults" to fill the fields:
${JSON.stringify(rulesForPrompt)}` : ''}

Output this exact JSON schema:
{
  "type": "EXPENSE" or "INCOME" or "TRANSFER",
  "amount": number,
  "currency": "INR",
  "accountId": "uuid string or null",
  "categoryId": "uuid string or null",
  "merchant": "string or null",
  "location": "string or null",
  "flowType": "uuid string or null",
  "transferToAccountId": "uuid string or null",
  "description": "short human-readable summary of the transaction",
  "date": "ISO8601 date string or null",
  "uniqueIdentifier": "a short uppercase key that uniquely identifies this merchant/sender/payment-type, e.g. SWIGGY, AMAZON, YESBNK_UPI"
}

Rules:
- "description" should be a clean, short summary like "UPI payment to Vijayakumari" or "YES BANK Card payment", NOT the raw SMS text.
- "uniqueIdentifier" should be a stable, reusable key for this type of transaction. Use the merchant name, app name, or bank+type as the key. Always UPPERCASE, no spaces, use underscores.
- If the SMS mentions a card number ending (e.g. X2020), try to match it to an account.
- If it is a TRANSFER, try to identify both accountId and transferToAccountId if possible.
- If you cannot determine a field, set it to null. Never make up IDs.
- If a saved rule matches, ALWAYS prefer its defaults over your own guess for categoryId, accountId, type, merchant, and description.`;

    const userPrompt = `Parse this SMS from "${sender}": "${message}"`;

    let aiData: any = {};

    try {
      console.log('[SMS Webhook] Calling AI...');
      const rawContent = await callAi({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
        max_tokens: 800,
        provider: userSettings?.aiProvider || 'local'
      });

      if (rawContent) {
        let content = rawContent.replace(/```json/gi, '').replace(/```/g, '').trim();
        const firstBrace = content.indexOf('{');
        const lastBrace = content.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          content = content.substring(firstBrace, lastBrace + 1);
        }
        aiData = JSON.parse(content);
        console.log('[SMS Webhook] AI Parsed successfully:', aiData);
      }
    } catch (aiError) {
      console.error('[SMS Webhook] Failed to parse with AI:', aiError);
    }

    // 7. Merge: AI result > SMS Forwarder pre-parsed > defaults
    const finalParsed = {
      type: aiData.type || forwarderType || 'EXPENSE',
      amount: typeof aiData.amount === 'number' ? aiData.amount : (forwarderAmount || 0),
      currency: aiData.currency || smsParsed?.currency || 'INR',
      accountId: aiData.accountId || matchedAccountId || null,
      categoryId: aiData.categoryId || null,
      merchant: aiData.merchant || forwarderMerchant || null,
      location: aiData.location || null,
      flowType: aiData.flowType || null,
      transferToAccountId: aiData.transferToAccountId || null,
      description: aiData.description || (forwarderMerchant ? `Payment to ${forwarderMerchant}` : 'SMS Transaction'),
      notes: message, // Raw details stored in private notes
      date: aiData.date || forwarderDate || new Date().toISOString(),
      uniqueIdentifier: aiData.uniqueIdentifier || null,
    };

    // 8. Auto-create or update SMS Rule based on uniqueIdentifier
    if (finalParsed.uniqueIdentifier) {
      const normalizedId = String(finalParsed.uniqueIdentifier).toUpperCase().trim();
      try {
        const existingRule = await prisma.smsRule.findUnique({
          where: { userId_identifier: { userId, identifier: normalizedId } }
        });

        if (existingRule) {
          // Increment usage count
          await prisma.smsRule.update({
            where: { id: existingRule.id },
            data: { usageCount: { increment: 1 }, lastUsedAt: new Date() }
          });
          console.log('[SMS Webhook] Updated SmsRule usage:', normalizedId);

          // Apply saved defaults from the rule to fill any remaining null fields
          if (!finalParsed.categoryId && existingRule.defaultCategoryId) {
            finalParsed.categoryId = existingRule.defaultCategoryId;
          }
          if (!finalParsed.accountId && existingRule.defaultAccountId) {
            finalParsed.accountId = existingRule.defaultAccountId;
          }
          if (existingRule.defaultType && !aiData.type) {
            finalParsed.type = existingRule.defaultType;
          }
          if (existingRule.defaultMerchant && !aiData.merchant) {
            finalParsed.merchant = existingRule.defaultMerchant;
          }
          if (existingRule.defaultDescription && !aiData.description) {
            finalParsed.description = existingRule.defaultDescription;
          }
        } else {
          // Auto-create new rule
          await prisma.smsRule.create({
            data: {
              userId,
              identifier: normalizedId,
              label: finalParsed.merchant || finalParsed.description || normalizedId,
              autoCreated: true,
              usageCount: 1,
              lastUsedAt: new Date(),
            }
          });
          console.log('[SMS Webhook] Auto-created SmsRule:', normalizedId);
        }
      } catch (ruleError) {
        // Don't fail the whole request if rule creation fails
        console.error('[SMS Webhook] SmsRule upsert error:', ruleError);
      }
    }

    // 9. Save directly to InboxEvent for the AI Inbox page
    const payloadToSave = {
      rawMessage: message,
      rawSender: sender,
      parsed: finalParsed,
      forwarderParsed: smsParsed || null,
      meta: smsMeta || null,
      originalPayload: rawBody
    };

    const inboxEvent = await prisma.inboxEvent.create({
      data: {
        userId,
        source: 'sms_ai',
        payload: payloadToSave,
        status: 'PENDING'
      }
    });

    console.log('[SMS Webhook] Created InboxEvent:', inboxEvent.id);

    return NextResponse.json({
      success: true,
      eventId: inboxEvent.id,
      parsed: finalParsed
    });
  } catch (error) {
    console.error('[SMS Webhook] Error processing request:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

