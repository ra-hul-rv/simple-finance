import sys
import re

with open('src/lib/card-templates.ts', 'r') as f:
    content = f.read()

# FEDERAL_SCAPIA
content = re.sub(
    r"(id:\s*'FEDERAL_SCAPIA'[\s\S]*?gradient:\s*)'[^']+'([\s\S]*?textColor:\s*)'[^']+'([\s\S]*?accentColor:\s*)'[^']+'",
    r"\1'linear-gradient(135deg, #ff2a00 0%, #d41f00 100%)'\2'text-white'\3'#ffffff'",
    content
)

# AXIS_MYZONE
content = re.sub(
    r"(id:\s*'AXIS_MYZONE'[\s\S]*?gradient:\s*)'[^']+'([\s\S]*?textColor:\s*)'[^']+'([\s\S]*?accentColor:\s*)'[^']+'",
    r"\1'linear-gradient(135deg, #171717 0%, #4f0a2d 100%)'\2'text-white'\3'#e2e8f0'",
    content
)

# AXIS_FLIPKART
content = re.sub(
    r"(id:\s*'AXIS_FLIPKART'[\s\S]*?gradient:\s*)'[^']+'([\s\S]*?textColor:\s*)'[^']+'([\s\S]*?accentColor:\s*)'[^']+'",
    r"\1'linear-gradient(135deg, #121212 0%, #1e1329 100%)'\2'text-white'\3'#FFC200'",
    content
)

# AXIS_AIRTEL
content = re.sub(
    r"(id:\s*'AXIS_AIRTEL'[\s\S]*?gradient:\s*)'[^']+'([\s\S]*?textColor:\s*)'[^']+'([\s\S]*?accentColor:\s*)'[^']+'",
    r"\1'linear-gradient(135deg, #09090b 0%, #141417 100%)'\2'text-white'\3'#E40000'",
    content
)

# YES_BANK_KIWI
content = re.sub(
    r"(id:\s*'YES_BANK_KIWI'[\s\S]*?gradient:\s*)'[^']+'([\s\S]*?textColor:\s*)'[^']+'([\s\S]*?accentColor:\s*)'[^']+'",
    r"\1'linear-gradient(135deg, #a3e635 0%, #84cc16 100%)'\2'text-slate-900'\3'#000000'",
    content
)

with open('src/lib/card-templates.ts', 'w') as f:
    f.write(content)
print("Updated templates")
