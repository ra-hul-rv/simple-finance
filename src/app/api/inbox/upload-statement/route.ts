import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

// Helper to sanitize sensitive PII before passing text to the AI
export function sanitizeStatementText(text: string): string {
  let sanitized = text;

  // 1. Redact PAN Card numbers (e.g. ABCDE1234F)
  sanitized = sanitized.replace(/\b[A-Z]{5}[0-9]{4}[A-Z]\b/g, '[REDACTED_PAN]');

  // 2. Redact Email addresses
  sanitized = sanitized.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, '[REDACTED_EMAIL]');

  // 3. Redact Indian mobile numbers (+91 or standalone 10-digits starting with 6-9)
  sanitized = sanitized.replace(/(?:\+91[\-\s]?)?\b[6-9]\d{9}\b/g, '[REDACTED_PHONE]');

  // 4. Redact 12-digit Aadhaar-like numbers (e.g. 1234 5678 9012)
  sanitized = sanitized.replace(/\b\d{4}\s\d{4}\s\d{4}\b/g, '[REDACTED_AADHAAR]');

  // 5. Redact long account/card numbers (11+ digits), leaving last 4 digits visible
  sanitized = sanitized.replace(/\b\d{7,14}(\d{4})\b/g, 'XXXX$1');

  return sanitized;
}

