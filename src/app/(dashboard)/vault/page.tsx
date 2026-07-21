'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CouponsTab } from './coupons-tab';
import { WarrantiesTab } from './warranties-tab';
import { Vault, FileText, Lock, ShieldCheck, Ticket } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';

export default function VaultPage() {
  const [activeTab, setActiveTab] = useState('coupons');

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <PageHeader 
        title="Safe Vault" 
        description="Securely store your coupons, warranties, and important documents in one place."
      />

      <Tabs defaultValue="coupons" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 w-full max-w-md h-12 bg-card/50 border border-border/40 rounded-xl p-1">
          <TabsTrigger value="coupons" className="rounded-lg data-[state=active]:bg-pink-500/10 data-[state=active]:text-pink-500 text-xs font-bold gap-2">
            <Ticket className="h-4 w-4" />
            Coupons
          </TabsTrigger>
          <TabsTrigger value="warranties" className="rounded-lg data-[state=active]:bg-violet-500/10 data-[state=active]:text-violet-500 text-xs font-bold gap-2">
            <ShieldCheck className="h-4 w-4" />
            Warranties
          </TabsTrigger>
          <TabsTrigger value="documents" disabled className="rounded-lg opacity-50 text-xs font-bold gap-2">
            <FileText className="h-4 w-4" />
            Documents
            <Lock className="h-3 w-3 ml-1" />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="coupons" className="mt-6 focus-visible:outline-none focus-visible:ring-0">
          <CouponsTab />
        </TabsContent>

        <TabsContent value="warranties" className="mt-6 focus-visible:outline-none focus-visible:ring-0">
          <WarrantiesTab />
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <div className="flex flex-col items-center justify-center py-20 text-center bg-card/20 border border-dashed border-border/40 rounded-2xl">
            <Lock className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-bold text-foreground">Document Storage</h3>
            <p className="text-sm text-muted-foreground max-w-md mt-2">
              This feature is coming soon. You'll be able to securely store receipts, identity documents, and other important files here.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
