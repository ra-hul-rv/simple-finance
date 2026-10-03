import sys
import re

with open('src/app/(dashboard)/accounts/[id]/page.tsx', 'r') as f:
    content = f.read()

# 1. Add Tabs Import
if "import { Tabs" not in content:
    content = content.replace("import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';", 
                              "import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';\nimport { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';")
if "import { useMemo" not in content:
    content = content.replace("import { useEffect, useState, use, useTransition } from 'react';", "import { useEffect, useState, use, useTransition, useMemo } from 'react';")

# 2. Add State
if "txFilter" not in content:
    content = content.replace("const [transactions, setTransactions] = useState<Transaction[]>([]);", 
                              "const [transactions, setTransactions] = useState<Transaction[]>([]);\n  const [txFilter, setTxFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');\n  const [allIncomeTx, setAllIncomeTx] = useState<any[]>([]);")

# 3. Update Fetch
old_fetch = """      // 2. Fetch transactions for this account
      const txRes = await fetch(`/api/transactions?accountId=${id}&limit=100&sortBy=${sortBy}&sortOrder=${sortOrder}`);
      if (!txRes.ok) throw new Error('Failed to load transactions');
      const txData = await txRes.json();
      setTransactions(txData.transactions);"""
new_fetch = """      // 2. Fetch transactions for this account
      const txRes = await fetch(`/api/transactions?accountId=${id}&limit=1000&sortBy=${sortBy}&sortOrder=${sortOrder}`);
      if (!txRes.ok) throw new Error('Failed to load transactions');
      const txData = await txRes.json();
      setTransactions(txData.transactions);

      const incomeRes = await fetch(`/api/transactions?type=INCOME&limit=2000`);
      if (incomeRes.ok) {
        const data = await incomeRes.json();
        setAllIncomeTx(data.transactions || []);
      }"""
if "limit=1000" not in content:
    content = content.replace(old_fetch, new_fetch)

# 4. Inject `useMemo` logic for analytics
analytics_code = """
  const filteredTransactions = useMemo(() => {
    if (txFilter === 'ALL') return transactions;
    if (txFilter === 'INCOME') return transactions.filter((t: any) => ['INCOME', 'REFUND', 'INTEREST', 'DIVIDEND'].includes(t.type));
    if (txFilter === 'EXPENSE') return transactions.filter((t: any) => ['EXPENSE', 'INVESTMENT'].includes(t.type));
    return transactions;
  }, [transactions, txFilter]);

  const monthlyAnalytics = useMemo(() => {
    if (!account) return [];
    
    // Sort ascending for balance calculation
    const ascTx = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    let totalTxEffect = 0;
    ascTx.forEach(tx => {
      if (['INCOME', 'REFUND', 'INTEREST', 'DIVIDEND'].includes(tx.type)) totalTxEffect += Number(tx.amount);
      if (['EXPENSE', 'INVESTMENT'].includes(tx.type)) totalTxEffect -= Number(tx.amount);
    });
    
    // Initial balance at the start of time
    const initialBalance = Number(account.balance) - totalTxEffect;
    
    let currentBal = initialBalance;
    const monthsMap = new Map();
    
    // Group internal transactions
    ascTx.forEach(tx => {
      const d = new Date(tx.date);
      const mKey = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}`;
      const mName = d.toLocaleDateString('default', { month: 'short', year: 'numeric' });
      
      if (!monthsMap.has(mKey)) {
        monthsMap.set(mKey, {
          key: mKey,
          name: mName,
          openingBal: currentBal,
          closingBal: currentBal,
          income: 0,
          expense: 0,
          cashback: 0,
          interest: 0,
        });
      }
      
      const stat = monthsMap.get(mKey);
      const amt = Number(tx.amount);
      const catName = tx.category?.name?.toLowerCase() || '';
      
      if (['INCOME', 'REFUND', 'INTEREST', 'DIVIDEND'].includes(tx.type)) {
        stat.income += amt;
        currentBal += amt;
        if (catName.includes('cashback')) stat.cashback += amt;
        if (catName.includes('interest')) stat.interest += amt;
      }
      
      if (['EXPENSE', 'INVESTMENT'].includes(tx.type)) {
        stat.expense += amt;
        currentBal -= amt;
      }
      
      stat.closingBal = currentBal;
    });
    
    // Process external cashbacks (transferred to other accounts but belonging to this card)
    if (account.type === 'CREDIT_CARD') {
      const accNameLower = account.name.toLowerCase();
      allIncomeTx.forEach((tx: any) => {
        // Only if it's not already in this account
        if (tx.accountId === account.id) return;
        
        const catName = tx.category?.name?.toLowerCase() || '';
        const desc = (tx.description || '').toLowerCase();
        const notes = (tx.notes || '').toLowerCase();
        
        if (catName.includes('cashback') && (desc.includes(accNameLower) || notes.includes(accNameLower))) {
          const d = new Date(tx.date);
          const mKey = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}`;
          const mName = d.toLocaleDateString('default', { month: 'short', year: 'numeric' });
          if (!monthsMap.has(mKey)) {
             monthsMap.set(mKey, { key: mKey, name: mName, openingBal: 0, closingBal: 0, income: 0, expense: 0, cashback: 0, interest: 0 });
          }
          monthsMap.get(mKey).cashback += Number(tx.amount);
        }
      });
    }
    
    return Array.from(monthsMap.values()).sort((a, b) => b.key.localeCompare(a.key));
  }, [account, transactions, allIncomeTx]);
"""

if "const filteredTransactions =" not in content:
    content = content.replace("  if (loading) {", analytics_code + "\n  if (loading) {")

with open('src/app/(dashboard)/accounts/[id]/page.tsx', 'w') as f:
    f.write(content)

print("Applied state patches")
