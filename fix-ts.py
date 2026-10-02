import sys

with open('src/components/accounts/credit-card-item.tsx', 'r') as f:
    content = f.read()

# Remove the inline style and just use tailwind classes
content = content.replace('className="w-full h-auto aspect-[1.9/1] rounded-t-2xl m-0 p-0" style={{ width: "100%", maxWidth: "100%", margin: 0 }}',
                          'className="!w-full !max-w-full h-auto aspect-[1.9/1] rounded-t-2xl m-0 p-0"')

with open('src/components/accounts/credit-card-item.tsx', 'w') as f:
    f.write(content)
