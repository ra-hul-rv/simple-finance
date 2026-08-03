// Seed script to create a WALLET account with EV Charging sub-accounts
// Run inside Docker: docker exec simple-finance-app-1 node seed_wallets.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Find the first user
  const user = await prisma.user.findFirst();
  if (!user) {
    console.error('No user found. Please create a user first.');
    process.exit(1);
  }
  console.log(`Found user: ${user.email}`);

  // Check if wallet account already exists
  const existing = await prisma.account.findFirst({
    where: { userId: user.id, type: 'WALLET' },
  });
  if (existing) {
    console.log('Wallet account already exists. Skipping creation.');
    process.exit(0);
  }

  // 1. Create the WALLET account
  const walletAccount = await prisma.account.create({
    data: {
      name: 'EV Charging Apps',
      type: 'WALLET',
      institution: 'Various EV Charging Networks',
      balance: 468, // Sum of sub-account balances: 148 + 320 + 0
      openingBalance: 0,
      currency: 'INR',
      color: '#10b981',
      icon: 'zap',
      notes: 'Wallet account for tracking EV charging app balances',
      userId: user.id,
    },
  });
  console.log(`Created wallet account: ${walletAccount.name} (${walletAccount.id})`);

  // 2. Create sub-accounts
  const zeon = await prisma.subAccount.create({
    data: {
      name: 'Zeon',
      balance: 148,
      color: '#f59e0b',
      icon: 'zap',
      credentials: JSON.stringify({ username: 'rahul@example.com', password: 'zeon123', notes: 'Registered with phone: 9876543210' }),
      notes: 'Zeon EV Charging Network',
      accountId: walletAccount.id,
    },
  });
  console.log(`  Created sub-account: ${zeon.name} (Balance: ₹${zeon.balance})`);

  const tataPower = await prisma.subAccount.create({
    data: {
      name: 'Tata Power EZ Charge',
      balance: 320,
      color: '#3b82f6',
      icon: 'zap',
      credentials: JSON.stringify({ username: '9876543210', password: 'tp@ez2024', notes: '' }),
      notes: 'Tata Power EZ Charge app',
      accountId: walletAccount.id,
    },
  });
  console.log(`  Created sub-account: ${tataPower.name} (Balance: ₹${tataPower.balance})`);

  const statiq = await prisma.subAccount.create({
    data: {
      name: 'Statiq',
      balance: 0,
      color: '#8b5cf6',
      icon: 'zap',
      notes: 'Statiq EV Charging',
      accountId: walletAccount.id,
    },
  });
  console.log(`  Created sub-account: ${statiq.name} (Balance: ₹${statiq.balance})`);

  // 3. Find an existing bank account (SBI or first savings) to use as top-up source
  const bankAccount = await prisma.account.findFirst({
    where: {
      userId: user.id,
      type: { in: ['SAVINGS', 'CURRENT'] },
    },
  });

  if (bankAccount) {
    // 4. Create sample transactions showing the top-up + charge flow
    // Transaction 1: Charged ₹352 at Zeon (topped up ₹500 from SBI)
    const chargeTx1 = await prisma.transaction.create({
      data: {
        amount: 352,
        type: 'EXPENSE',
        date: new Date('2025-07-28'),
        description: 'EV Charging at Zeon - Mall Road',
        merchant: 'Zeon Charger',
        notes: 'Topped up ₹500, charged ₹352. Remaining ₹148 in Zeon wallet.',
        accountId: walletAccount.id,
        subAccountId: zeon.id,
        userId: user.id,
      },
    });

    // Linked transfer for the top-up
    const topUpTx1 = await prisma.transaction.create({
      data: {
        amount: 500,
        type: 'TRANSFER',
        date: new Date('2025-07-28'),
        description: 'Top-up: EV Charging at Zeon - Mall Road',
        merchant: 'Zeon Charger',
        notes: 'Auto-created top-up for wallet sub-account',
        accountId: bankAccount.id,
        transferToAccountId: walletAccount.id,
        linkedTransactionId: chargeTx1.id,
        userId: user.id,
      },
    });
    console.log(`  Created linked transactions: charge ₹352 + top-up ₹500`);

    // Transaction 2: Charged ₹180 at Tata Power (topped up ₹500)
    const chargeTx2 = await prisma.transaction.create({
      data: {
        amount: 180,
        type: 'EXPENSE',
        date: new Date('2025-07-30'),
        description: 'EV Charging at Tata Power - Highway Station',
        merchant: 'Tata Power EZ Charge',
        notes: 'Topped up ₹500, charged ₹180. Remaining ₹320 in Tata Power wallet.',
        accountId: walletAccount.id,
        subAccountId: tataPower.id,
        userId: user.id,
      },
    });

    const topUpTx2 = await prisma.transaction.create({
      data: {
        amount: 500,
        type: 'TRANSFER',
        date: new Date('2025-07-30'),
        description: 'Top-up: EV Charging at Tata Power - Highway Station',
        merchant: 'Tata Power EZ Charge',
        notes: 'Auto-created top-up for wallet sub-account',
        accountId: bankAccount.id,
        transferToAccountId: walletAccount.id,
        linkedTransactionId: chargeTx2.id,
        userId: user.id,
      },
    });
    console.log(`  Created linked transactions: charge ₹180 + top-up ₹500`);
  } else {
    console.log('  No bank account found for sample transactions. Skipping.');
  }

  console.log('\n✅ Wallet seed data created successfully!');
  console.log('   Navigate to Accounts > EV Charging Apps to see your sub-accounts.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
