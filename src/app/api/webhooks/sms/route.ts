import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Missing Bearer token' }, { status: 401 });
    }
    const token = authHeader.substring(7).trim();
    
    // Find user by webhook token
    const userSettings = await prisma.userSettings.findFirst({
      where: { webhookToken: token },
      include: { user: true }
    });

    if (!userSettings || !userSettings.userId) {
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }
    const userId = userSettings.userId;

    // Read payload from SMS Forwarder app (direct POST)
    // Expected: { raw: { sender, message, timestamp, simSlot }, parsed: { type, amount, ... }, meta: { ... } }
    let rawBody = await request.json();
    if (Array.isArray(rawBody)) {
      rawBody = rawBody[0];
    }
    // Handle both direct payloads and payloads wrapped in a `body` key
    const smsBody = rawBody?.body || rawBody;
    
    const rawMsg = smsBody?.raw;
    const smsParsed = smsBody?.parsed;
    const smsMeta = smsBody?.meta;

    const message = rawMsg?.message || rawBody?.message || rawBody?.text;
    const sender = rawMsg?.sender || rawBody?.sender || rawBody?.from;
    const smsTimestamp = rawMsg?.timestamp; // epoch ms

    if (!message) {
      return NextResponse.json({ error: 'No message found in payload' }, { status: 400 });
    }

    // --- Use the SMS forwarder's pre-parsed data as baseline ---
    // Map DEBIT/CREDIT → EXPENSE/INCOME
    let forwarderType: string | null = null;
    if (smsParsed?.type) {
      const t = smsParsed.type.toUpperCase();
      if (t === 'DEBIT') forwarderType = 'EXPENSE';
      else if (t === 'CREDIT') forwarderType = 'INCOME';
      else forwarderType = t; // pass through if already EXPENSE/INCOME
    }

    const forwarderAmount = smsParsed?.amount || null;
    const forwarderMerchant = smsParsed?.merchant || null;
    const forwarderAccountDigits = smsParsed?.account || null; // e.g. "2020" (last 4 digits)
    const forwarderDate = smsTimestamp
      ? new Date(smsTimestamp).toISOString()
      : null;

    // Fetch categories and accounts (including accountNumber for card matching)
    const [categories, accounts, creditCards] = await Promise.all([
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
      })
    ]);

    // Try to match the forwarder's last-4-digits to an account
    let matchedAccountId: string | null = null;
    if (forwarderAccountDigits) {
      // Check credit cards first (lastFourDigits field)
      const ccMatch = creditCards.find(
        cc => cc.lastFourDigits === forwarderAccountDigits ||
              (cc.cardNumber && cc.cardNumber.endsWith(forwarderAccountDigits))
      );
      if (ccMatch) {
        matchedAccountId = ccMatch.accountId;
      } else {
        // Check regular accounts (accountNumber ending)
        const accMatch = accounts.find(
          a => a.accountNumber && a.accountNumber.endsWith(forwarderAccountDigits)
        );
        if (accMatch) matchedAccountId = accMatch.id;
      }
    }

    // --- Call Nvidia AI to fill in remaining fields ---
    const systemPrompt = `You are a financial AI assistant. Parse SMS bank transaction alerts into structured JSON.
Only return valid JSON, no markdown, no explanation.

The user's categories (pick one categoryId that best matches, or null):
${JSON.stringify(categories)}

The user's accounts (pick one accountId that best matches, or null):
${JSON.stringify(accounts.map(a => ({ id: a.id, name: a.name, type: a.type })))}

Output this exact JSON schema:
{
  "type": "EXPENSE" or "INCOME" or "TRANSFER",
  "amount": number,
  "currency": "INR",
  "accountId": "uuid string or null",
  "categoryId": "uuid string or null",
  "merchant": "string or null",
  "description": "short human-readable summary of the transaction",
  "date": "ISO8601 date string or null"
}

Rules:
- "description" should be a clean, short summary like "UPI payment to Vijayakumari" or "Swiggy food order", NOT the raw SMS text.
- If the SMS mentions a card number ending (e.g. X2020), try to match it to an account.
- If you cannot determine a field, set it to null. Never make up IDs.`;

    const userPrompt = `Parse this SMS from "${sender || 'Unknown'}": "${message}"`;

    let aiData: any = {};
    
    try {
      const aiResponse = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer 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'
        },
        body: JSON.stringify({
          model: 'meta/llama-3.1-70b-instruct',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.1,
          max_tokens: 500
        })
      });

      if (aiResponse.ok) {
        const result = await aiResponse.json();
        let content = result.choices?.[0]?.message?.content || '{}';
        content = content.replace(/```json/g, '').replace(/```/g, '').trim();
        aiData = JSON.parse(content);
      } else {
        console.error('Nvidia AI API error:', await aiResponse.text());
      }
    } catch (aiError) {
      console.error('Failed to parse with AI:', aiError);
    }

    // --- Merge: AI result > forwarder pre-parsed > defaults ---
    // AI takes priority, forwarder fills gaps, defaults as last resort
    const finalParsed = {
      type: aiData.type || forwarderType || 'EXPENSE',
      amount: aiData.amount || forwarderAmount || 0,
      currency: aiData.currency || smsParsed?.currency || 'INR',
      accountId: aiData.accountId || matchedAccountId || null,
      categoryId: aiData.categoryId || null,
      merchant: aiData.merchant || forwarderMerchant || null,
      description: aiData.description || null,
      date: aiData.date || forwarderDate || new Date().toISOString(),
    };

    // Save to InboxEvent with full context
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

    return NextResponse.json({
      success: true,
      eventId: inboxEvent.id,
      parsed: finalParsed
    });
  } catch (error) {
    console.error('SMS Webhook Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
