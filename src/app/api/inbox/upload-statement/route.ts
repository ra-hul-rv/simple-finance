import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import * as XLSX from 'xlsx';
import { callAi, getAiConfig } from '@/lib/ai';

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

// Robust PDF text extraction supporting password protection
async function extractPdfText(buffer: Buffer, password?: string): Promise<string> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    password: password ? String(password).trim() : undefined,
    useSystemFonts: true,
    disableFontFace: true,
    isEvalSupported: false,
  });

  const doc = await loadingTask.promise;
  let fullText = '';
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => ('str' in item ? item.str : ''))
      .join(' ');
    fullText += pageText + '\n';
  }
  return fullText;
}

// Convert Excel (.xlsx, .xls) and SBI HTML tables into clean CSV text
function extractExcelText(buffer: Buffer): string {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    let combinedCsv = '';
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      if (sheet) {
        combinedCsv += XLSX.utils.sheet_to_csv(sheet) + '\n';
      }
    }
    return combinedCsv;
  } catch (err) {
    console.warn('[Statement Upload] SheetJS parse fallback to string:', err);
    return buffer.toString('utf-8');
  }
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

  const primaryUser = await prisma.user.findFirst({
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  return primaryUser?.id || null;
}

function cleanAndParseJsonArray(raw: string): any[] {
  let content = raw.replace(/```json/gi, '').replace(/```/g, '').trim();

  const firstBracket = content.indexOf('[');
  const lastBracket = content.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    content = content.substring(firstBracket, lastBracket + 1);
  }

  // Remove trailing commas before } or ] (common LLM JSON issue)
  content = content.replace(/,\s*([\]}])/g, '$1');

  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === 'object') {
      for (const val of Object.values(parsed)) {
        if (Array.isArray(val)) return val;
      }
    }
    return [];
  } catch {
    // Secondary relaxed cleanup: single quotes to double quotes, comments
    try {
      const relaxed = content
        .replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, '"$1"')
        .replace(/,\s*([\]}])/g, '$1');
      const parsed = JSON.parse(relaxed);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.error('[Statement Upload] Failed to parse JSON array from AI:', content.slice(0, 300));
      return [];
    }
  }
}

