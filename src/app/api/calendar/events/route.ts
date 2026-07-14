import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { addDays, addMonths, addWeeks, addYears, isAfter, isBefore, isEqual, parseISO, startOfDay } from 'date-fns';

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    if (!startDateParam || !endDateParam) {
      return NextResponse.json({ error: 'startDate and endDate are required' }, { status: 400 });
    }

    const start = startOfDay(parseISO(startDateParam));
    const end = startOfDay(parseISO(endDateParam));

    const events: any[] = [];

    // 1. Fetch Transactions
    const transactions = await prisma.transaction.findMany({
      where: {
        userId: session.user.id,
        date: { gte: start, lte: end },
      },
      include: {
        account: true,
        category: true,
      },
    });

    transactions.forEach(tx => {
      events.push({
        id: `tx-${tx.id}`,
        type: 'TRANSACTION',
        date: tx.date.toISOString(),
        title: tx.description || 'Transaction',
        amount: Number(tx.amount),
        flowType: tx.type === 'INCOME' ? 'INCOME' : tx.type === 'EXPENSE' ? 'EXPENSE' : 'TRANSFER',
        data: tx,
      });
    });

    // 2. Fetch Fixed Deposits maturing in this range
    const fds = await prisma.fixedDeposit.findMany({
      where: {
        userId: session.user.id,
        maturityDate: { gte: start, lte: end },
      },
    });

    fds.forEach(fd => {
      events.push({
        id: `fd-${fd.id}`,
        type: 'FIXED_DEPOSIT',
        date: fd.maturityDate.toISOString(),
        title: `${fd.bankName} FD Maturity`,
        amount: Number(fd.maturityAmount),
        flowType: 'INCOME', // Technically cash incoming or rolling over
        color: '#f59e0b',
        data: fd,
      });
    });

    // 3. Fetch Active Recurring Transactions and Project
    const recurrings = await prisma.recurringTransaction.findMany({
      where: {
        userId: session.user.id,
        isActive: true,
        startDate: { lte: end },
      },
    });

    recurrings.forEach(rt => {
      let current = startOfDay(new Date(rt.startDate));
      
      // Fast forward current to start of window
      while (isBefore(current, start)) {
        if (rt.frequency === 'DAILY') current = addDays(current, 1);
        else if (rt.frequency === 'WEEKLY') current = addWeeks(current, 1);
        else if (rt.frequency === 'MONTHLY') current = addMonths(current, 1);
        else if (rt.frequency === 'YEARLY') current = addYears(current, 1);
        else break;
      }

      // Generate occurrences in window
      while ((isBefore(current, end) || isEqual(current, end)) && (!rt.endDate || isBefore(current, rt.endDate) || isEqual(current, rt.endDate))) {
        events.push({
          id: `rt-${rt.id}-${current.toISOString()}`,
          type: 'RECURRING',
          date: current.toISOString(),
          title: rt.name,
          amount: Number(rt.amount),
          flowType: rt.type === 'INCOME' ? 'INCOME' : 'EXPENSE',
          color: '#8b5cf6',
          data: rt,
        });

        if (rt.frequency === 'DAILY') current = addDays(current, 1);
        else if (rt.frequency === 'WEEKLY') current = addWeeks(current, 1);
        else if (rt.frequency === 'MONTHLY') current = addMonths(current, 1);
        else if (rt.frequency === 'YEARLY') current = addYears(current, 1);
        else break;
      }
    });

    // 4. Fetch Active Subscriptions and Project
    const subscriptions = await prisma.subscription.findMany({
      where: {
        userId: session.user.id,
        status: 'ACTIVE',
      },
    });

    subscriptions.forEach(sub => {
      let current = startOfDay(new Date(sub.renewalDate));
      
      // Fast forward current to start of window
      while (isBefore(current, start)) {
        current = addMonths(current, 1); // Assume monthly for subscriptions
      }

      // Generate occurrences in window
      while (isBefore(current, end) || isEqual(current, end)) {
        events.push({
          id: `sub-${sub.id}-${current.toISOString()}`,
          type: 'SUBSCRIPTION',
          date: current.toISOString(),
          title: sub.service,
          amount: Number(sub.monthlyCost),
          flowType: 'EXPENSE',
          color: sub.color || '#ec4899',
          data: sub,
        });

        current = addMonths(current, 1);
      }
    });

    // Sort events by date
    events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return NextResponse.json(events);
  } catch (error) {
    console.error('Failed to get calendar events:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
