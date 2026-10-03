import sys

with open('src/app/(dashboard)/accounts/[id]/page.tsx', 'r') as f:
    content = f.read()

if "import { Tabs" not in content:
    content = content.replace("import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';", 
                              "import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';\nimport { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';")

with open('src/app/(dashboard)/accounts/[id]/page.tsx', 'w') as f:
    f.write(content)

print("Fixed imports")