// Single AI extraction chunk call
async function parseChunkWithAi(
  chunkText: string,
  categories: any[],
  rulesPrompt: string,
  accountId: string | null,
  dateFilterInstruction: string,
  provider?: string | null
): Promise<{ transactions: any[]; error?: string }> {
  const systemPrompt = `You are an expert financial statement analyzer. Extract all financial transactions from the provided bank/credit-card statements or table rows into a structured JSON array.
Only return a valid JSON array. Do not include markdown fences, thoughts, or explanatory text.

${dateFilterInstruction}

User's Categories:
${JSON.stringify(categories)}

Target Account: ${accountId ? `Assign accountId = "${accountId}"` : 'Leave null if not explicitly known'}

User's Saved Merchant Rules:
${rulesPrompt || 'None'}

Example Output:
[
  {
    "date": "2026-08-15",
    "type": "EXPENSE",
    "amount": 450.50,
    "currency": "INR",
    "description": "Swiggy Food Order",
    "merchant": "Swiggy",
    "categoryId": null,
    "accountId": null
  }
]

Rules:
- type: Must be "EXPENSE" (for debit, withdrawal, dr, purchase, charges) or "INCOME" (for credit, deposit, cr, salary, refund) or "TRANSFER".
- amount: Must be a positive floating-point number (e.g. 450.50, never negative).
- date: Strictly "YYYY-MM-DD" format. If day/month order is ambiguous, prefer Indian DD/MM/YYYY.
- description: Clean, readable summary of what this transaction was.
- merchant: Vendor or recipient name if clear, else null.
- categoryId: Match to one of the user's category IDs if applicable, else null.
- If no transactions are found in the text, return an empty array [].
- Never make up fake transactions.`;

  try {
    const rawContent = await callAi({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Extract all transactions from this statement text:\n\n${chunkText}` },
      ],
      temperature: 0.1,
      max_tokens: 2500,
      provider,
    });

    if (!rawContent) {
      return { transactions: [] };
    }

    const transactions = cleanAndParseJsonArray(rawContent);
    return { transactions };
  } catch (err: any) {
    console.error('[Statement Upload] Chunk parse error:', err?.message || err);
    return { transactions: [], error: err?.message || 'Failed to call AI model' };
  }
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

      if (file && file.size > 0) {
        const fileBuffer = Buffer.from(await file.arrayBuffer());
        const fileName = file.name.toLowerCase();

        // 1. PDF File handling
        if (fileName.endsWith('.pdf')) {
          try {
            console.log('[Statement Upload] Parsing PDF (%s, %d bytes)...', file.name, file.size);
            const extracted = await extractPdfText(fileBuffer, password);
            rawText = extracted + '\n' + rawText;
          } catch (pdfErr: any) {
            console.error('[Statement Upload] PDF Parse error:', pdfErr);
            const msg = String(pdfErr?.message || '').toLowerCase();
            const errName = String(pdfErr?.name || '');
            if (
              errName.includes('Password') ||
              msg.includes('password') ||
              msg.includes('need_password') ||
              msg.includes('incorrect_password')
            ) {
              return NextResponse.json(
                {
                  error: 'This PDF is password-protected. Please enter the statement password and try again.',
                },
                { status: 400 }
              );
            }
            return NextResponse.json(
              { error: 'Failed to read PDF. If protected, please enter the password; otherwise ensure the file is not corrupted.' },
              { status: 400 }
            );
          }
        }
        // 2. Excel & SBI HTML table handling (.xlsx, .xls, or HTML table)
        else if (
          fileName.endsWith('.xlsx') ||
          fileName.endsWith('.xls') ||
          fileBuffer.toString('utf-8', 0, 50).includes('<!DOCTYPE') ||
          fileBuffer.toString('utf-8', 0, 50).includes('<html')
        ) {
          console.log('[Statement Upload] Parsing Excel/HTML statement (%s)...', file.name);
          const extractedCsv = extractExcelText(fileBuffer);
          rawText = extractedCsv + '\n' + rawText;
        }
        // 3. Plain text / CSV
        else {
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

    // 2. Fetch user's categories, saved rules, and settings for AI context
    const [categories, smsRules, userSettings] = await Promise.all([
      prisma.category.findMany({
        where: { userId, isActive: true },
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
      prisma.userSettings.findFirst({
        where: { userId },
        select: { aiProvider: true },
      }),
    ]);

    const provider = userSettings?.aiProvider || 'local';
    const activeAiConfig = getAiConfig(provider);

    const rulesPrompt = smsRules
      .map((r) => `- "${r.identifier}" (${r.label})${r.aiNote ? `: ${r.aiNote}` : ''}`)
      .join('\n');

    let dateFilterInstruction = '';
    if (startDate && endDate) {
      dateFilterInstruction = `CRITICAL DATE FILTER: ONLY extract transactions between ${startDate} and ${endDate} (inclusive). Completely ignore any transactions before ${startDate} or after ${endDate}.`;
    } else if (startDate) {
      dateFilterInstruction = `CRITICAL DATE FILTER: ONLY extract transactions dated on or after ${startDate}. Completely ignore any transactions before ${startDate}.`;
    } else if (endDate) {
      dateFilterInstruction = `CRITICAL DATE FILTER: ONLY extract transactions dated on or before ${endDate}. Completely ignore any transactions after ${endDate}.`;
    }

    // 3. Intelligent Chunking for large text (handles 3 months or a full year of transactions)
    // 3. Intelligent Chunking:
    // If statement is <= 160 lines, process in 1 prompt to preserve full table headers.
    // If larger, split with 5 lines of overlap so multi-line transactions across boundaries are never lost.
    const allLines = processedText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const CHUNK_SIZE = 120;
    const OVERLAP = 5;
    const chunks: string[] = [];

    if (allLines.length <= 160) {
      chunks.push(processedText);
    } else {
      for (let i = 0; i < allLines.length; i += CHUNK_SIZE) {
        const start = Math.max(0, i - (i > 0 ? OVERLAP : 0));
        const end = Math.min(allLines.length, i + CHUNK_SIZE);
        chunks.push(allLines.slice(start, end).join('\n'));
      }
    }

    console.log(
      '[Statement Upload] Total lines: %d. Processing in %d chunk(s) using %s (%s)...',
      allLines.length,
      chunks.length,
      activeAiConfig.name,
      activeAiConfig.model
    );

    let rawExtractedList: any[] = [];
    let lastAiError: string | null = null;

    // For local Ollama on CPU, process 1 at a time to avoid CPU contention.
    // For Nvidia Cloud, process 2 at a time.
    const batchSize = provider === 'local' ? 1 : 2;

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map((chunk) =>
          parseChunkWithAi(
            chunk,
            categories,
            rulesPrompt,
            accountId,
            dateFilterInstruction,
            provider
          )
        )
      );

      for (const res of batchResults) {
        if (res.error) {
          lastAiError = res.error;
        }
        if (res.transactions && res.transactions.length > 0) {
          rawExtractedList.push(...res.transactions);
        }
      }
    }

    // Deduplicate any overlapping chunk extractions
    const seen = new Set<string>();
    const extractedList: any[] = [];
    for (const tx of rawExtractedList) {
      const key = `${tx.date || ''}_${tx.amount || 0}_${(tx.description || '').trim().toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        extractedList.push(tx);
      }
    }

    console.log('[Statement Upload] Total extracted transactions by AI: %d', extractedList.length);

    if (extractedList.length === 0) {
      if (lastAiError) {
        return NextResponse.json(
          {
            error: `AI processing failed: ${lastAiError}. Please verify that your AI engine is reachable, or switch between Local Ollama / Nvidia Cloud at the top of the AI Inbox.`,
          },
          { status: 502 }
        );
      }

      let notFoundMsg = 'No transactions found in the provided text.';
      if (startDate || endDate) {
        notFoundMsg = `No transactions found matching the date range filter (${startDate || 'any'} to ${endDate || 'any'}). Try clearing the From/To Date filter.`;
      } else {
        notFoundMsg = 'No transactions could be identified in the text. Please ensure the document or pasted text contains transaction rows with dates and amounts, or switch AI engine.';
      }

      return NextResponse.json({
        success: true,
        count: 0,
        message: notFoundMsg,
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

    console.log('[Statement Upload] Successfully saved %d InboxEvents', createdEvents.length);

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
