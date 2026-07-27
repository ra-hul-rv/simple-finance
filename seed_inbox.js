const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst();
  if (!user) {
    console.log('No users found.');
    return;
  }

  const dummyEvents = [
    {
      userId: user.id,
      source: 'n8n_mail',
      status: 'PENDING',
      payload: {
        amount: 850,
        type: 'EXPENSE',
        date: new Date().toISOString().split('T')[0],
        description: 'Dinner at Arabian Palace',
        merchant: 'Arabian Palace',
        notes: 'Spicy Chicken Mandi, Malai Alfam Combo, Fresh Lime'
      }
    },
    {
      userId: user.id,
      source: 'n8n_voice',
      status: 'PENDING',
      payload: {
        amount: 3200,
        type: 'EXPENSE',
        date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
        description: 'Fuel at Shell',
        merchant: 'Shell Petrol Pump',
        notes: 'Full tank for the road trip'
      }
    },
    {
      userId: user.id,
      source: 'telegram_text',
      status: 'PENDING',
      payload: {
        amount: 50000,
        type: 'INCOME',
        date: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
        description: 'Freelance project payment',
        merchant: 'Acme Corp',
        notes: 'Final milestone payment for the website redesign'
      }
    }
  ];

  for (const event of dummyEvents) {
    await prisma.inboxEvent.create({
      data: event
    });
  }

  console.log('Inserted 3 dummy inbox events successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
