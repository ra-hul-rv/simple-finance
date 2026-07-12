'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  PiggyBank,
  BarChart3,
  Menu,
  X,
  Tag,
  Repeat,
  TrendingUp,
  Settings,
  FileText,
  DollarSign,
  Receipt,
  Landmark,
  Sparkles,
  ArrowDownRight,
  ArrowUpRight,
  ShoppingBag,
  ShieldCheck,
  Ticket,
  Cpu,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LogOut } from 'lucide-react';

const bottomNavItems = [
  { title: 'Home', href: '/', icon: LayoutDashboard },
  { title: 'Accounts', href: '/accounts', icon: Wallet },
  { title: 'Transactions', href: '/transactions', icon: ArrowLeftRight },
  { title: 'Budgets', href: '/budgets', icon: PiggyBank },
  { title: 'Analytics', href: '/analytics', icon: BarChart3 },
];

const allNavItems = [
  { section: 'Overview', items: [
    { title: 'Dashboard', href: '/', icon: LayoutDashboard },
    { title: 'Accounts', href: '/accounts', icon: Wallet },
    { title: 'Transactions', href: '/transactions', icon: ArrowLeftRight },
    { title: 'Income', href: '/income', icon: DollarSign },
    { title: 'Categories', href: '/categories', icon: Tag },
  ]},
  { section: 'Finance', items: [
    { title: 'Budgets', href: '/budgets', icon: PiggyBank },
    { title: 'Recurring', href: '/recurring', icon: Repeat },
    { title: 'Subscriptions', href: '/subscriptions', icon: Receipt },
    { title: 'Fixed Deposits', href: '/fixed-deposits', icon: Landmark },
    { title: 'Investments', href: '/investments', icon: TrendingUp },
    { title: 'Debts (+)', href: '/debts', icon: ArrowDownRight },
    { title: 'Loans (-)', href: '/loans', icon: ArrowUpRight },
    { title: 'Shopping List', href: '/shopping', icon: ShoppingBag },
    { title: 'Warranties', href: '/warranties', icon: ShieldCheck },
    { title: 'Coupons Wallet', href: '/coupons', icon: Ticket },
    { title: 'Automations', href: '/automations', icon: Cpu },
  ]},
  { section: 'Insights', items: [
    { title: 'Analytics', href: '/analytics', icon: BarChart3 },
    { title: 'Reports', href: '/reports', icon: FileText },
  ]},
  { section: 'System', items: [
    { title: 'Settings', href: '/settings', icon: Settings },
  ]},
];

export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { data: session } = useSession();
  const initials = session?.user?.name
    ? session.user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'CU';

  return (
    <>
      {/* Top bar with menu */}
      <div className="fixed left-0 right-0 top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-xl lg:hidden">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg gradient-primary">
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-base font-bold">Simple Finance</span>
        </Link>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72 p-0">
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            <div className="flex h-14 items-center px-4 border-b border-border">
              <span className="text-sm font-semibold">Navigation</span>
            </div>
            <ScrollArea className="h-[calc(100vh-3.5rem)]">
              <div className="space-y-6 p-4">
                {allNavItems.map((section) => (
                  <div key={section.section}>
                    <p className="mb-2 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground/60">
                      {section.section}
                    </p>
                    <div className="space-y-0.5">
                      {section.items.map((item) => {
                        const isActive = pathname === item.href ||
                          (item.href !== '/' && pathname.startsWith(item.href));
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setOpen(false)}
                            className={cn(
                              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-[0.8125rem] font-medium transition-colors',
                              isActive
                                ? 'bg-primary/10 text-primary'
                                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                            )}
                          >
                            <Icon className="h-[1.125rem] w-[1.125rem]" />
                            {item.title}
                          </Link>
                        );
                      })}
                    </div>
                    <Separator className="mt-4" />
                  </div>
                ))}
              </div>
            </ScrollArea>
            {/* Mobile Sheet Profile section */}
            <div className="absolute bottom-0 left-0 right-0 border-t border-border p-4 bg-background">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9 ring-1 ring-border/20">
                    <AvatarFallback className="bg-primary/15 text-primary text-xs font-bold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {session?.user?.name || 'Cloud User'}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {session?.user?.email || 'cloudstoreme111@gmail.com'}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive rounded-lg"
                  onClick={() => signOut({ callbackUrl: '/login' })}
                >
                  <LogOut className="h-4.5 w-4.5" />
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Bottom navigation bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/80 backdrop-blur-xl lg:hidden">
        <div className="flex h-16 items-center justify-around px-2">
          {bottomNavItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center gap-1 px-3 py-1 text-xs font-medium transition-colors min-w-[48px]',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <Icon className={cn('h-5 w-5', isActive && 'text-primary')} />
                <span>{item.title}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
