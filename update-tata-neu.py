import sys
import re

with open('src/lib/card-templates.ts', 'r') as f:
    content = f.read()

# Replace HDFC_TATA_NEU definition
old_block_pattern = r"id:\s*'HDFC_TATA_NEU',[\s\S]*?chipStyle:\s*'gold',\n\s*}"

new_block = """id: 'HDFC_TATA_NEU',
    name: 'Tata Neu Infinity',
    brand: 'visa',
    gradient: 'linear-gradient(135deg, #2e1065 0%, #1e1b4b 50%, #0f172a 100%)',
    textColor: 'text-white',
    accentColor: '#a855f7',
    pattern: 'aurora',
    logoText: 'TATA NEUCARD',
    cardTitle: 'INFINITY',
    chipStyle: 'silver',
  }"""

content = re.sub(old_block_pattern, new_block, content)

with open('src/lib/card-templates.ts', 'w') as f:
    f.write(content)

print("Updated Tata Neu template")
