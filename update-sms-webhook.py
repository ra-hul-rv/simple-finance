import sys

with open('src/app/api/webhooks/sms/route.ts', 'r') as f:
    content = f.read()

new_logic = """
    // Save directly to RawMessage for the AI Inbox page
    try {
      await prisma.rawMessage.create({
        data: {
          userId,
          source: 'sms',
          content: message || rawBody || ''
        }
      });
    } catch (err) {
      console.error('[SMS Webhook] Failed to save raw message:', err);
    }

    // 9. Save directly to InboxEvent for the AI Inbox page"""

content = content.replace('// 9. Save directly to InboxEvent for the AI Inbox page', new_logic)

with open('src/app/api/webhooks/sms/route.ts', 'w') as f:
    f.write(content)

print("Updated SMS webhook")
