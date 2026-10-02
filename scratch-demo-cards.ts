import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: 'cloudstoreme111@gmail.com' }
  });

  if (!user) {
    console.error("User not found");
    return;
  }

  const templates = [
    { id: 'SBI_CASHBACK', name: 'SBI Cashback' },
    { id: 'SBI_SIMPLY_CLICK', name: 'SBI SimplyClick' },
    { id: 'ICICI_RUBYX', name: 'ICICI Rubyx' },
    { id: 'ICICI_AMAZON_PAY', name: 'Amazon Pay' },
    { id: 'FEDERAL_SCAPIA', name: 'Scapia' },
    { id: 'AXIS_FLIPKART', name: 'Flipkart Axis' },
    { id: 'AXIS_MYZONE', name: 'My Zone Axis' },
    { id: 'AXIS_AIRTEL', name: 'Airtel Axis' },
    { id: 'YES_BANK_KIWI', name: 'Kiwi Yes Bank' },
    { id: 'HDFC_TATA_NEU', name: 'Tata Neu Infinity' }
  ];

  for (let i = 0; i < templates.length; i++) {
    const t = templates[i];
    
    // Create Account first
    const account = await prisma.account.create({
      data: {
        userId: user.id,
        name: t.name,
        type: 'CREDIT_CARD',
        balance: - (5000 + (i * 1000)),
        openingBalance: 0,
        currency: 'INR',
        color: '#6366f1',
        icon: 'CreditCard'
      }
    });

    // Create CreditCardDetail
    await prisma.creditCard.create({
      data: {
        userId: user.id,
        accountId: account.id,
        cardName: t.name,
        lastFourDigits: String(1000 + i),
        cardNumber: `4111 1111 1111 ${1000 + i}`,
        cardHolderName: user.name || 'Rahul RV',
        expiryDate: '12/28',
        cvv: '123',
        template: t.id,
        creditLimit: 100000 + (i * 10000),
        outstandingBalance: 5000 + (i * 1000),
        availableCredit: (100000 + (i * 10000)) - (5000 + (i * 1000)),
        dueDate: 15,
        statementDate: 1,
        minimumDue: 500,
        rewardsBalance: 1250 + (i * 100),
        color: '#6366f1'
      }
    });
  }
  
  console.log("Demo cards created successfully");
}

main().catch(console.error).finally(() => prisma.$disconnect());
