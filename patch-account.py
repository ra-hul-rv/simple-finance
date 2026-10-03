import sys
import re

with open('src/app/(dashboard)/accounts/[id]/page.tsx', 'r') as f:
    content = f.read()

# 1. We need to add state for txFilter:
# `const [txFilter, setTxFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');`
if 'const [txFilter' not in content:
    content = content.replace("const [transactions, setTransactions] = useState<any[]>([]);", 
                              "const [transactions, setTransactions] = useState<any[]>([]);\n  const [txFilter, setTxFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');\n  const [allIncomeTx, setAllIncomeTx] = useState<any[]>([]);")

# 2. Modify fetchData to fetch limit=1000 and also all income for external cashbacks.
old_fetch = """      const txRes = await fetch(`/api/transactions?accountId=${id}&limit=100&sortBy=${sortBy}&sortOrder=${sortOrder}`);
      if (txRes.ok) {
        const data = await txRes.json();
        setTransactions(data.transactions || []);
      }"""
new_fetch = """      const txRes = await fetch(`/api/transactions?accountId=${id}&limit=1000&sortBy=${sortBy}&sortOrder=${sortOrder}`);
      if (txRes.ok) {
        const data = await txRes.json();
        setTransactions(data.transactions || []);
      }
      
      const incomeRes = await fetch(`/api/transactions?type=INCOME&limit=2000`);
      if (incomeRes.ok) {
        const data = await incomeRes.json();
        setAllIncomeTx(data.transactions || []);
      }"""
if 'limit=1000' not in content:
    content = content.replace(old_fetch, new_fetch)

# 3. Add useMemo for filteredTransactions and monthlyAnalytics.
# I need to inject this before the `if (isLoading)` or similar.
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

if 'const filteredTransactions = useMemo' not in content:
    content = content.replace("  if (isLoading) {", analytics_code + "\n  if (isLoading) {")

# 4. Modify the transactions table to use filteredTransactions
content = content.replace("transactions.length === 0", "filteredTransactions.length === 0")
content = content.replace("transactions.map((tx)", "filteredTransactions.map((tx)")
content = content.replace("transactions.map((tx: any)", "filteredTransactions.map((tx: any)")

# 5. Add tabs for filtering transactions in the CardHeader
old_card_header = """          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase label-uppercase tracking-wider">Account Statements</CardTitle>
            <CardDescription>All transactions routed through this account</CardDescription>
          </CardHeader>"""
new_card_header = """          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-sm font-bold uppercase label-uppercase tracking-wider">Account Statements</CardTitle>
              <CardDescription>All transactions routed through this account</CardDescription>
            </div>
            <Tabs value={txFilter} onValueChange={(v: any) => setTxFilter(v)} className="w-full sm:w-auto">
              <TabsList className="grid grid-cols-3 h-8">
                <TabsTrigger value="ALL" className="text-[10px] uppercase">All</TabsTrigger>
                <TabsTrigger value="EXPENSE" className="text-[10px] uppercase">Spends</TabsTrigger>
                <TabsTrigger value="INCOME" className="text-[10px] uppercase">Income</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>"""
content = content.replace(old_card_header, new_card_header)

# 6. Add Analytics Box on the right column
analytics_box = """
        {/* Monthly Analytics Box */}
        {monthlyAnalytics.length > 0 && (
          <Card className="glass">
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase label-uppercase tracking-wider">Monthly Analytics</CardTitle>
              <CardDescription>Opening, closing, and rewards</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
              {monthlyAnalytics.map((stat: any) => (
                <div key={stat.key} className="p-3 rounded-xl border border-border/40 bg-card/30 space-y-2">
                  <div className="flex justify-between items-center border-b border-border/50 pb-2 mb-2">
                    <span className="font-bold text-sm text-primary">{stat.name}</span>
                    <div className="text-right">
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Net Change</div>
                      <div className={`text-xs font-bold ${stat.income - stat.expense >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {stat.income - stat.expense >= 0 ? '+' : ''}{formatCurrency(stat.income - stat.expense, account?.currency)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[9px] text-muted-foreground uppercase font-semibold block">Opening</span>
                      <span className="font-medium">{formatCurrency(stat.openingBal, account?.currency)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] text-muted-foreground uppercase font-semibold block">Closing</span>
                      <span className="font-medium">{formatCurrency(stat.closingBal, account?.currency)}</span>
                    </div>
                  </div>

                  <div className="flex justify-between text-xs pt-1">
                    <span className="text-muted-foreground">Income</span>
                    <span className="text-success font-medium">+{formatCurrency(stat.income, account?.currency)}</span>
                  </div>
                  <div className="flex justify-between text-xs pb-1">
                    <span className="text-muted-foreground">Spends</span>
                    <span className="text-destructive font-medium">-{formatCurrency(stat.expense, account?.currency)}</span>
                  </div>

                  {(stat.interest > 0 || stat.cashback > 0) && (
                    <div className="pt-2 mt-1 border-t border-dashed border-border/40 space-y-1">
                      {stat.interest > 0 && (
                        <div className="flex justify-between text-xs items-center bg-primary/5 p-1 px-2 rounded-md">
                          <span className="text-[10px] font-bold text-primary uppercase">Interest Earned</span>
                          <span className="text-success font-bold">+{formatCurrency(stat.interest, account?.currency)}</span>
                        </div>
                      )}
                      {stat.cashback > 0 && (
                        <div className="flex justify-between text-xs items-center bg-primary/5 p-1 px-2 rounded-md">
                          <span className="text-[10px] font-bold text-primary uppercase">Cashback</span>
                          <span className="text-success font-bold">+{formatCurrency(stat.cashback, account?.currency)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
"""
content = content.replace("{/* Ledger Metadata Details */}", analytics_box + "\n        {/* Ledger Metadata Details */}")

with open('src/app/(dashboard)/accounts/[id]/page.tsx', 'w') as f:
    f.write(content)

print("Patched account ledger page!")
