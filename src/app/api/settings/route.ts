import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import * as z from 'zod';

const settingsSchema = z.object({
  currency: z.string().min(1),
  dateFormat: z.string().min(1),
  locale: z.string().min(1),
  theme: z.string().min(1),
  showDashboardCharts: z.boolean().optional(),
  showAccountsCharts: z.boolean().optional(),
  showBillsCharts: z.boolean().optional(),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let settings = await prisma.userSettings.findUnique({
      where: { userId: session.user.id },
    });

    // Create defaults if not found
    if (!settings) {
      settings = await prisma.userSettings.create({
        data: {
          userId: session.user.id,
          currency: 'INR',
          dateFormat: 'dd/MM/yyyy',
          locale: 'en-IN',
          theme: 'dark',
          showDashboardCharts: true,
          showAccountsCharts: true,
          showBillsCharts: true,
        },
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Failed to get settings:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = settingsSchema.parse(body);

    const settings = await prisma.userSettings.upsert({
      where: { userId: session.user.id },
      update: validated,
      create: {
        ...validated,
        userId: session.user.id,
      },
    });

    return NextResponse.json(settings);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    console.error('Failed to update settings:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
