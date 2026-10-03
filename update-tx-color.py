import sys

with open('src/app/(dashboard)/transactions/page.tsx', 'r') as f:
    content = f.read()

# For expenses, we want the negative sign to be red. Let's just make the whole text red like income, OR just the sign.
# Let's see how it looks:
# {['EXPENSE', 'INVESTMENT'].includes(tx.type) ? <span className="text-destructive">-</span> : ''}
# Actually, if I just make the text-foreground -> text-foreground but add the span, it's safer. Or I can just make the whole thing text-foreground but the negative sign text-destructive.

old_logic_1 = """                                        ['EXPENSE', 'INVESTMENT'].includes(tx.type)
                                          ? 'text-foreground'
                                          : ['INCOME', 'REFUND', 'INTEREST', 'DIVIDEND'].includes(tx.type)
                                          ? 'text-success'
                                          : 'text-foreground'
                                      )}>
                                        {['INCOME', 'REFUND', 'INTEREST', 'DIVIDEND'].includes(tx.type) ? '+' : ''}
                                        {['EXPENSE', 'INVESTMENT'].includes(tx.type) ? '-' : ''}
                                        {formatCurrency(tx.amount, 'INR')}"""

new_logic_1 = """                                        ['INCOME', 'REFUND', 'INTEREST', 'DIVIDEND'].includes(tx.type)
                                          ? 'text-success'
                                          : 'text-foreground'
                                      )}>
                                        {['INCOME', 'REFUND', 'INTEREST', 'DIVIDEND'].includes(tx.type) ? '+' : ''}
                                        {['EXPENSE', 'INVESTMENT'].includes(tx.type) ? <span className="text-destructive">-</span> : ''}
                                        {formatCurrency(tx.amount, 'INR')}"""

content = content.replace(old_logic_1, new_logic_1)

with open('src/app/(dashboard)/transactions/page.tsx', 'w') as f:
    f.write(content)

print("Updated transaction negative sign color")
