import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    
    let newToken: string;
    
    // Check if a custom token was provided in the body
    try {
      const body = await request.json();
      if (body.token && typeof body.token === 'string' && body.token.trim().length > 0) {
        newToken = body.token.trim();
      } else {
        newToken = crypto.randomBytes(16).toString('hex');
      }
    } catch {
      // No body or invalid JSON — auto-generate
      newToken = crypto.randomBytes(16).toString('hex');
    }

    const updatedSettings = await prisma.userSettings.upsert({
      where: { userId },
      update: { webhookToken: newToken },
      create: {
        userId,
        webhookToken: newToken,
      },
    });

    return NextResponse.json({ token: updatedSettings.webhookToken });
  } catch (error) {
    console.error('Error generating webhook token:', error);
    return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 });
  }
}
