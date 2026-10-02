import sys
import re

with open('src/lib/card-templates.ts', 'r') as f:
    content = f.read()

# SBI_CASHBACK
content = re.sub(
    r"(id:\s*'SBI_CASHBACK'[\s\S]*?gradient:\s*)'[^']+'([\s\S]*?textColor:\s*)'[^']+'([\s\S]*?accentColor:\s*)'[^']+'",
    r"\1'linear-gradient(135deg, #4c1d95 0%, #3b0764 100%)'\2'text-white'\3'#fde047'",
    content
)

# SBI_SIMPLY_CLICK
content = re.sub(
    r"(id:\s*'SBI_SIMPLY_CLICK'[\s\S]*?gradient:\s*)'[^']+'([\s\S]*?textColor:\s*)'[^']+'([\s\S]*?accentColor:\s*)'[^']+'",
    r"\1'linear-gradient(135deg, #833e46 0%, #632e36 100%)'\2'text-white'\3'#ffffff'",
    content
)

# ICICI_RUBYX
content = re.sub(
    r"(id:\s*'ICICI_RUBYX'[\s\S]*?gradient:\s*)'[^']+'([\s\S]*?textColor:\s*)'[^']+'([\s\S]*?accentColor:\s*)'[^']+'",
    r"\1'linear-gradient(135deg, #b91c1c 0%, #000000 60%, #000000 100%)'\2'text-white'\3'#ff0000'",
    content
)

# ICICI_AMAZON_PAY
content = re.sub(
    r"(id:\s*'ICICI_AMAZON_PAY'[\s\S]*?gradient:\s*)'[^']+'([\s\S]*?textColor:\s*)'[^']+'([\s\S]*?accentColor:\s*)'[^']+'",
    r"\1'linear-gradient(135deg, #2a2a2a 0%, #171717 100%)'\2'text-[#e5e5e5]'\3'#f59e0b'",
    content
)

with open('src/lib/card-templates.ts', 'w') as f:
    f.write(content)
print("Updated more templates")
