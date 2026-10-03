import sys

with open('prisma/schema.prisma', 'r') as f:
    content = f.read()

if 'rawMessages' not in content:
    content = content.replace('inboxEvents           InboxEvent[]', 'inboxEvents           InboxEvent[]\n  rawMessages           RawMessage[]')

with open('prisma/schema.prisma', 'w') as f:
    f.write(content)
