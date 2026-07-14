import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const events = await prisma.inboxEvent.findMany({
      where: { 
        userId: session.user.id,
        status: 'PENDING'
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(events);
  } catch (error) {
    console.error('Failed to get inbox events:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
