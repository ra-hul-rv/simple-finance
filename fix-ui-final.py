import sys

# 1. Replace <Card> with a raw <div> in CreditCardItem to avoid ANY hidden Shadcn padding/margins
with open('src/components/accounts/credit-card-item.tsx', 'r') as f:
    content = f.read()

# Replace <Card>
content = content.replace('<Card className="!p-0 !gap-0 relative overflow-hidden border-border/30 rounded-2xl flex flex-col bg-card/40 backdrop-blur-sm shadow-sm transition-all hover:shadow-md group">', 
                          '<div className="relative overflow-hidden border border-border/30 rounded-2xl flex flex-col bg-card/40 backdrop-blur-sm shadow-sm transition-all hover:shadow-md group p-0 m-0">')
content = content.replace('</Card>', '</div>')

# Replace <CardContent> just to be safe
content = content.replace('<CardContent className="', '<div className="')
content = content.replace('</CardContent>', '</div>')

# 2. Make sure CreditCardVisual spans absolutely 100% width and height
# We will inject an inline style of `width: 100%, margin: 0` just to be bulletproof.
content = content.replace('className="w-full h-auto !aspect-[1.9/1] !rounded-t-2xl"', 'className="w-full h-auto aspect-[1.9/1] rounded-t-2xl m-0 p-0" style={{ width: "100%", maxWidth: "100%", margin: 0 }}')

with open('src/components/accounts/credit-card-item.tsx', 'w') as f:
    f.write(content)

# 3. Double check CreditCardVisual forceFlat wrapper to ensure absolutely 0 margins
with open('src/components/accounts/credit-card-visual.tsx', 'r') as f:
    cv = f.read()

# Make the wrapper totally clean
cv = cv.replace('<div className={cn("relative cursor-pointer", sizeClasses[size], className)} onClick={handleCardClick}>',
                '<div className={cn("relative cursor-pointer w-full m-0 p-0", className)} onClick={handleCardClick} style={{ width: "100%", maxWidth: "100%", margin: 0 }}>')

with open('src/components/accounts/credit-card-visual.tsx', 'w') as f:
    f.write(cv)

print("Applied brutalist layout enforcement.")
