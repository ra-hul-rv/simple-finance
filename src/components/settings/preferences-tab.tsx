'use client';

import { useState, useEffect, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Settings2, Palette, LayoutDashboard, Loader2, CheckCircle2 } from 'lucide-react';
import { SidebarEditor } from './sidebar-editor';
import { THEMES } from '@/lib/themes';
import { useColorTheme } from '@/components/color-theme-provider';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';

export function PreferencesTab({ settings, onUpdate }: { settings: any, onUpdate: () => void }) {
  const [isPending, startTransition] = useTransition();
  const { setColorTheme } = useColorTheme();
  const { setTheme } = useTheme();
  
  const [formData, setFormData] = useState({
    currency: settings?.currency || 'INR',
    dateFormat: settings?.dateFormat || 'dd/MM/yyyy',
    locale: settings?.locale || 'en-IN',
    theme: settings?.theme || 'system',
    colorTheme: settings?.colorTheme || 'selvault',
    defaultAccountId: settings?.defaultAccountId || 'none',
    showDashboardCharts: settings?.showDashboardCharts ?? true,
    showAccountsCharts: settings?.showAccountsCharts ?? true,
    showBillsCharts: settings?.showBillsCharts ?? true,
    sidebarLayout: settings?.sidebarLayout || null,
  });
  
  const [accounts, setAccounts] = useState<any[]>([]);

  useEffect(() => {
    // Fetch accounts for the default account dropdown
    fetch('/api/accounts')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setAccounts(data);
      })
      .catch(console.error);
  }, []);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === 'colorTheme') {
      setColorTheme(value);
    }
    if (field === 'theme') {
      setTheme(value);
    }
  };

  const handleSave = () => {
    startTransition(async () => {
      try {
        const payload = {
          ...formData,
          defaultAccountId: formData.defaultAccountId === 'none' ? null : formData.defaultAccountId,
        };

        const res = await fetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) throw new Error('Failed to update preferences');
        
        toast.success('Preferences saved successfully');
        onUpdate();
      } catch (err: any) {
        toast.error(err.message);
      }
    });
  };

  const handleApplyLayout = async (layoutString: string) => {
    const payload = {
      ...formData,
      sidebarLayout: layoutString,
      defaultAccountId: formData.defaultAccountId === 'none' ? null : formData.defaultAccountId,
    };

    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      console.error('Save failed:', errorData);
      throw new Error(errorData.error || 'Failed to update preferences');
    }
    
    setFormData(prev => ({ ...prev, sidebarLayout: layoutString }));
    onUpdate();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Card className="glass border-border bg-card/60 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-emerald-500" />
            General Preferences
          </CardTitle>
          <CardDescription>Configure regional settings and defaults</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Currency Code</Label>
              <Input 
                value={formData.currency} 
                onChange={e => handleChange('currency', e.target.value)} 
                placeholder="e.g. INR, USD"
                className="bg-background/50 uppercase"
              />
            </div>
            <div className="space-y-2">
              <Label>Date Format</Label>
              <Select value={formData.dateFormat} onValueChange={v => handleChange('dateFormat', v)}>
                <SelectTrigger className="bg-background/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="dd/MM/yyyy">DD/MM/YYYY (31/12/2023)</SelectItem>
                  <SelectItem value="MM/dd/yyyy">MM/DD/YYYY (12/31/2023)</SelectItem>
                  <SelectItem value="yyyy-MM-dd">YYYY-MM-DD (2023-12-31)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Locale</Label>
              <Select value={formData.locale} onValueChange={v => handleChange('locale', v)}>
                <SelectTrigger className="bg-background/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="en-IN">English (India)</SelectItem>
                  <SelectItem value="en-US">English (US)</SelectItem>
                  <SelectItem value="en-GB">English (UK)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Default Account</Label>
              <Select value={formData.defaultAccountId} onValueChange={v => handleChange('defaultAccountId', v)}>
                <SelectTrigger className="bg-background/50">
                  <SelectValue placeholder="Select default account" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {accounts.map(acc => (
                    <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">Pre-selected in new transactions</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass border-border bg-card/60 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-indigo-500" />
            Appearance
          </CardTitle>
          <CardDescription>Customize how the application looks</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h4 className="text-sm font-semibold">Color Theme</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {THEMES.map((theme) => {
                const isActive = formData.colorTheme === theme.id;
                return (
                  <div
                    key={theme.id}
                    onClick={() => handleChange('colorTheme', theme.id)}
                    className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all ${
                      isActive ? 'border-primary bg-primary/5' : 'border-border/50 bg-background/50 hover:border-primary/50 hover:bg-background'
                    }`}
                  >
                    {isActive && (
                      <div className="absolute top-3 right-3 text-primary">
                        <CheckCircle2 className="h-5 w-5" />
                      </div>
                    )}
                    <div className="mb-3 font-semibold text-sm">{theme.name}</div>
                    <p className="mb-4 text-xs text-muted-foreground line-clamp-2 min-h-[32px]">{theme.description}</p>
                    <div className="flex gap-2">
                      <div className="h-6 w-6 rounded-full border border-border/50 shadow-sm" style={{ background: theme.colors.primary }} title="Primary" />
                      <div className="h-6 w-6 rounded-full border border-border/50 shadow-sm" style={{ background: theme.colors.background }} title="Background" />
                      <div className="h-6 w-6 rounded-full border border-border/50 shadow-sm" style={{ background: theme.colors.card }} title="Card" />
                      <div className="h-6 w-6 rounded-full border border-border/50 shadow-sm" style={{ background: theme.colors.accent }} title="Accent" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-2 max-w-sm pt-4">
            <Label>Light / Dark Mode</Label>
            <Select value={formData.theme} onValueChange={v => handleChange('theme', v)}>
              <SelectTrigger className="bg-background/50"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="system">System Default</SelectItem>
                <SelectItem value="light">Light Mode</SelectItem>
                <SelectItem value="dark">Dark Mode</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground pt-1">Changes the base scheme. Note that some color themes only define a dark mode.</p>
          </div>
          
          <div className="space-y-4 pt-6 border-t border-border/50">
            <h4 className="text-sm font-semibold">Chart Visibility</h4>
            <div className="space-y-4 bg-background/20 p-4 rounded-xl border border-border/20">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Dashboard Charts</Label>
                  <p className="text-xs text-muted-foreground">Show overview charts on main dashboard</p>
                </div>
                <Switch 
                  checked={formData.showDashboardCharts} 
                  onCheckedChange={v => handleChange('showDashboardCharts', v)} 
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Accounts Charts</Label>
                  <p className="text-xs text-muted-foreground">Show history charts on accounts page</p>
                </div>
                <Switch 
                  checked={formData.showAccountsCharts} 
                  onCheckedChange={v => handleChange('showAccountsCharts', v)} 
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Bills Charts</Label>
                  <p className="text-xs text-muted-foreground">Show forecasting charts for recurring bills</p>
                </div>
                <Switch 
                  checked={formData.showBillsCharts} 
                  onCheckedChange={v => handleChange('showBillsCharts', v)} 
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <SidebarEditor layout={formData.sidebarLayout} onApplyLayout={handleApplyLayout} />

      <div className="flex justify-end sticky bottom-6 z-10 pt-4">
        <Button onClick={handleSave} disabled={isPending} className="gradient-primary text-white shadow-lg w-full sm:w-auto">
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Preferences
        </Button>
      </div>
    </div>
  );
}
