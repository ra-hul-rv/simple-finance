'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { PageHeader } from '@/components/shared/page-header';
import { ProfileTab } from '@/components/settings/profile-tab';
import { PreferencesTab } from '@/components/settings/preferences-tab';
import { AdvancedTab } from '@/components/settings/advanced-tab';
import { FlowTypesTab } from '@/components/settings/flow-types-tab';
import { TemplatesTab } from '@/components/settings/templates-tab';
import { User, Settings2, Zap, FileSpreadsheet, KeySquare, ChevronRight, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';

type TabId = 'profile' | 'preferences' | 'flow-types' | 'templates' | 'advanced';

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState<TabId>('profile');
  const [settings, setSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        setSettings(await res.json());
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      fetchSettings();
    }
  }, [status]);

  if (status === 'loading' || isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm">Loading settings...</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'profile', label: 'Profile & Security', icon: User, desc: 'Manage credentials and data' },
    { id: 'preferences', label: 'Preferences', icon: Settings2, desc: 'Appearance, locale, and layout' },
    { id: 'flow-types', label: 'Flow Types', icon: Zap, desc: 'Custom transaction directions' },
    { id: 'templates', label: 'Templates', icon: FileSpreadsheet, desc: 'Fast transaction presets' },
    { id: 'advanced', label: 'Advanced', icon: KeySquare, desc: 'Export and API integrations' },
  ] as const;

  return (
    <div className="space-y-6 pb-12 max-w-[1200px] mx-auto">
      <PageHeader title="Settings" description="Manage your account, preferences, and application configuration" />

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar */}
        <aside className="w-full md:w-[260px] flex-shrink-0">
          <Card className="glass border-border bg-card/60 backdrop-blur-xl p-2 sticky top-6">
            <nav className="space-y-1">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'hover:bg-accent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-3 text-left">
                    <tab.icon className={`h-4 w-4 ${activeTab === tab.id ? 'text-primary' : 'text-muted-foreground'}`} />
                    <div>
                      <div className="text-sm">{tab.label}</div>
                      {/* Only show desc on desktop to save space on mobile */}
                      <div className="text-[10px] hidden md:block font-normal opacity-70 mt-0.5">{tab.desc}</div>
                    </div>
                  </div>
                  {activeTab === tab.id && <ChevronRight className="h-4 w-4" />}
                </button>
              ))}
            </nav>
            <div className="mt-8 px-4 pb-2">
              <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/50">System</p>
              <p className="text-xs text-muted-foreground mt-1">Simple Finance v2.0</p>
            </div>
          </Card>
        </aside>

        {/* Content Area */}
        <main className="flex-1 min-w-0">
          {activeTab === 'profile' && <ProfileTab session={session} />}
          {activeTab === 'preferences' && <PreferencesTab settings={settings} onUpdate={fetchSettings} />}
          {activeTab === 'flow-types' && <FlowTypesTab />}
          {activeTab === 'templates' && <TemplatesTab />}
          {activeTab === 'advanced' && <AdvancedTab settings={settings} onUpdate={fetchSettings} />}
        </main>
      </div>
    </div>
  );
}
