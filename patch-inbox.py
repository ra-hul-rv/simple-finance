import sys
import re

with open('src/app/(dashboard)/inbox/page.tsx', 'r') as f:
    content = f.read()

# 1. State
state_injection = """  const [events, setEvents] = useState<InboxEvent[]>([]);
  const [rawMessages, setRawMessages] = useState<any[]>([]);
  const [editingRawMsg, setEditingRawMsg] = useState<any | null>(null);
  const [editingRawMsgContent, setEditingRawMsgContent] = useState('');
"""
content = content.replace('  const [events, setEvents] = useState<InboxEvent[]>([]);\n', state_injection)

# 2. Fetch data
old_fetch = """      const [eventsRes, catsRes, accsRes, settingsRes, rulesRes, flowRes] = await Promise.all([
        fetch('/api/inbox'),
        fetch('/api/categories'),
        fetch('/api/accounts'),
        fetch('/api/settings'),
        fetch('/api/sms-rules'),
        fetch('/api/flow-types'),
      ]);"""

new_fetch = """      const [eventsRes, catsRes, accsRes, settingsRes, rulesRes, flowRes, rawMsgRes] = await Promise.all([
        fetch('/api/inbox'),
        fetch('/api/categories'),
        fetch('/api/accounts'),
        fetch('/api/settings'),
        fetch('/api/sms-rules'),
        fetch('/api/flow-types'),
        fetch('/api/raw-messages'),
      ]);"""

content = content.replace(old_fetch, new_fetch)

old_set_res = """      if (rulesRes.ok) setRules(await rulesRes.json());
      if (flowRes.ok) setFlowTypes(await flowRes.json());"""
new_set_res = """      if (rulesRes.ok) setRules(await rulesRes.json());
      if (flowRes.ok) setFlowTypes(await flowRes.json());
      if (rawMsgRes.ok) setRawMessages(await rawMsgRes.json());"""

content = content.replace(old_set_res, new_set_res)

# 3. Handlers for raw messages
handlers = """
  const handleDeleteRawMsg = async (id: string) => {
    if (!confirm('Delete this raw message?')) return;
    try {
      const res = await fetch(`/api/raw-messages/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Deleted');
        setRawMessages(prev => prev.filter(m => m.id !== id));
      } else throw new Error();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const handleSaveRawMsgEdit = async () => {
    if (!editingRawMsg) return;
    try {
      const res = await fetch(`/api/raw-messages/${editingRawMsg.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editingRawMsgContent })
      });
      if (res.ok) {
        toast.success('Saved');
        fetchData();
        setEditingRawMsg(null);
      } else throw new Error();
    } catch {
      toast.error('Failed to save');
    }
  };

  // ─── End Raw Msg ───
"""
content = content.replace('  // ─── Delete ────────────────────────────────────────────', handlers + '  // ─── Delete ────────────────────────────────────────────')

# 4. TabsTrigger
old_tabs_trigger = """            <TabsTrigger
              value="rules"
              className="gap-2 px-4 py-2 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg"
            >
              <Sparkles className="h-4 w-4 text-primary" />
              <span>AI Rules & Notes</span>
              {rules.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-[10px] h-5 px-1.5 rounded-md bg-primary/10 text-primary border-primary/20">
                  {rules.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>"""

new_tabs_trigger = old_tabs_trigger.replace('          </TabsList>', """            <TabsTrigger
              value="raw-messages"
              className="gap-2 px-4 py-2 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg"
            >
              <FileText className="h-4 w-4" />
              <span>Raw Messages</span>
              {rawMessages.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-[10px] h-5 px-1.5 rounded-md">
                  {rawMessages.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>""")
content = content.replace(old_tabs_trigger, new_tabs_trigger)

# 5. Tab Content
tab_content = """
          {/* Raw Messages Tab */}
          {activeMainTab === 'raw-messages' && (
            <div className="space-y-4">
              {rawMessages.length === 0 ? (
                <div className="text-center py-12 px-4 border border-dashed border-border/60 rounded-xl bg-card/20">
                  <FileText className="mx-auto h-8 w-8 text-muted-foreground/50 mb-3" />
                  <h3 className="text-sm font-semibold text-foreground mb-1">No Raw Messages</h3>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Webhook payloads and SMS messages will appear here exactly as they are received.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {rawMessages.map((msg) => (
                    <Card key={msg.id} className="relative overflow-hidden group flex flex-col">
                      <div className="p-4 flex flex-col flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <Badge variant="outline" className="text-[10px] uppercase">{msg.source}</Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {format(new Date(msg.createdAt), 'MMM d, h:mm a')}
                          </span>
                        </div>
                        <div className="bg-muted/30 p-3 rounded-lg flex-1 overflow-hidden">
                          <pre className="text-[10px] font-mono whitespace-pre-wrap break-all text-muted-foreground h-full max-h-40 overflow-y-auto">
                            {msg.content}
                          </pre>
                        </div>
                        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border/50">
                          <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={() => {
                            setEditingRawMsg(msg);
                            setEditingRawMsgContent(msg.content);
                          }}>
                            <Edit2 className="h-3 w-3 mr-1.5" /> Edit
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteRawMsg(msg.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
"""

content = content.replace('{/* ─── Inbox Content ────────────────────────────── */}', tab_content + '\n          {/* ─── Inbox Content ────────────────────────────── */}')

# 6. Edit Dialog
dialog = """
      <Dialog open={!!editingRawMsg} onOpenChange={(open) => !open && setEditingRawMsg(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Raw Message</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              className="font-mono text-xs min-h-[300px]"
              value={editingRawMsgContent}
              onChange={(e) => setEditingRawMsgContent(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRawMsg(null)}>Cancel</Button>
            <Button onClick={handleSaveRawMsgEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
"""
content = content.replace('      {/* ─── Add / Edit Rule Dialog ─────────────────────── */}', dialog + '\n      {/* ─── Add / Edit Rule Dialog ─────────────────────── */}')

with open('src/app/(dashboard)/inbox/page.tsx', 'w') as f:
    f.write(content)

print("Patched inbox page")
