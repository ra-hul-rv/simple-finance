import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const transactionSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  type: z.enum([
    'INCOME',
    'EXPENSE',
    'TRANSFER',
    'INVESTMENT',
    'CREDIT_CARD_PAYMENT',
    'REFUND',
    'INTEREST',
    'DIVIDEND',
  ]),
  date: z.string().transform((str) => new Date(str)),
  description: z.string().min(1, 'Description is required'),
  merchant: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  flowType: z.string().optional().nullable(),
  accountId: z.string().uuid('Invalid account ID'),
  categoryId: z.string().uuid('Invalid category ID').optional().nullable(),
  transferToAccountId: z.string().uuid('Invalid destination account ID').optional().nullable(),
  personId: z.string().uuid('Invalid person ID').optional().nullable(),
  splitCount: z.number().int().min(1).optional().nullable(),
  splitType: z.enum(['MULTIPLY', 'DIVIDE']).optional().nullable(),
  isLending: z.boolean().optional().default(false),
  tags: z.array(z.string()).optional().default([]),
});

async function syncCreditCardBalances(accountId: string, prismaClient: any) {
  const card = await prismaClient.creditCard.findUnique({
    where: { accountId },
  });

  if (!card) return;

  const account = await prismaClient.account.findUnique({
    where: { id: accountId },
  });

  if (!account) return;

  const outstanding = Math.max(0, -Number(account.balance));
  const available = Math.max(0, Number(card.creditLimit) - outstanding);

  await prismaClient.creditCard.update({
    where: { id: card.id },
    data: {
      outstandingBalance: outstanding,
      availableCredit: available,
    },
  });
}

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const accountId = searchParams.get('accountId');
    const categoryId = searchParams.get('categoryId');
    const tagId = searchParams.get('tagId');
    const search = searchParams.get('search');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const allowedSortFields = ['date', 'amount', 'description', 'createdAt'];
    const rawSortBy = searchParams.get('sortBy') || 'date';
    const sortBy = allowedSortFields.includes(rawSortBy) ? rawSortBy : 'date';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const whereClause: any = {
      userId: session.user.id,
    };

    if (type) whereClause.type = type;
    if (accountId) whereClause.accountId = accountId;
    if (categoryId) whereClause.categoryId = categoryId;
    if (search) {
      whereClause.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { merchant: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (startDate || endDate) {
      whereClause.date = {};
      if (startDate) whereClause.date.gte = new Date(startDate);
      if (endDate) whereClause.date.lte = new Date(endDate);
    }

    if (tagId) {
      whereClause.tags = {
        some: { tagId },
      };
    }

    const [transactions, totalCount] = await prisma.$transaction([
      prisma.transaction.findMany({
        where: whereClause,
        include: {
          account: true,
          category: {
            include: {
              parent: {
                include: {
                  parent: true,
                },
              },
            },
          },
          transferToAccount: true,
          attachments: true,
          tags: {
            include: {
              tag: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.transaction.count({ where: whereClause }),
    ]);

    const formatted = transactions.map((tx: any) => ({
      ...tx,
      amount: Number(tx.amount),
      account: { ...tx.account, balance: Number(tx.account.balance) },
      category: tx.category ? { ...tx.category, budgetAmount: tx.category.budgetAmount ? Number(tx.category.budgetAmount) : null } : null,
      transferToAccount: tx.transferToAccount ? { ...tx.transferToAccount, balance: Number(tx.transferToAccount.balance) } : null,
      tags: tx.tags?.map((tt: any) => tt.tag) || [],
    }));

    return NextResponse.json({
      transactions: formatted,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
      },
    });
  } catch (error) {
    console.error('Failed to get transactions:', error);
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
    const validated = transactionSchema.parse(body);

    // Evaluate TRANSACTION_CREATED active rules
    const activeRules = await prisma.automationRule.findMany({
      where: {
        userId: session.user.id,
        triggerType: 'TRANSACTION_CREATED',
        isActive: true,
      },
    });

    for (const rule of activeRules) {
      const conditions = (rule.conditions || []) as any[];
      let allMatch = true;

      for (const cond of conditions) {
        const { field, operator, value } = cond;
        let fieldValue: any = null;

        if (field === 'description') fieldValue = validated.description;
        else if (field === 'accountId') fieldValue = validated.accountId;
        else if (field === 'amount') fieldValue = validated.amount;
        else if (field === 'type') fieldValue = validated.type;

        if (fieldValue === null || fieldValue === undefined) {
          allMatch = false;
          break;
        }

        if (field === 'description') {
          const valStr = String(value).toLowerCase();
          const fieldStr = String(fieldValue).toLowerCase();
          if (operator === 'contains') {
            if (!fieldStr.includes(valStr)) allMatch = false;
          } else if (operator === 'equals') {
            if (fieldStr !== valStr) allMatch = false;
          }
        } else if (field === 'accountId' || field === 'type') {
          if (String(fieldValue) !== String(value)) allMatch = false;
        } else if (field === 'amount') {
          const valNum = Number(value);
          const fieldNum = Number(fieldValue);
          if (operator === 'gt' && !(fieldNum > valNum)) allMatch = false;
          else if (operator === 'lt' && !(fieldNum < valNum)) allMatch = false;
          else if (operator === 'equals' && !(fieldNum === valNum)) allMatch = false;
        }
      }

      if (allMatch && conditions.length > 0) {
        const actions = (rule.actions || []) as any[];
        for (const action of actions) {
          const { type, value } = action;
          if (type === 'setCategory') {
            validated.categoryId = value;
          } else if (type === 'setDescription') {
            validated.description = value;
          }
        }
      }
    }

    // Run transaction and account balance updates in an atomic Prisma transaction
    const transaction = await prisma.$transaction(async (tx: any) => {
      // 1. Create the transaction record
      const createdTx = await tx.transaction.create({
        data: {
          amount: validated.amount,
          type: validated.type,
          flowType: validated.flowType || null,
          date: validated.date,
          description: validated.description,
          merchant: validated.merchant,
          location: validated.location,
          notes: validated.notes,
          accountId: validated.accountId,
          categoryId: validated.categoryId || null,
          transferToAccountId: validated.transferToAccountId || null,
          personId: validated.personId || null,
          splitCount: validated.splitCount || null,
          splitType: validated.splitType || null,
          userId: session.user.id,
        },
      });

      // 2. Update Account balances
      const account = await tx.account.findUnique({
        where: { id: validated.accountId },
      });

      if (!account) {
        throw new Error('Source account not found');
      }

      if (validated.type === 'INCOME' || validated.type === 'REFUND' || validated.type === 'INTEREST' || validated.type === 'DIVIDEND') {
        await tx.account.update({
          where: { id: validated.accountId },
          data: { balance: { increment: validated.amount } },
        });
      } else if (validated.type === 'EXPENSE' || validated.type === 'INVESTMENT') {
        await tx.account.update({
          where: { id: validated.accountId },
          data: { balance: { decrement: validated.amount } },
        });
      } else if (validated.type === 'TRANSFER' || validated.type === 'CREDIT_CARD_PAYMENT') {
        if (!validated.transferToAccountId) {
          throw new Error('Destination account is required for transfers');
        }

        const destAccount = await tx.account.findUnique({
          where: { id: validated.transferToAccountId },
        });

        if (!destAccount) {
          throw new Error('Destination account not found');
        }

        // Decrement source
        await tx.account.update({
          where: { id: validated.accountId },
          data: { balance: { decrement: validated.amount } },
        });

        // Increment destination
        await tx.account.update({
          where: { id: validated.transferToAccountId },
          data: { balance: { increment: validated.amount } },
        });
      }

      // 3. Update budget spent amount for current month if it's an EXPENSE
      if (validated.type === 'EXPENSE' && validated.categoryId) {
        const txMonth = validated.date.getMonth() + 1;
        const txYear = validated.date.getFullYear();

        const budget = await tx.budget.findFirst({
          where: {
            userId: session.user.id,
            categoryId: validated.categoryId,
            month: txMonth,
            year: txYear,
          },
        });

        if (budget) {
          await tx.budget.update({
            where: { id: budget.id },
            data: { spent: { increment: validated.amount } },
          });
        }
      }

      // 4. Auto-create Loan if isLending is true
      if (validated.isLending && validated.personId) {
        const person = await tx.person.findUnique({ where: { id: validated.personId } });
        if (person) {
          const loan = await tx.loan.create({
            data: {
              borrowerName: person.name,
              totalLent: validated.amount,
              outstandingBalance: validated.amount,
              status: 'ACTIVE',
              userId: session.user.id,
              personId: person.id,
              accountId: validated.accountId,
            }
          });
          
          await tx.transaction.update({
            where: { id: createdTx.id },
            data: { loanId: loan.id }
          });
        }
      }

      await syncCreditCardBalances(validated.accountId, tx);
      if (validated.transferToAccountId) {
        await syncCreditCardBalances(validated.transferToAccountId, tx);
      }

      // 5. Create tag associations
      if (validated.tags && validated.tags.length > 0) {
        await tx.transactionTag.createMany({
          data: validated.tags.map((tagId: string) => ({
            transactionId: createdTx.id,
            tagId,
          })),
          skipDuplicates: true,
        });
      }

      return createdTx;
    });

    return NextResponse.json({
      ...transaction,
      amount: Number(transaction.amount),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    console.error('Failed to create transaction:', error);
    return NextResponse.json({ error: (error as any).message || 'Internal Server Error' }, { status: 500 });
  }
}
