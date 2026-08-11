'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Database, Download, Webhook, Key, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function AdvancedTab({ settings, onUpdate }: { settings: any, onUpdate: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [webhookToken, setWebhookToken] = useState(settings?.webhookToken || '');
  const [isExporting, setIsExporting] = useState(false);

  const generateToken = () => {
    const token = Array.from(crypto.getRandomValues(new Uint8Array(24)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    setWebhookToken(token);
  };

  const handleSaveToken = () => {
    startTransition(async () => {
      try {
        // Use the dedicated webhook-token endpoint
        const res = await fetch('/api/settings/webhook-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: webhookToken }),
        });

        if (!res.ok) throw new Error('Failed to save webhook token');
        
        const data = await res.json();
        setWebhookToken(data.token);
        toast.success('Webhook token saved successfully');
        onUpdate();
      } catch (err: any) {
        toast.error(err.message);
      }
    });
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const response = await fetch('/api/settings/export');
      if (!response.ok) throw new Error('Failed to export data');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `simple-finance-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Data exported successfully');
    } catch (error) {
      console.error(error);
      toast.error('Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Card className="glass border-border bg-card/60 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-indigo-500" />
            Data Management
          </CardTitle>
          <CardDescription>Export your financial data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl border border-border/20 bg-background/20">
            <div>
              <h4 className="font-semibold">Export JSON</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Download all your accounts, transactions, categories, and settings as a JSON file.
              </p>
            </div>
            <Button onClick={handleExportData} disabled={isExporting} variant="outline" className="gap-2">
              {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Export Data
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="glass border-border bg-card/60 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5 text-amber-500" />
            n8n Webhook & API Integration
          </CardTitle>
          <CardDescription>Configure webhook token and copy API endpoints for n8n SMS automations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Webhook Auth Token</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  value={webhookToken} 
                  onChange={e => setWebhookToken(e.target.value)}
                  placeholder="Paste or generate a secure token..."
                  className="pl-9 bg-background/50 font-mono text-xs"
                />
              </div>
              <Button variant="outline" onClick={generateToken} title="Generate new secure token">
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button onClick={handleSaveToken} disabled={isPending} className="gradient-primary text-white">
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Use this token in the <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[11px]">Authorization: Bearer &lt;TOKEN&gt;</code> header of your n8n HTTP Request node.
            </p>
          </div>

          <div className="space-y-3 pt-2 border-t border-border/30">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Generated n8n API Webhook URLs</h4>

            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-background/40 border border-border/40 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">1. n8n SMS Ingest Webhook</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">POST</span>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={typeof window !== 'undefined' ? `${window.location.origin}/api/webhooks/n8n` : '/api/webhooks/n8n'}
                    className="h-8 font-mono text-xs bg-background/60"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs shrink-0"
                    onClick={() => {
                      const url = typeof window !== 'undefined' ? `${window.location.origin}/api/webhooks/n8n` : '/api/webhooks/n8n';
                      navigator.clipboard.writeText(url);
                      toast.success('Copied n8n webhook URL to clipboard');
                    }}
                  >
                    Copy
                  </Button>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-background/40 border border-border/40 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">2. UPI Template Auto-Match & Capture Endpoint</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">POST</span>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={typeof window !== 'undefined' ? `${window.location.origin}/api/upi-templates/lookup` : '/api/upi-templates/lookup'}
                    className="h-8 font-mono text-xs bg-background/60"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs shrink-0"
                    onClick={() => {
                      const url = typeof window !== 'undefined' ? `${window.location.origin}/api/upi-templates/lookup` : '/api/upi-templates/lookup';
                      navigator.clipboard.writeText(url);
                      toast.success('Copied UPI lookup URL to clipboard');
                    }}
                  >
                    Copy
                  </Button>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-background/40 border border-border/40 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">3. UPI Templates List / Create Endpoint</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 border border-blue-500/20">GET / POST</span>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={typeof window !== 'undefined' ? `${window.location.origin}/api/upi-templates` : '/api/upi-templates'}
                    className="h-8 font-mono text-xs bg-background/60"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs shrink-0"
                    onClick={() => {
                      const url = typeof window !== 'undefined' ? `${window.location.origin}/api/upi-templates` : '/api/upi-templates';
                      navigator.clipboard.writeText(url);
                      toast.success('Copied UPI templates API URL to clipboard');
                    }}
                  >
                    Copy
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
