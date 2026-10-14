import { Operation, OperationRegistry } from './types';
import { getSpendingSummaryOperation, getSpendingByCategoryOperation, comparePeriodsOperation } from './spending';
import { getAccountBalancesOperation, getCreditCardSummaryOperation } from './accounts';
import { getRecentTransactionsOperation, searchTransactionsOperation } from './transactions';
import { getBudgetStatusOperation } from './budgets';
import { getInvestmentSummaryOperation, getFixedDepositSummaryOperation } from './investments';
import { getSubscriptionsOperation, getRecurringPaymentsOperation } from './recurring';
import { getLendingSummaryOperation } from './lending';
import { proposeCreateTransactionOperation } from './writes';

export * from './types';

const allOperations: Operation[] = [
  getSpendingSummaryOperation,
  getSpendingByCategoryOperation,
  comparePeriodsOperation,
  getAccountBalancesOperation,
  getCreditCardSummaryOperation,
  getRecentTransactionsOperation,
  searchTransactionsOperation,
  getBudgetStatusOperation,
  getInvestmentSummaryOperation,
  getFixedDepositSummaryOperation,
  getSubscriptionsOperation,
  getRecurringPaymentsOperation,
  getLendingSummaryOperation,
  proposeCreateTransactionOperation,
];

export const operationsRegistry: OperationRegistry = new Map(
  allOperations.map((op) => [op.id, op])
);

export function getOperation(id: string): Operation | undefined {
  return operationsRegistry.get(id);
}

export function getOperationList(): Array<{ id: string; name: string; description: string; category: 'read' | 'write' }> {
  return allOperations.map((op) => ({
    id: op.id,
    name: op.name,
    description: op.description,
    category: op.category,
  }));
}
