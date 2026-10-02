import sys
with open('src/components/accounts/credit-card-item.tsx', 'r') as f:
    content = f.read()

# Pass rounded-t-2xl to CreditCardVisual
content = content.replace('className="w-full h-auto !aspect-[1.9/1]"', 'className="w-full h-auto !aspect-[1.9/1] !rounded-t-2xl"')

with open('src/components/accounts/credit-card-item.tsx', 'w') as f:
    f.write(content)

with open('src/components/accounts/credit-card-visual.tsx', 'r') as f:
    content = f.read()
    
# Apply the rounding to the inner inset div too just in case
content = content.replace('className="absolute inset-0 overflow-hidden"', 'className="absolute inset-0 overflow-hidden rounded-[inherit]"')

with open('src/components/accounts/credit-card-visual.tsx', 'w') as f:
    f.write(content)
