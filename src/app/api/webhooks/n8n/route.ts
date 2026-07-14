import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Missing or invalid Bearer token' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    
    // Find user by webhook token
    const userSettings = await prisma.userSettings.findFirst({
      where: { webhookToken: token },
      include: { user: true }
    });

    if (!userSettings || !userSettings.userId) {
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    // Read payload
    const payload = await request.json();

    // Create inbox event
    const inboxEvent = await prisma.inboxEvent.create({
      data: {
        userId: userSettings.userId,
        source: 'n8n_mail',
        payload: payload,
        status: 'PENDING'
      }
    });

    return NextResponse.json({ success: true, eventId: inboxEvent.id }, { status: 201 });
  } catch (error) {
    console.error('N8n Webhook Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
