import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const emiSchema = z.object({
  itemName: z.string().min(1, 'Item name is required'),
  totalAmount: z.number().min(0.01),
  totalMonths: z.number().min(1),
  principalAmount: z.number().min(0.01, 'Principal amount is required'),
  interestAmount: z.number().optional().nullable(),
  taxOnInterest: z.number().optional().nullable(),
  processingFee: z.number().optional().nullable(),
  taxOnProcessingFee: z.number().optional().nullable(),
  billingDate: z.number().min(1).max(31),
  startDate: z.string(),
  accountId: z.string().uuid(),
  personId: z.string().uuid().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const allowedSortFields = ['startDate', 'totalAmount', 'itemName', 'createdAt'];
    const rawSortBy = searchParams.get('sortBy') || 'createdAt';
    const sortBy = allowedSortFields.includes(rawSortBy) ? rawSortBy : 'createdAt';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';

    const emis = await prisma.emi.findMany({
      where: { userId: session.user.id },
      include: {
        account: true,
        person: true,
        payments: {
          orderBy: { monthNumber: 'asc' }
        }
      },
      orderBy: { [sortBy]: sortOrder },
    });

    const formatted = emis.map((emi: any) => ({
      ...emi,
      totalAmount: Number(emi.totalAmount),
      principalAmount: emi.principalAmount ? Number(emi.principalAmount) : null,
      interestAmount: emi.interestAmount ? Number(emi.interestAmount) : null,
      taxOnInterest: emi.taxOnInterest ? Number(emi.taxOnInterest) : null,
      processingFee: emi.processingFee ? Number(emi.processingFee) : null,
      taxOnProcessingFee: emi.taxOnProcessingFee ? Number(emi.taxOnProcessingFee) : null,
      payments: emi.payments.map((p: any) => ({
        ...p,
        amount: Number(p.amount)
      }))
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Failed to get emis:', error);
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
    const validated = emiSchema.parse(body);

    const start = new Date(validated.startDate);

    const result = await prisma.$transaction(async (tx) => {
      // Create the EMI
      const emi = await tx.emi.create({
        data: {
          ...validated,
          userId: session.user.id,
          startDate: start,
        },
      });

      // Generate payments
      const payments = [];
      
      const principal = validated.principalAmount;
      const interest = validated.interestAmount || 0;
      const taxOnInterest = validated.taxOnInterest || 0;
      
      // Total monthly base is (Principal + Interest + Tax)
      const monthlyBase = principal + interest + taxOnInterest;

      for (let i = 1; i <= validated.totalMonths; i++) {
        let amount = monthlyBase;
        if (i === 1) {
          if (validated.processingFee) amount += validated.processingFee;
          if (validated.taxOnProcessingFee) amount += validated.taxOnProcessingFee;
        }

        // Calculate next due date correctly
        const dueDate = new Date(start);
        dueDate.setMonth(dueDate.getMonth() + (i - 1));
        dueDate.setDate(validated.billingDate);

        payments.push({
          emiId: emi.id,
          monthNumber: i,
          dueDate,
          amount,
          isFirstMonth: i === 1,
        });
      }

      await tx.emiPayment.createMany({
        data: payments,
      });

      // Create initial purchase transaction
      await tx.transaction.create({
        data: {
          amount: validated.totalAmount,
          type: 'EXPENSE',
          date: start,
          description: `EMI Purchase: ${validated.itemName}`,
          notes: validated.notes,
          accountId: validated.accountId,
          personId: validated.personId || null,
          userId: session.user.id,
        },
      });

      // Decrement the account balance
      await tx.account.update({
        where: { id: validated.accountId },
        data: { balance: { decrement: validated.totalAmount } },
      });

      return await tx.emi.findUnique({
        where: { id: emi.id },
        include: { payments: true }
      });
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    console.error('Failed to create emi:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
