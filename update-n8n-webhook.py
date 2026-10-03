import sys

with open('src/app/api/webhooks/n8n/route.ts', 'r') as f:
    content = f.read()

new_logic = """
    // Save to RawMessage
    try {
      await prisma.rawMessage.create({
        data: {
          userId,
          source: 'n8n_mail',
          content: JSON.stringify(payload, null, 2)
        }
      });
    } catch (err) {
      console.error('[N8N Webhook] Failed to save raw message:', err);
    }

    // Create inbox event"""

content = content.replace('// Create inbox event', new_logic)

with open('src/app/api/webhooks/n8n/route.ts', 'w') as f:
    f.write(content)

print("Updated N8N webhook")
