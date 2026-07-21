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
        const res = await fetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ webhookToken }),
        });

        if (!res.ok) throw new Error('Failed to save webhook token');
        
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
            n8n Webhook Integration
          </CardTitle>
          <CardDescription>Configure token for automated transaction ingestion via n8n</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Webhook Auth Token</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  value={webhookToken} 
                  onChange={e => setWebhookToken(e.target.value)}
                  placeholder="Paste or generate a secure token..."
                  className="pl-9 bg-background/50 font-mono"
                />
              </div>
              <Button variant="outline" onClick={generateToken} title="Generate new secure token">
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button onClick={handleSaveToken} disabled={isPending} className="gradient-primary text-white">
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Use this token in your n8n workflows to authenticate requests to the Simple Finance API.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