async function getUserIdFromRequest(request: Request): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (token) {
      const settings = await prisma.userSettings.findFirst({
        where: { webhookToken: token },
        select: { userId: true },
      });
      if (settings?.userId) return settings.userId;
    }
  }

  const session = await auth();
  if (session?.user?.id) return session.user.id;

  // Fallback to primary user
  const primaryUser = await prisma.user.findFirst({
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  return primaryUser?.id || null;
}

export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contentType = request.headers.get('content-type') || '';

    let rawText = '';
    let accountId: string | null = null;
    let startDate: string | null = null;
    let endDate: string | null = null;
    let sanitizePii = true;
    let password = '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      rawText = (formData.get('rawText') as string) || '';
      accountId = (formData.get('accountId') as string) || null;
      startDate = (formData.get('startDate') as string) || null;
      endDate = (formData.get('endDate') as string) || null;
      sanitizePii = formData.get('sanitizePii') !== 'false';
      password = (formData.get('password') as string) || '';

      // If a file is uploaded, extract its content
      if (file && file.size > 0) {
        const fileBuffer = Buffer.from(await file.arrayBuffer());
        const fileName = file.name.toLowerCase();

        if (fileName.endsWith('.pdf')) {
          try {
            // Use pdf-parse to extract text
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const { PDFParse } = require('pdf-parse');
            const parser = new PDFParse({
              data: fileBuffer,
              password: password.trim() || undefined,
            });
            const textResult = await parser.getText();
            rawText = (textResult?.text || '') + '\n' + rawText;
            await parser.destroy();
          } catch (pdfErr: any) {
            console.error('[Statement Upload] PDF Parse error:', pdfErr);
            if (
              pdfErr.name === 'PasswordException' ||
              String(pdfErr.message || '').toLowerCase().includes('password')
            ) {
              return NextResponse.json(
                {
                  error: 'This PDF is password-protected. Please enter the password and try again.',
                },
                { status: 400 }
              );
            }
            return NextResponse.json(
              { error: 'Failed to read PDF. It may be corrupted or encrypted.' },
              { status: 400 }
            );
          }
        } else {
          // CSV, TXT, or other plain text files
          const textContent = fileBuffer.toString('utf-8');
          rawText = textContent + '\n' + rawText;
        }
      }
    } else {
      // JSON body (direct paste)
      const body = await request.json();
      rawText = body.rawText || '';
      accountId = body.accountId || null;
      startDate = body.startDate || null;
      endDate = body.endDate || null;
      sanitizePii = body.sanitizePii !== false;
    }

    if (!rawText.trim()) {
      return NextResponse.json(
        { error: 'No transaction text or file content provided.' },
        { status: 400 }
      );
    }

    // 1. Sanitize sensitive PII if enabled
    const processedText = sanitizePii ? sanitizeStatementText(rawText) : rawText;

    // 2. Fetch user's categories, accounts, and saved rules for AI context
    const [categories, accounts, smsRules] = await Promise.all([
      prisma.category.findMany({
        where: { userId, isActive: true },
        select: { id: true, name: true, type: true },
      }),
      prisma.account.findMany({
        where: { userId, status: 'ACTIVE' },
        select: { id: true, name: true, type: true },
      }),
      prisma.smsRule.findMany({
        where: { userId },
        select: {
          identifier: true,
          label: true,
          aiNote: true,
          defaultType: true,
          defaultCategoryId: true,
          defaultAccountId: true,
        },
      }),
    ]);

    // Format saved vendor rules for prompt
    const rulesPrompt = smsRules
      .map(
        (r) =>
          `- Identifier: "${r.identifier}" (${r.label})${
            r.aiNote ? ` -> Note: ${r.aiNote}` : ''
          }`
      )
      .join('\n');

    // 3. Build the prompt for Nvidia AI
    let dateFilterInstruction = '';
    if (startDate && endDate) {
      dateFilterInstruction = `CRITICAL DATE FILTER: ONLY extract transactions between ${startDate} and ${endDate} (inclusive). Completely ignore any transactions dated before ${startDate} or after ${endDate}.`;
    } else if (startDate) {
      dateFilterInstruction = `CRITICAL DATE FILTER: ONLY extract transactions dated on or after ${startDate}. Completely ignore any transactions before ${startDate}.`;
    } else if (endDate) {
      dateFilterInstruction = `CRITICAL DATE FILTER: ONLY extract transactions dated on or before ${endDate}. Completely ignore any transactions after ${endDate}.`;
    }

    const systemPrompt = `You are a financial statement analyzer. Your job is to extract individual financial transactions from bank statements, credit card statements, or pasted transaction records into a structured JSON array.
Only return valid JSON array, with no markdown, no explanation.

${dateFilterInstruction}

User's Categories:
${JSON.stringify(categories)}

Target Account: ${accountId ? `Assign accountId = "${accountId}" to all extracted transactions unless clearly indicated otherwise.` : 'Auto-determine account or leave null.'}

User's Saved Merchant Rules:
${rulesPrompt || 'None'}

Output this exact JSON array format:
[
  {
    "date": "YYYY-MM-DD",
    "type": "EXPENSE" or "INCOME" or "TRANSFER",
    "amount": number (positive decimal),
    "currency": "INR",
    "description": "Clean summary of what this was (e.g. Swiggy Food, Uber Ride, Salary)",
    "merchant": "Clean vendor or merchant name if discernible, or null",
    "categoryId": "uuid matching one of the user's categories, or null",
    "accountId": "${accountId || 'uuid or null'}"
  }
]

Rules:
- Debit / Withdrawal / Dr / Spent -> type = "EXPENSE"
- Credit / Deposit / Cr / Received -> type = "INCOME"
- Amount must be a positive number (e.g. 450.50, never negative).
- Format dates strictly as "YYYY-MM-DD" in ISO format.
- If there are multiple transactions in the text, extract each one as a separate object in the array.
- If no transactions are found or none match the date filter, return [].
- Never hallucinate fake transactions. Only extract what appears in the provided statement text.`;

    // Limit text length if extremely large to prevent exceeding token context
    const maxChars = 24000;
    const truncatedText =
      processedText.length > maxChars
        ? processedText.substring(0, maxChars) + '\n[Text truncated due to length]'
        : processedText;

    console.log('[Statement Upload] Calling AI to parse statement text (length: %d chars)...', truncatedText.length);

    const aiResponse = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization':
          'Bearer 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',
      },
      body: JSON.stringify({
        model: 'meta/llama-3.1-70b-instruct',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Extract the transactions from this statement content:\n\n${truncatedText}`,
          },
        ],
        temperature: 0.1,
        max_tokens: 2500,
      }),
    });

    let extractedList: any[] = [];

    if (aiResponse.ok) {
      const result = await aiResponse.json();
      let content = result.choices?.[0]?.message?.content || '[]';
      content = content.replace(/```json/gi, '').replace(/```/g, '').trim();

      const firstBracket = content.indexOf('[');
      const lastBracket = content.lastIndexOf(']');
      if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
        content = content.substring(firstBracket, lastBracket + 1);
      }

      try {
        extractedList = JSON.parse(content);
      } catch (parseErr) {
        console.error('[Statement Upload] Failed to parse AI JSON array:', parseErr, content);
      }
    } else {
      const errText = await aiResponse.text();
      console.error('[Statement Upload] Nvidia AI API error:', errText);
      return NextResponse.json({ error: 'AI processing failed' }, { status: 502 });
    }

    if (!Array.isArray(extractedList) || extractedList.length === 0) {
      return NextResponse.json({
        success: true,
        count: 0,
        message: 'No transactions found matching the criteria in the provided text.',
        transactions: [],
      });
    }

    // 4. Save each extracted transaction as a PENDING InboxEvent
    const createdEvents = await Promise.all(
      extractedList.map(async (tx) => {
        const parsedData = {
          type: tx.type === 'INCOME' ? 'INCOME' : 'EXPENSE',
          amount: Math.abs(Number(tx.amount)) || 0,
          currency: tx.currency || 'INR',
          accountId: tx.accountId || accountId || null,
          categoryId: tx.categoryId || null,
          merchant: tx.merchant || null,
          description: tx.description || 'Statement Transaction',
          date: tx.date
            ? new Date(tx.date).toISOString()
            : new Date().toISOString(),
        };

        const payloadToSave = {
          rawMessage: `${tx.date || ''} - ${tx.description || ''} - ${tx.amount || ''}`,
          rawSender: 'Statement Import',
          parsed: parsedData,
          sourceType: 'statement',
        };

        return prisma.inboxEvent.create({
          data: {
            userId,
            source: 'statement_import',
            payload: payloadToSave,
            status: 'PENDING',
          },
        });
      })
    );

    console.log('[Statement Upload] Created %d InboxEvents successfully', createdEvents.length);

    return NextResponse.json({
      success: true,
      count: createdEvents.length,
      transactions: extractedList,
    });
  } catch (error: any) {
    console.error('[Statement Upload] Error processing statement:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
