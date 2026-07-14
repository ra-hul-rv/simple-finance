import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import * as z from 'zod';

const updateSchema = z.object({
  status: z.enum(['PROCESSED', 'DISMISSED'])
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // In Next 15, params is a promise
    const { id } = await params;

    const body = await request.json();
    const validated = updateSchema.parse(body);

    // Verify ownership
    const existing = await prisma.inboxEvent.findUnique({
      where: { id }
    });

    if (!existing || existing.userId !== session.user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const updated = await prisma.inboxEvent.update({
      where: { id },
      data: { status: validated.status }
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    console.error('Failed to update inbox event:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
