import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seedUser(email: string, name: string, passwordHash: string) {
  console.log(`Seeding data for ${email}...`);

  // Create user
  const user = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      settings: {
        create: {
          currency: 'INR',
          dateFormat: 'dd/MM/yyyy',
          locale: 'en-IN',
          theme: 'dark',
        },
      },
    },
  });

  // Seed Categories
  const categories = [
    // Income
    { name: 'Salary', type: 'INCOME' as const, icon: 'briefcase', color: '#10b981', order: 1 },
    { name: 'Freelancing', type: 'INCOME' as const, icon: 'laptop', color: '#3b82f6', order: 2 },
    { name: 'Investments Return', type: 'INCOME' as const, icon: 'trending-up', color: '#06b6d4', order: 3 },
    { name: 'Other Income', type: 'INCOME' as const, icon: 'plus-circle', color: '#6b7280', order: 4 },
    // Expense
    { name: 'Housing & Rent', type: 'EXPENSE' as const, icon: 'home', color: '#ef4444', order: 1, budgetAmount: 25000 },
    { name: 'Food & Dining', type: 'EXPENSE' as const, icon: 'utensils', color: '#f97316', order: 2, budgetAmount: 12000 },
    { name: 'Transportation', type: 'EXPENSE' as const, icon: 'car', color: '#eab308', order: 3, budgetAmount: 5000 },
    { name: 'Utilities & Bills', type: 'EXPENSE' as const, icon: 'zap', color: '#8b5cf6', order: 4, budgetAmount: 8000 },
    { name: 'Shopping', type: 'EXPENSE' as const, icon: 'shopping-bag', color: '#ec4899', order: 5, budgetAmount: 10000 },
    { name: 'Entertainment', type: 'EXPENSE' as const, icon: 'film', color: '#d946ef', order: 6, budgetAmount: 4000 },
    { name: 'Healthcare', type: 'EXPENSE' as const, icon: 'heart', color: '#14b8a6', order: 7, budgetAmount: 3000 },
    { name: 'Education', type: 'EXPENSE' as const, icon: 'graduation-cap', color: '#06b6d4', order: 8, budgetAmount: 2000 },
    { name: 'Others', type: 'EXPENSE' as const, icon: 'help-circle', color: '#6b7280', order: 9, budgetAmount: 5000 },
  ];

  const seededCategories = [];
  for (const cat of categories) {
    const seeded = await prisma.category.create({
      data: {
        ...cat,
        userId: user.id,
        isDefault: true,
      },
    });
    seededCategories.push(seeded);
  }

  // Seed Accounts
  const hdfc = await prisma.account.create({
    data: {
      name: 'HDFC Savings Account',
      type: 'SAVINGS',
      institution: 'HDFC Bank',
      accountNumber: 'XXXXXX5892',
      balance: 154300.00,
      openingBalance: 120000.00,
      currency: 'INR',
      interestRate: 3.5,
      color: '#1e3a8a',
      icon: 'wallet',
      userId: user.id,
    },
  });

  const cash = await prisma.account.create({
    data: {
      name: 'Cash Wallet',
      type: 'CASH',
      institution: 'Physical Cash',
      balance: 8500.00,
      openingBalance: 5000.00,
      currency: 'INR',
      color: '#16a34a',
      icon: 'banknote',
      userId: user.id,
    },
  });

  const iciciCc = await prisma.account.create({
    data: {
      name: 'ICICI Credit Card',
      type: 'CREDIT_CARD',
      institution: 'ICICI Bank',
      accountNumber: 'XXXXXX4820',
      balance: -24800.00,
      openingBalance: -15000.00,
      currency: 'INR',
      creditLimit: 200000.00,
      dueDate: 15,
      color: '#ea580c',
      icon: 'credit-card',
      userId: user.id,
    },
  });

  await prisma.creditCard.create({
    data: {
      cardName: 'ICICI Amazon Pay',
      lastFourDigits: '4820',
      creditLimit: 200000.00,
      outstandingBalance: 24800.00,
      availableCredit: 175200.00,
      dueDate: 15,
      statementDate: 25,
      minimumDue: 1240.00,
      interestRate: 42.0,
      rewardsBalance: 1540.00,
      color: '#ea580c',
      accountId: iciciCc.id,
      userId: user.id,
    },
  });

  const zerodha = await prisma.account.create({
    data: {
      name: 'Zerodha Demat',
      type: 'STOCKS',
      institution: 'Zerodha',
      accountNumber: 'ZERA8291',
      balance: 345000.00,
      openingBalance: 300000.00,
      currency: 'INR',
      color: '#0284c7',
      icon: 'trending-up',
      userId: user.id,
    },
  });

  const sbiFd = await prisma.account.create({
    data: {
      name: 'SBI Fixed Deposit',
      type: 'FIXED_DEPOSIT',
      institution: 'State Bank of India',
      accountNumber: 'FD92048',
      balance: 100000.00,
      openingBalance: 100000.00,
      currency: 'INR',
      interestRate: 6.5,
      color: '#4f46e5',
      icon: 'landmark',
      userId: user.id,
    },
  });

  await prisma.fixedDeposit.create({
    data: {
      bankName: 'State Bank of India',
      principal: 100000.00,
      interestRate: 6.5,
      startDate: new Date('2026-01-01'),
      maturityDate: new Date('2027-01-01'),
      interestEarned: 3250.00,
      maturityAmount: 106500.00,
      autoRenewal: false,
      notes: 'Emergency reserve FD',
      userId: user.id,
    },
  });

  // Seed Budgets
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  for (const cat of seededCategories) {
    if (cat.type === 'EXPENSE' && cat.budgetAmount) {
      await prisma.budget.create({
        data: {
          amount: cat.budgetAmount,
          spent: 0.00,
          month: currentMonth,
          year: currentYear,
          categoryId: cat.id,
          userId: user.id,
        },
      });
    }
  }

  // Seed Subscriptions
  await prisma.subscription.create({
    data: {
      service: 'Netflix Premium',
      monthlyCost: 649.00,
      annualCost: 7788.00,
      renewalDate: new Date('2026-07-20'),
      status: 'ACTIVE',
      description: 'Ultra HD Streaming',
      url: 'https://netflix.com',
      icon: 'tv',
      color: '#e50914',
      accountId: iciciCc.id,
      categoryId: seededCategories.find(c => c.name === 'Entertainment')?.id,
      userId: user.id,
    },
  });

  await prisma.subscription.create({
    data: {
      service: 'Spotify Premium',
      monthlyCost: 119.00,
      annualCost: 1428.00,
      renewalDate: new Date('2026-07-15'),
      status: 'ACTIVE',
      description: 'Ad-free Music',
      url: 'https://spotify.com',
      icon: 'music',
      color: '#1ed760',
      accountId: iciciCc.id,
      categoryId: seededCategories.find(c => c.name === 'Entertainment')?.id,
      userId: user.id,
    },
  });

  // Seed Investments
  await prisma.investment.create({
    data: {
      name: 'NIFTY 50 Index Fund',
      type: 'MUTUAL_FUNDS',
      investedAmount: 200000.00,
      currentValue: 228400.00,
      units: 1245.829,
      purchaseDate: new Date('2025-06-15'),
      platform: 'Zerodha Coin',
      notes: 'Long term retirement portfolio',
      userId: user.id,
    },
  });

  await prisma.investment.create({
    data: {
      name: 'Bitcoin (BTC)',
      type: 'CRYPTO',
      investedAmount: 50000.00,
      currentValue: 62450.00,
      units: 0.0125,
      purchaseDate: new Date('2026-02-10'),
      platform: 'WazirX',
      notes: 'Speculative asset',
      userId: user.id,
    },
  });

  // Seed Transactions
  const salaryCat = seededCategories.find(c => c.name === 'Salary');
  const rentCat = seededCategories.find(c => c.name === 'Housing & Rent');
  const foodCat = seededCategories.find(c => c.name === 'Food & Dining');
  const utilitiesCat = seededCategories.find(c => c.name === 'Utilities & Bills');
  const transportCat = seededCategories.find(c => c.name === 'Transportation');
  const shoppingCat = seededCategories.find(c => c.name === 'Shopping');
  const freelanceCat = seededCategories.find(c => c.name === 'Freelancing');

  const now = new Date();
  const transactionsData = [
    {
      date: new Date(now.getFullYear(), now.getMonth(), 1),
      amount: 95000.00,
      type: 'INCOME' as const,
      description: 'Monthly Salary Credit',
      merchant: 'HDFC Corp',
      accountId: hdfc.id,
      categoryId: salaryCat?.id,
    },
    {
      date: new Date(now.getFullYear(), now.getMonth(), 12),
      amount: 18000.00,
      type: 'INCOME' as const,
      description: 'Web Design Freelance Project',
      merchant: 'Acme Client',
      accountId: hdfc.id,
      categoryId: freelanceCat?.id,
    },
    {
      date: new Date(now.getFullYear(), now.getMonth(), 2),
      amount: 22000.00,
      type: 'EXPENSE' as const,
      description: 'House Rent payment',
      merchant: 'Landlord Sharma',
      accountId: hdfc.id,
      categoryId: rentCat?.id,
    },
    {
      date: new Date(now.getFullYear(), now.getMonth(), 5),
      amount: 3200.00,
      type: 'EXPENSE' as const,
      description: 'Electricity Bill',
      merchant: 'State Electricity board',
      accountId: hdfc.id,
      categoryId: utilitiesCat?.id,
    },
    {
      date: new Date(now.getFullYear(), now.getMonth(), 8),
      amount: 999.00,
      type: 'EXPENSE' as const,
      description: 'Broadband Bill',
      merchant: 'Airtel Fiber',
      accountId: iciciCc.id,
      categoryId: utilitiesCat?.id,
    },
    {
      date: new Date(now.getFullYear(), now.getMonth(), 3),
      amount: 1450.00,
      type: 'EXPENSE' as const,
      description: 'Weekend dinner with family',
      merchant: 'Barbeque Nation',
      accountId: iciciCc.id,
      categoryId: foodCat?.id,
    },
    {
      date: new Date(now.getFullYear(), now.getMonth(), 6),
      amount: 350.00,
      type: 'EXPENSE' as const,
      description: 'Coffee and snacks',
      merchant: 'Starbucks',
      accountId: cash.id,
      categoryId: foodCat?.id,
    },
    {
      date: new Date(now.getFullYear(), now.getMonth(), 10),
      amount: 1250.00,
      type: 'EXPENSE' as const,
      description: 'Grocery shopping',
      merchant: 'Zepto',
      accountId: hdfc.id,
      categoryId: foodCat?.id,
    },
    {
      date: new Date(now.getFullYear(), now.getMonth(), 15),
      amount: 850.00,
      type: 'EXPENSE' as const,
      description: 'Pizza delivery',
      merchant: 'Dominoes',
      accountId: iciciCc.id,
      categoryId: foodCat?.id,
    },
    {
      date: new Date(now.getFullYear(), now.getMonth(), 4),
      amount: 2500.00,
      type: 'EXPENSE' as const,
      description: 'Car Petrol refill',
      merchant: 'Shell Petrol Pump',
      accountId: iciciCc.id,
      categoryId: transportCat?.id,
    },
    {
      date: new Date(now.getFullYear(), now.getMonth(), 9),
      amount: 450.00,
      type: 'EXPENSE' as const,
      description: 'Office commute cab',
      merchant: 'Uber',
      accountId: cash.id,
      categoryId: transportCat?.id,
    },
    {
      date: new Date(now.getFullYear(), now.getMonth(), 7),
      amount: 4999.00,
      type: 'EXPENSE' as const,
      description: 'Noise Cancelling Headphones',
      merchant: 'Amazon India',
      accountId: iciciCc.id,
      categoryId: shoppingCat?.id,
    },
    {
      date: new Date(now.getFullYear(), now.getMonth(), 14),
      amount: 2400.00,
      type: 'EXPENSE' as const,
      description: 'Branded T-Shirts',
      merchant: 'Myntra',
      accountId: iciciCc.id,
      categoryId: shoppingCat?.id,
    },
    {
      date: new Date(now.getFullYear(), now.getMonth(), 20),
      amount: 5000.00,
      type: 'TRANSFER' as const,
      description: 'Transfer HDFC to Cash Wallet',
      accountId: hdfc.id,
      transferToAccountId: cash.id,
    },
  ];

  for (const tx of transactionsData) {
    await prisma.transaction.create({
      data: {
        ...tx,
        userId: user.id,
        status: 'COMPLETED',
      },
    });
  }

  // Update budget spending values based on transactions
  for (const cat of seededCategories) {
    if (cat.type === 'EXPENSE') {
      const totalSpent = transactionsData
        .filter(tx => tx.categoryId === cat.id && tx.type === 'EXPENSE')
        .reduce((sum, tx) => sum + tx.amount, 0);

      await prisma.budget.updateMany({
        where: {
          categoryId: cat.id,
          month: currentMonth,
          year: currentYear,
          userId: user.id,
        },
        data: {
          spent: totalSpent,
        },
      });
    }
  }

  // Seed Notifications
  await prisma.notification.create({
    data: {
      type: 'SUBSCRIPTION_RENEWAL',
      title: 'Subscription Renewal Alert',
      message: 'Your Netflix Premium renewal is scheduled for 20th of this month via ICICI CC.',
      isRead: false,
      userId: user.id,
    },
  });

  await prisma.notification.create({
    data: {
      type: 'BUDGET_EXCEEDED',
      title: 'Shopping Budget Alert',
      message: 'You have reached 85% of your Shopping budget for this month.',
      isRead: false,
      userId: user.id,
    },
  });
}

async function main() {
  console.log('Clearing database...');
  await prisma.auditLog.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.fixedDeposit.deleteMany({});
  await prisma.creditCard.deleteMany({});
  await prisma.investment.deleteMany({});
  await prisma.budget.deleteMany({});
  await prisma.subscription.deleteMany({});
  await prisma.transactionTag.deleteMany({});
  await prisma.tag.deleteMany({});
  await prisma.transaction.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.account.deleteMany({});
  await prisma.userSettings.deleteMany({});
  await prisma.user.deleteMany({});

  const passwordHash = await bcrypt.hash('password123', 12);

  // Seed Requested User
  await seedUser('cloudstoreme111@gmail.com', 'Cloud User', passwordHash);

  console.log('All users and statement cycles seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
