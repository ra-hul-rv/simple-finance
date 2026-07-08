'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Navbar } from '@/components/layout/navbar';
import { MobileNav } from '@/components/layout/mobile-nav';
import { cn } from '@/lib/utils';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />

      {/* Main content wrapper */}
      <div
        className={cn(
          "flex flex-col min-h-screen transition-all duration-300 ease-in-out",
          collapsed ? "lg:pl-[68px]" : "lg:pl-[260px]"
        )}
      >
        {/* Top Navbar */}
        <Navbar />

        {/* Mobile Nav */}
        <MobileNav />

        {/* Content area */}
        <main className="flex-grow p-4 md:p-6 pb-24 md:pb-6 gradient-mesh max-w-[1600px] mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
