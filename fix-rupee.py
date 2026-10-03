import sys
import re

with open('src/app/(dashboard)/transactions/page.tsx', 'r') as f:
    content = f.read()

old_logic = """                            {['INCOME', 'REFUND', 'INTEREST', 'DIVIDEND'].includes(tx.type) ? '+' : ''}
                            {['EXPENSE', 'INVESTMENT'].includes(tx.type) ? <span className="text-destructive">-</span> : ''}
                            {formatCurrency(tx.amount, 'INR')}"""

new_logic = """                            {(() => {
                              const str = formatCurrency(tx.amount, 'INR');
                              const sym = str.charAt(0);
                              const num = str.slice(1);
                              if (['EXPENSE', 'INVESTMENT'].includes(tx.type)) {
                                return <><span className="text-destructive">-{sym}</span>{num}</>;
                              } else if (['INCOME', 'REFUND', 'INTEREST', 'DIVIDEND'].includes(tx.type)) {
                                return <>+{sym}{num}</>;
                              }
                              return str;
                            })()}"""

content = content.replace(old_logic, new_logic)

old_logic_2 = """                                        {['INCOME', 'REFUND', 'INTEREST', 'DIVIDEND'].includes(tx.type) ? '+' : ''}
                                        {['EXPENSE', 'INVESTMENT'].includes(tx.type) ? <span className="text-destructive">-</span> : ''}
                                        {formatCurrency(tx.amount, 'INR')}"""

new_logic_2 = """                                        {(() => {
                                          const str = formatCurrency(tx.amount, 'INR');
                                          const sym = str.charAt(0);
                                          const num = str.slice(1);
                                          if (['EXPENSE', 'INVESTMENT'].includes(tx.type)) {
                                            return <><span className="text-destructive">-{sym}</span>{num}</>;
                                          } else if (['INCOME', 'REFUND', 'INTEREST', 'DIVIDEND'].includes(tx.type)) {
                                            return <>+{sym}{num}</>;
                                          }
                                          return str;
                                        })()}"""

content = content.replace(old_logic_2, new_logic_2)

with open('src/app/(dashboard)/transactions/page.tsx', 'w') as f:
    f.write(content)

print("Updated rupee sign logic")
