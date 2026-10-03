import sys

with open('prisma/schema.prisma', 'r') as f:
    content = f.read()

# Add RawMessage model
if 'model RawMessage' not in content:
    raw_message_model = """
model RawMessage {
  id          String   @id @default(uuid())
  source      String
  content     String   @db.Text
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}
"""
    content += raw_message_model
    
# Add to User model
if 'rawMessages   RawMessage[]' not in content:
    content = content.replace('inboxEvents   InboxEvent[]', 'inboxEvents   InboxEvent[]\n  rawMessages   RawMessage[]')

with open('prisma/schema.prisma', 'w') as f:
    f.write(content)
