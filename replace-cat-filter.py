import sys
import re

with open('src/app/(dashboard)/transactions/page.tsx', 'r') as f:
    content = f.read()

old_select = """                <SelectContent>
                  <SelectItem value="ALL">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>"""

new_select = """                <SelectContent>
                  <SelectItem value="ALL">All Categories</SelectItem>
                  {categories.filter(c => {
                    if (c.parentId) return false;
                    if (typeFilter !== 'ALL') {
                      const mappedType = ['INCOME', 'REFUND', 'INTEREST', 'DIVIDEND'].includes(typeFilter) ? 'INCOME' : 'EXPENSE';
                      if (c.type !== mappedType) return false;
                    }
                    return true;
                  }).map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>"""

if old_select in content:
    content = content.replace(old_select, new_select)
    print("Replaced dropdown filter")
else:
    print("Could not find old select dropdown")

with open('src/app/(dashboard)/transactions/page.tsx', 'w') as f:
    f.write(content)
