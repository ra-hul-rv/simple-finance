import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Missing or invalid Bearer token' }, { status: 401 });
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

    // Read payload
    const payload = await request.json();
    let upiMatchInfo: any = null;

    // Check if payload contains upiId or upi_id or upi
    const rawUpiId = payload.upiId || payload.upi_id || payload.upi;

    if (rawUpiId && typeof rawUpiId === 'string' && rawUpiId.trim().length > 0) {
      const cleanUpiId = rawUpiId.trim().toLowerCase();

      // Lookup UPI template
      const matchedTpl = await prisma.upiTemplate.findUnique({
        where: {
          userId_upiId: {
            userId,
            upiId: cleanUpiId,
          },
        },
      });

      if (matchedTpl) {
        // Increment usage count
        await prisma.upiTemplate.update({
          where: { id: matchedTpl.id },
          data: {
            usageCount: { increment: 1 },
            lastUsedAt: new Date(),
          },
        });

        upiMatchInfo = {
          matched: true,
          templateId: matchedTpl.id,
          title: matchedTpl.title,
          categoryId: matchedTpl.categoryId,
          accountId: matchedTpl.accountId,
          merchant: matchedTpl.merchant || payload.merchant,
          location: matchedTpl.location || payload.location,
          type: matchedTpl.type,
        };
      } else {
        // Auto-create new UPI template so user can edit it in Templates page
        const merchantName = payload.merchant || payload.title || cleanUpiId;
        const newTpl = await prisma.upiTemplate.create({
          data: {
            userId,
            upiId: cleanUpiId,
            title: String(merchantName).trim(),
            type: payload.type === 'INCOME' ? 'INCOME' : 'EXPENSE',
            merchant: payload.merchant ? String(payload.merchant).trim() : null,
            description: payload.description ? String(payload.description).trim() : `Auto-created from n8n SMS webhook`,
            autoCreated: true,
            usageCount: 1,
            lastUsedAt: new Date(),
          },
        });

        upiMatchInfo = {
          matched: false,
          autoCreated: true,
          templateId: newTpl.id,
          title: newTpl.title,
        };
      }
    }

    // Merge match info into payload
    const enrichedPayload = {
      ...payload,
      _upiMatch: upiMatchInfo,
    };

    // Create inbox event
    const inboxEvent = await prisma.inboxEvent.create({
      data: {
        userId,
        source: 'n8n_mail',
        payload: enrichedPayload,
        status: 'PENDING'
      }
    });

    return NextResponse.json({
      success: true,
      eventId: inboxEvent.id,
      upiMatch: upiMatchInfo,
    }, { status: 201 });
  } catch (error) {
    console.error('N8n Webhook Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
