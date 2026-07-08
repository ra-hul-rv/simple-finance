import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '@/lib/prisma';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validatedData = registerSchema.parse(body);

    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(validatedData.password, 12);

    const user = await prisma.user.create({
      data: {
        name: validatedData.name,
        email: validatedData.email,
        passwordHash,
        settings: {
          create: {
            currency: 'INR',
            dateFormat: 'dd/MM/yyyy',
            locale: 'en-IN',
            theme: 'system',
          },
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    // Create default categories
    const defaultCategories = [
      { name: 'Food & Dining', type: 'EXPENSE' as const, icon: 'utensils', color: '#f97316', order: 1 },
      { name: 'Transportation', type: 'EXPENSE' as const, icon: 'car', color: '#3b82f6', order: 2 },
      { name: 'Shopping', type: 'EXPENSE' as const, icon: 'shopping-bag', color: '#ec4899', order: 3 },
      { name: 'Utilities', type: 'EXPENSE' as const, icon: 'zap', color: '#eab308', order: 4 },
      { name: 'Entertainment', type: 'EXPENSE' as const, icon: 'film', color: '#8b5cf6', order: 5 },
      { name: 'Healthcare', type: 'EXPENSE' as const, icon: 'heart-pulse', color: '#ef4444', order: 6 },
      { name: 'Education', type: 'EXPENSE' as const, icon: 'graduation-cap', color: '#06b6d4', order: 7 },
      { name: 'Housing', type: 'EXPENSE' as const, icon: 'home', color: '#14b8a6', order: 8 },
      { name: 'Insurance', type: 'EXPENSE' as const, icon: 'shield', color: '#64748b', order: 9 },
      { name: 'Personal Care', type: 'EXPENSE' as const, icon: 'sparkles', color: '#d946ef', order: 10 },
      { name: 'Subscriptions', type: 'EXPENSE' as const, icon: 'repeat', color: '#7c3aed', order: 11 },
      { name: 'Travel', type: 'EXPENSE' as const, icon: 'plane', color: '#0ea5e9', order: 12 },
      { name: 'Gifts & Donations', type: 'EXPENSE' as const, icon: 'gift', color: '#f43f5e', order: 13 },
      { name: 'Others', type: 'EXPENSE' as const, icon: 'more-horizontal', color: '#94a3b8', order: 14 },
      { name: 'Salary', type: 'INCOME' as const, icon: 'briefcase', color: '#22c55e', order: 1 },
      { name: 'Freelancing', type: 'INCOME' as const, icon: 'laptop', color: '#3b82f6', order: 2 },
      { name: 'Business', type: 'INCOME' as const, icon: 'building-2', color: '#8b5cf6', order: 3 },
      { name: 'Investments', type: 'INCOME' as const, icon: 'trending-up', color: '#14b8a6', order: 4 },
      { name: 'Interest', type: 'INCOME' as const, icon: 'percent', color: '#f59e0b', order: 5 },
      { name: 'Dividends', type: 'INCOME' as const, icon: 'coins', color: '#eab308', order: 6 },
      { name: 'Rental Income', type: 'INCOME' as const, icon: 'home', color: '#06b6d4', order: 7 },
      { name: 'Cashback', type: 'INCOME' as const, icon: 'arrow-down-left', color: '#22d3ee', order: 8 },
      { name: 'Bonus', type: 'INCOME' as const, icon: 'star', color: '#f97316', order: 9 },
      { name: 'Refund', type: 'INCOME' as const, icon: 'undo-2', color: '#64748b', order: 10 },
      { name: 'Gift', type: 'INCOME' as const, icon: 'gift', color: '#ec4899', order: 11 },
      { name: 'Other Income', type: 'INCOME' as const, icon: 'plus-circle', color: '#94a3b8', order: 12 },
    ];

    await prisma.category.createMany({
      data: defaultCategories.map((cat) => ({
        ...cat,
        userId: user.id,
        isDefault: true,
      })),
    });

    return NextResponse.json(
      { message: 'Account created successfully', user },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
