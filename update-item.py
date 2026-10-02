import sys
import re

with open('src/components/accounts/credit-card-item.tsx', 'r') as f:
    content = f.read()

# Replace the CreditCardVisual part with forceFlat and a smaller aspect ratio
old_visual_block = """        <div className="w-full flex items-center justify-center p-0">
          <CreditCardVisual
            template={template}
            cardNumber={cc.cardNumber}
            lastFourDigits={cc.lastFourDigits}
            cardHolderName={cc.cardHolderName}
            expiryDate={cc.expiryDate}
            cvv={cc.cvv}
            size="full"
            className="w-full h-auto !aspect-[1.586/1] !rounded-none [&>div>div]:!rounded-none [&>div>div]:!border-0 [&>div>div]:!shadow-none"
          />
        </div>"""

new_visual_block = """        <div className="w-full flex items-center justify-center p-0">
          <CreditCardVisual
            template={template}
            cardNumber={cc.cardNumber}
            lastFourDigits={cc.lastFourDigits}
            cardHolderName={cc.cardHolderName}
            expiryDate={cc.expiryDate}
            cvv={cc.cvv}
            size="full"
            forceFlat={true}
            className="w-full h-auto !aspect-[1.9/1]"
          />
        </div>"""

content = content.replace(old_visual_block, new_visual_block)

# Remove the negative border radius hacks or anything that prevents the container's rounded corners
content = content.replace("overflow-hidden border-b border-border/50 bg-black", "overflow-hidden border-b border-border/20")

with open('src/components/accounts/credit-card-item.tsx', 'w') as f:
    f.write(content)
