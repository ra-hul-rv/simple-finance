import sys
import re

with open('src/components/accounts/credit-card-visual.tsx', 'r') as f:
    content = f.read()

# Fix sizeClasses
if "full:" not in content:
    content = content.replace("lg: 'w-full max-w-[400px]',", "lg: 'w-full max-w-[400px]',\n    full: 'w-full max-w-none',")

# Fix formattedCardNumber
old_fmt = """  const formattedCardNumber = () => {
    if (cardNumber) {
      return cardNumber.replace(/(.{4})/g, '$1 ').trim();
    }"""
new_fmt = """  const formattedCardNumber = () => {
    if (cardNumber) {
      const clean = cardNumber.replace(/\s+/g, '');
      return clean.replace(/(.{4})/g, '$1 ').trim();
    }"""
content = content.replace(old_fmt, new_fmt)

# Fix Pattern opacity for geometric
content = content.replace('className="absolute inset-0 opacity-20"', 'className="absolute inset-0 opacity-5"')

# Fix Fonts in forceFlat block
# Let's target the forceFlat block precisely
# Logo: text-xl md:text-2xl -> text-lg font-bold tracking-tight
content = content.replace('className="font-bold text-xl md:text-2xl"', 'className="font-bold text-lg tracking-tight"')
# Title: text-sm opacity-90 -> text-xs opacity-80
content = content.replace('className="text-sm opacity-90 font-semibold tracking-wider mt-1"', 'className="text-xs opacity-80 font-medium tracking-wider mt-1"')
# Number: font-mono text-2xl md:text-3xl tracking-widest pt-3 pb-1 drop-shadow-md -> font-mono text-xl tracking-[0.15em] pt-2 pb-1 drop-shadow-sm
content = content.replace('className="font-mono text-2xl md:text-3xl tracking-widest pt-3 pb-1 drop-shadow-md"', 'className="font-mono text-xl tracking-[0.15em] pt-2 pb-1 drop-shadow-sm"')
# Name: font-bold text-base -> font-semibold text-sm
content = content.replace('className="font-bold text-base uppercase truncate max-w-[180px]"', 'className="font-semibold text-sm uppercase truncate max-w-[180px]"')
# Expiry: text-base font-semibold -> text-sm font-medium
content = content.replace('className="font-mono text-base font-semibold"', 'className="font-mono text-sm font-medium"')

with open('src/components/accounts/credit-card-visual.tsx', 'w') as f:
    f.write(content)

with open('src/components/accounts/credit-card-item.tsx', 'r') as f:
    content_item = f.read()

# Fix the container issue in CreditCardItem
# Replace <div className="w-full flex items-center justify-center p-0"> with just a block div
content_item = content_item.replace('<div className="w-full flex items-center justify-center p-0">', '<div className="w-full block">')

with open('src/components/accounts/credit-card-item.tsx', 'w') as f:
    f.write(content_item)
