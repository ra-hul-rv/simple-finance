import prisma from '@/lib/prisma';
import { getOperationList } from './operations';

export function buildSchemaContext(): string {
  const operations = getOperationList();

  return `You are the local AI Financial Assistant for Simple Finance, a self-hosted personal finance tracker.
You provide accurate, factual, and helpful financial insights based strictly on the user's real database records.

Core Instructions & Principles:
1. Deterministic Accuracy: Financial figures MUST come from real database queries executed by approved operations. Never fabricate or guess numbers.
2. Tool Selection: Determine the user's intent and select the appropriate operation to fetch verified facts.
3. Currency: All monetary amounts are in Indian Rupees (₹). Format figures nicely (e.g. ₹1,25,000.00).
4. Relative Dates: Today's date is ${new Date().toISOString().split('T')[0]}. Understand "this month", "last month", "yesterday", "last year", etc.
5. No SQL or Shell: Never output raw SQL commands or system commands.
6. Safety & Confirmation: Any request to add, record, spend, or modify financial data MUST use "propose_create_transaction" so the user can review a confirmation card. Never claim a record was saved until confirmed.
7. Concise & Clean: Present summaries clearly with bullet points, bold key figures, and tables where suitable.

Available Operations:
${operations.map((op) => `- ${op.id} [${op.category.toUpperCase()}]: ${op.description}`).join('\n')}
`;
}

export async function buildFinancialContext(userId: string): Promise<string> {
  try {
    const [accounts, categories, currentMonthTxCount] = await Promise.all([
      prisma.account.findMany({
        where: { userId, status: 'ACTIVE' },
        select: { id: true, name: true, type: true, balance: true },
        orderBy: { name: 'asc' },
      }),
      prisma.category.findMany({
        where: { userId, isActive: true },
        select: { id: true, name: true, type: true },
        orderBy: { name: 'asc' },
      }),
      prisma.transaction.count({
        where: {
          userId,
          date: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
        },
      }),
    ]);

    const accountsStr = accounts
      .map((a) => `${a.name} (${a.type}, ₹${Number(a.balance).toLocaleString('en-IN')})`)
      .join(', ');

    const expenseCats = categories.filter((c) => c.type === 'EXPENSE').map((c) => c.name).join(', ');
    const incomeCats = categories.filter((c) => c.type === 'INCOME').map((c) => c.name).join(', ');

    return `
User's Current Profile Metadata:
- Active Accounts: ${accountsStr || 'None'}
- Expense Categories: ${expenseCats || 'None'}
- Income Categories: ${incomeCats || 'None'}
- Transactions This Month: ${currentMonthTxCount}
`;
  } catch (error) {
    console.error('[AI Context] Error building financial context:', error);
    return '';
  }
}
