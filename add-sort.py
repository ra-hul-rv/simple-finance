import sys
import re

with open('src/app/(dashboard)/accounts/page.tsx', 'r') as f:
    content = f.read()

# 1. Add sortMode state
state_search = "const [searchQuery, setSearchQuery] = useState('');"
if state_search in content:
    content = content.replace(state_search, "const [searchQuery, setSearchQuery] = useState('');\n  const [sortMode, setSortMode] = useState<'type' | 'activity'>('type');")

# 2. Add lucide icon if missing
if "AlertCircle" not in content:
    content = content.replace("EyeOff,", "EyeOff,\n  AlertCircle,")

# 3. Modify groupedData usage
grouped_data_logic = """  // Build grouped data
  const groupedData = ACCOUNT_GROUPS.map(group => {
    const groupAccounts = filteredAccounts.filter(a => group.types.includes(a.type));
    const totalBalance = groupAccounts.reduce((sum, a) =>
      group.key === 'cards' ? sum + Math.abs(Number(a.balance)) : sum + Number(a.balance), 0
    );
    return { ...group, accounts: groupAccounts, totalBalance };
  });"""

new_grouped_logic = """  // Build grouped data
  const groupedData = React.useMemo(() => {
    if (sortMode === 'type') {
      return ACCOUNT_GROUPS.map(group => {
        const groupAccounts = filteredAccounts.filter(a => group.types.includes(a.type));
        const totalBalance = groupAccounts.reduce((sum, a) =>
          group.key === 'cards' ? sum + Math.abs(Number(a.balance)) : sum + Number(a.balance), 0
        );
        return { ...group, accounts: groupAccounts, totalBalance };
      }).filter(g => g.accounts.length > 0);
    }

    // Activity Mode
    const activeAccounts: any[] = [];
    const inactiveAccounts: any[] = [];

    filteredAccounts.forEach(a => {
      let isActive = false;
      if (a.type === 'CREDIT_CARD' && a.creditCard) {
        if (a.creditCard.outstandingBalance > 0) isActive = true;
      }
      // For bank accounts, maybe if they have a negative balance (overdraft)
      else if (Number(a.balance) < 0) {
        isActive = true;
      }

      if (isActive) activeAccounts.push(a);
      else inactiveAccounts.push(a);
    });

    // Sort active accounts by outstanding balance descending
    activeAccounts.sort((a, b) => {
      const aBal = a.creditCard ? a.creditCard.outstandingBalance : Math.abs(Number(a.balance));
      const bBal = b.creditCard ? b.creditCard.outstandingBalance : Math.abs(Number(b.balance));
      return bBal - aBal;
    });

    return [
      {
        key: 'active',
        title: 'Active Spends & Dues',
        icon: AlertCircle,
        types: [],
        accounts: activeAccounts,
        totalBalance: activeAccounts.reduce((s, a) => s + (a.creditCard ? a.creditCard.outstandingBalance : Math.abs(Number(a.balance))), 0)
      },
      {
        key: 'inactive',
        title: 'Other Accounts',
        icon: Wallet,
        types: [],
        accounts: inactiveAccounts,
        totalBalance: inactiveAccounts.reduce((s, a) => s + Number(a.balance), 0)
      }
    ].filter(g => g.accounts.length > 0);
  }, [filteredAccounts, sortMode]);"""

content = content.replace(grouped_data_logic, new_grouped_logic)

# 4. Add the Sort Mode Select next to the Type Filter
filter_div = """          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={typeFilter} onValueChange={(val: any) => setTypeFilter(val || 'ALL')}>"""

new_filter_div = """          <div className="hidden sm:flex items-center gap-1.5 border-r border-border/50 pr-3 mr-1">
            <Select value={sortMode} onValueChange={(val: any) => setSortMode(val)}>
              <SelectTrigger className="w-[160px] bg-background/30 border-border/40 h-10 rounded-xl">
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="type">Group by Type</SelectItem>
                <SelectItem value="activity">Active Spends First</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={typeFilter} onValueChange={(val: any) => setTypeFilter(val || 'ALL')}>"""

content = content.replace(filter_div, new_filter_div)

# 5. Fix the filter mapped rendering
old_render = """          {groupedData.map(group => (
            <AccountGroup
              key={group.key}
              title={group.title}
              icon={group.icon}
              count={group.accounts.length}
              totalBalance={group.totalBalance}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {
                  group.key === 'cards' 
                  ? group.accounts.map(acc => {
                      if (!acc.creditCard) {
                        return (
                          <div key={acc.id} className="glass rounded-2xl p-6 flex flex-col justify-center items-center text-center gap-3 border-dashed border-2">
                            <CardIcon className="h-10 w-10 text-muted-foreground opacity-50" />
                            <div>
                              <p className="font-semibold">{acc.name}</p>
                              <p className="text-xs text-muted-foreground">Credit Card Not Configured</p>
                            </div>
                            <Button size="sm" onClick={() => handleOpenEditDialog(acc)} className="rounded-xl h-8 text-xs">Configure</Button>
                          </div>
                        );
                      }
                      return (
                        <CreditCardItem
                          key={acc.id}
                          accountId={acc.id}
                          accountName={acc.name}
                          accountColor={acc.color}
                          creditCard={acc.creditCard}
                          onEdit={() => handleOpenEditDialog(acc)}
                          onDelete={() => handleDeleteAccount(acc.id)}
                        />
                      );
                    })
                  : group.accounts.map(acc => (
                      <AccountCard
                        key={acc.id}
                        account={acc}
                        onEdit={() => handleOpenEditDialog(acc)}
                        onDelete={() => handleDeleteAccount(acc.id)}
                      />
                    ))
                }
              </div>
            </AccountGroup>
          ))}"""

new_render = """          {groupedData.map(group => (
            <AccountGroup
              key={group.key}
              title={group.title}
              icon={group.icon}
              count={group.accounts.length}
              totalBalance={group.totalBalance}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {
                  group.accounts.map(acc => {
                    if (acc.type === 'CREDIT_CARD') {
                      if (!acc.creditCard) {
                        return (
                          <div key={acc.id} className="glass rounded-2xl p-6 flex flex-col justify-center items-center text-center gap-3 border-dashed border-2">
                            <CardIcon className="h-10 w-10 text-muted-foreground opacity-50" />
                            <div>
                              <p className="font-semibold">{acc.name}</p>
                              <p className="text-xs text-muted-foreground">Credit Card Not Configured</p>
                            </div>
                            <Button size="sm" onClick={() => handleOpenEditDialog(acc)} className="rounded-xl h-8 text-xs">Configure</Button>
                          </div>
                        );
                      }
                      return (
                        <CreditCardItem
                          key={acc.id}
                          accountId={acc.id}
                          accountName={acc.name}
                          accountColor={acc.color}
                          creditCard={acc.creditCard}
                          onEdit={() => handleOpenEditDialog(acc)}
                          onDelete={() => handleDeleteAccount(acc.id)}
                        />
                      );
                    }
                    return (
                      <AccountCard
                        key={acc.id}
                        account={acc}
                        onEdit={() => handleOpenEditDialog(acc)}
                        onDelete={() => handleDeleteAccount(acc.id)}
                      />
                    );
                  })
                }
              </div>
            </AccountGroup>
          ))}"""

content = content.replace(old_render, new_render)

with open('src/app/(dashboard)/accounts/page.tsx', 'w') as f:
    f.write(content)
print("Added sorting mechanism")
