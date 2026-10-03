import sys

with open('src/app/(dashboard)/transactions/page.tsx', 'r') as f:
    content = f.read()

content = content.replace("? '-' : ''}", "? <span className=\"text-destructive\">-</span> : ''}")

with open('src/app/(dashboard)/transactions/page.tsx', 'w') as f:
    f.write(content)

print("Replaced negative signs")
