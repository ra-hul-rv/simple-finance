import sys

with open('src/app/(dashboard)/accounts/[id]/page.tsx', 'r') as f:
    content = f.read()

state_line = "const [transactions, setTransactions] = useState<Transaction[]>([]);"
new_states = """const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txFilter, setTxFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [allIncomeTx, setAllIncomeTx] = useState<any[]>([]);"""

if "const [txFilter" not in content:
    content = content.replace(state_line, new_states)

with open('src/app/(dashboard)/accounts/[id]/page.tsx', 'w') as f:
    f.write(content)

print("Added state declarations")
