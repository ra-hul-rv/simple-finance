import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import * as z from 'zod';

const fdSchema = z.object({
  bankName: z.string().min(2, 'Bank name must be at least 2 characters'),
  principal: z.number().positive('Principal must be positive'),
  interestRate: z.number().positive('Interest rate must be positive'),
  startDate: z.string(),
  maturityDate: z.string(),
  interestEarned: z.number().nonnegative('Interest earned must be non-negative'),
  maturityAmount: z.number().positive('Maturity amount must be positive'),
  autoRenewal: z.boolean().default(false),
  notes: z.string().optional().nullable(),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const fds = await prisma.fixedDeposit.findMany({
      where: { userId: session.user.id },
      orderBy: { maturityDate: 'asc' },
    });

    const formatted = fds.map((fd: any) => ({
      ...fd,
      principal: Number(fd.principal),
      interestRate: Number(fd.interestRate),
      interestEarned: Number(fd.interestEarned),
      maturityAmount: Number(fd.maturityAmount),
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Failed to get fixed deposits:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = fdSchema.parse(body);

    const fd = await prisma.fixedDeposit.create({
      data: {
        ...validated,
        startDate: new Date(validated.startDate),
        maturityDate: new Date(validated.maturityDate),
        userId: session.user.id,
      },
    });

    return NextResponse.json({
      ...fd,
      principal: Number(fd.principal),
      interestRate: Number(fd.interestRate),
      interestEarned: Number(fd.interestEarned),
      maturityAmount: Number(fd.maturityAmount),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    console.error('Failed to create fixed deposit:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
