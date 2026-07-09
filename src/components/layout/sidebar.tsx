'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  Tag,
  PiggyBank,
  Repeat,
  CreditCard,
  TrendingUp,
  BarChart3,
  FileText,
  Settings,
  Landmark,
  Receipt,
  DollarSign,
  ChevronLeft,
  Sparkles,
  ArrowDownRight,
  ArrowUpRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { motion, AnimatePresence } from 'framer-motion';

const mainNav = [
  { title: 'Dashboard', href: '/', icon: LayoutDashboard },
  { title: 'Accounts', href: '/accounts', icon: Wallet },
  { title: 'Transactions', href: '/transactions', icon: ArrowLeftRight },
  { title: 'Income', href: '/income', icon: DollarSign },
  { title: 'Categories', href: '/categories', icon: Tag },
];

const financeNav = [
  { title: 'Budgets', href: '/budgets', icon: PiggyBank },
  { title: 'Bills & Subs', href: '/recurring', icon: Repeat },
  { title: 'Credit Cards', href: '/credit-cards', icon: CreditCard },
  { title: 'Fixed Deposits', href: '/fixed-deposits', icon: Landmark },
  { title: 'Investments', href: '/investments', icon: TrendingUp },
  { title: 'Debts (+)', href: '/debts', icon: ArrowDownRight },
  { title: 'Loans (-)', href: '/loans', icon: ArrowUpRight },
];

const analyticsNav = [
  { title: 'Analytics', href: '/analytics', icon: BarChart3 },
  { title: 'Reports', href: '/reports', icon: FileText },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();

  const NavItem = ({ item }: { item: { title: string; href: string; icon: React.ElementType } }) => {
    const isActive = pathname === item.href || 
      (item.href !== '/' && pathname.startsWith(item.href));
    const Icon = item.icon;

    const content = (
      <Link
        href={item.href}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
          'hover:bg-accent hover:text-accent-foreground',
          isActive
            ? 'bg-primary/10 text-primary shadow-sm'
            : 'text-muted-foreground',
          collapsed && 'justify-center px-2'
        )}
      >
        <Icon className={cn('h-4 w-4 shrink-0', isActive && 'text-primary')} />
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            className="truncate"
          >
            {item.title}
          </motion.span>
        )}
        {isActive && !collapsed && (
          <motion.div
            layoutId="sidebar-active"
            className="ml-auto h-1.5 w-1.5 rounded-full bg-primary"
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
          />
        )}
      </Link>
    );

    if (collapsed) {
      return (
        <Tooltip>
          <TooltipTrigger>{content}</TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {item.title}
          </TooltipContent>
        </Tooltip>
      );
    }

    return content;
  };

  const NavSection = ({ title, items }: { title: string; items: typeof mainNav }) => (
    <div className="space-y-1">
      {!collapsed && (
        <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
          {title}
        </p>
      )}
      {collapsed && <Separator className="my-2" />}
      {items.map((item) => (
        <NavItem key={item.href} item={item} />
      ))}
    </div>
  );

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 68 : 260 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={cn(
        'fixed left-0 top-0 z-30 flex h-screen flex-col border-r border-sidebar-border bg-sidebar',
        'hidden lg:flex'
      )}
    >
      {/* Logo */}
      <div className={cn(
        'flex h-16 items-center border-b border-sidebar-border px-4',
        collapsed && 'justify-center px-2'
      )}>
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="text-lg font-bold tracking-tight"
              >
                Simple Finance
              </motion.span>
            )}
          </AnimatePresence>
        </Link>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <div className="space-y-6">
          <NavSection title="Overview" items={mainNav} />
          <NavSection title="Finance" items={financeNav} />
          <NavSection title="Insights" items={analyticsNav} />
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-3">
        <NavItem
          item={{ title: 'Settings', href: '/settings', icon: Settings }}
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className={cn(
            'mt-2 w-full justify-center text-muted-foreground hover:text-foreground',
          )}
        >
          <ChevronLeft
            className={cn(
              'h-4 w-4 transition-transform duration-200',
              collapsed && 'rotate-180'
            )}
          />
          {!collapsed && <span className="ml-2 text-xs">Collapse</span>}
        </Button>
      </div>
    </motion.aside>
  );
}
