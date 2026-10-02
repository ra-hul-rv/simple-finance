import sys
with open('src/components/accounts/credit-card-item.tsx', 'r') as f:
    content = f.read()

# Remove bg-black from the wrapper
content = content.replace('className="relative w-full overflow-hidden border-b border-border/20 bg-black"', 'className="relative w-full border-b border-border/20"')
content = content.replace('className="relative w-full overflow-hidden border-b border-border/50 bg-black"', 'className="relative w-full border-b border-border/20"')

# Make sure the container doesn't force a flex center that might shrink
content = content.replace('<div className="w-full block">', '<div className="w-full">')

with open('src/components/accounts/credit-card-item.tsx', 'w') as f:
    f.write(content)
