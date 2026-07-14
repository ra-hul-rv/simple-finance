'use client';

import { useEffect, useState, use } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Calendar,
  Building,
  AlertCircle,
  Clock,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency, formatDate } from '@/lib/format';
import Link from 'next/link';

interface Account {
  id: string;
  name: string;
  type: string;
  institution: string | null;
  accountNumber: string | null;
  balance: number;
  openingBalance: number;
  currency: string;
  interestRate: number | null;
  creditLimit: number | null;
  color: string;
  icon: string;
  notes: string | null;
}

interface Transaction {
  id: string;
  date: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'INVESTMENT' | 'CREDIT_CARD_PAYMENT' | 'REFUND' | 'INTEREST' | 'DIVIDEND';
  description: string;
  merchant: string | null;
  category: { name: string; color: string } | null;
}

export default function AccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [account, setAccount] = useState<Account | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Sorting
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'description'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const fetchDetails = async () => {
    try {
      // 1. Fetch account info
      const accRes = await fetch(`/api/accounts/${id}`);
      if (!accRes.ok) throw new Error('Account not found');
      const accData = await accRes.json();
      setAccount(accData);

      // 2. Fetch transactions for this account
      const txRes = await fetch(`/api/transactions?accountId=${id}&limit=100&sortBy=${sortBy}&sortOrder=${sortOrder}`);
      if (!txRes.ok) throw new Error('Failed to load transactions');
      const txData = await txRes.json();
      setTransactions(txData.transactions);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load account ledger details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id, sortBy, sortOrder]);

  const toggleSort = (column: 'date' | 'amount' | 'description') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const renderSortIcon = (column: 'date' | 'amount' | 'description') => {
    if (sortBy !== column) return <ArrowUpDown className="ml-1 h-3 w-3 inline opacity-50" />;
    return sortOrder === 'asc' ? <ArrowUp className="ml-1 h-3 w-3 inline" /> : <ArrowDown className="ml-1 h-3 w-3 inline" />;
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-3">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <h3 className="text-lg font-semibold">Ledger Not Found</h3>
        <p className="text-sm text-muted-foreground">The requested financial account could not be resolved.</p>
        <Link href="/accounts">
          <Button size="sm">Go back to accounts</Button>
        </Link>
      </div>
    );
  }

  const incomeSum = transactions
    .filter((t) => t.type === 'INCOME' || t.type === 'REFUND' || t.type === 'INTEREST' || t.type === 'DIVIDEND')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const expenseSum = transactions
    .filter((t) => t.type === 'EXPENSE' || t.type === 'INVESTMENT')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-2">
        <Link href="/accounts">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-accent">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <PageHeader title={account.name} description={account.institution || 'Ledger detailed report'} />
      </div>

      {/* Overview stats specific to this ledger */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Current Balance"
          value={account.balance}
          prefix={account.currency === 'INR' ? '₹' : '$'}
          trend={0}
          variant="glass"
          className="border-t-4"
          style={{ borderTopColor: account.color }}
        />
        <StatCard
          title="Total Inflow"
          value={incomeSum}
          prefix={account.currency === 'INR' ? '₹' : '$'}
          icon={<ArrowUpRight className="h-4 w-4 text-success" />}
        />
        <StatCard
          title="Total Outflow"
          value={expenseSum}
          prefix={account.currency === 'INR' ? '₹' : '$'}
          icon={<ArrowDownRight className="h-4 w-4 text-destructive" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Transaction History Column */}
        <Card className="glass lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase label-uppercase tracking-wider">Account Statements</CardTitle>
            <CardDescription>All transactions routed through this account</CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            {transactions.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                No statement records for this account
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead 
                        className="label-uppercase text-[10px] cursor-pointer select-none"
                        onClick={() => toggleSort('date')}
                      >
                        Date {renderSortIcon('date')}
                      </TableHead>
                      <TableHead 
                        className="label-uppercase text-[10px] cursor-pointer select-none"
                        onClick={() => toggleSort('description')}
                      >
                        Description {renderSortIcon('description')}
                      </TableHead>
                      <TableHead className="label-uppercase text-[10px]">Category</TableHead>
                      <TableHead 
                        className="text-right label-uppercase text-[10px] cursor-pointer select-none"
                        onClick={() => toggleSort('amount')}
                      >
                        Amount {renderSortIcon('amount')}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="text-xs font-medium text-muted-foreground">
                          {formatDate(tx.date, 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-sm">{tx.description}</div>
                          {tx.merchant && (
                            <div className="text-[10px] text-muted-foreground mt-0.5">{tx.merchant}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          {tx.category ? (
                            <span
                              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                              style={{
                                backgroundColor: `${tx.category.color}15`,
                                color: tx.category.color,
                              }}
                            >
                              {tx.category.name}
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent text-muted-foreground">
                              Transfer/Payment
                            </span>
                          )}
                        </TableCell>
                        <TableCell className={`text-right font-bold tabular-nums text-sm ${
                          tx.type === 'INCOME' || tx.type === 'REFUND' || tx.type === 'INTEREST' || tx.type === 'DIVIDEND'
                            ? 'text-success'
                            : 'text-foreground'
                        }`}>
                          {tx.type === 'INCOME' || tx.type === 'REFUND' || tx.type === 'INTEREST' || tx.type === 'DIVIDEND' ? '+' : '-'}
                          {formatCurrency(Number(tx.amount), account.currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ledger Metadata Details */}
        <div className="space-y-6">
          <Card className="glass">
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase label-uppercase tracking-wider">Ledger Details</CardTitle>
              <CardDescription>System properties for this account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs font-semibold text-muted-foreground">
              {account.institution && (
                <div className="flex justify-between border-b pb-2">
                  <span>Institution</span>
                  <span className="text-foreground">{account.institution}</span>
                </div>
              )}
              {account.accountNumber && (
                <div className="flex justify-between border-b pb-2">
                  <span>Account Number</span>
                  <span className="text-foreground font-mono">{account.accountNumber}</span>
                </div>
              )}
              <div className="flex justify-between border-b pb-2">
                <span>Account Type</span>
                <span className="text-foreground">{account.type}</span>
              </div>
              {account.interestRate && (
                <div className="flex justify-between border-b pb-2">
                  <span>Interest Rate</span>
                  <span className="text-success">{account.interestRate}% p.a.</span>
                </div>
              )}
              {account.creditLimit && (
                <div className="flex justify-between border-b pb-2">
                  <span>Credit Limit</span>
                  <span className="text-foreground tabular-nums">{formatCurrency(account.creditLimit, account.currency)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {account.notes && (
            <Card className="glass">
              <CardHeader>
                <CardTitle className="text-sm font-bold uppercase label-uppercase tracking-wider">Private Notes</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {account.notes}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
