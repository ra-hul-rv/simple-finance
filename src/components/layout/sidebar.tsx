'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  Tag,
  PiggyBank,
  Repeat,
  TrendingUp,
  BarChart3,
  FileText,
  Settings,
  Landmark,
  Receipt,
  DollarSign,
  ChevronLeft,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { motion, AnimatePresence } from 'framer-motion';
import { signOut, useSession } from 'next-auth/react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User, LogOut, ShoppingBag, ShieldCheck, Ticket, Cpu, Mail, Calendar as CalendarIcon, Users, CreditCard } from 'lucide-react';

const mainNav = [
  { title: 'Dashboard', href: '/', icon: LayoutDashboard },
  { title: 'AI Inbox', href: '/inbox', icon: Mail },
  { title: 'Accounts', href: '/accounts', icon: Wallet },
  { title: 'Transactions', href: '/transactions', icon: ArrowLeftRight },
  { title: 'Income', href: '/income', icon: DollarSign },
  { title: 'Categories', href: '/categories', icon: Tag },
  { title: 'People', href: '/people', icon: Users },
];

const financeNav = [
  { title: 'Budgets', href: '/budgets', icon: PiggyBank },
  { title: 'Bills & Subs', href: '/recurring', icon: Repeat },
  { title: 'Fixed Deposits', href: '/fixed-deposits', icon: Landmark },
  { title: 'Investments', href: '/investments', icon: TrendingUp },
  { title: 'Lending & Debts', href: '/lending', icon: ArrowLeftRight },
  { title: 'EMIs', href: '/emis', icon: CreditCard },
  { title: 'Shopping List', href: '/shopping', icon: ShoppingBag },
  { title: 'Warranties', href: '/warranties', icon: ShieldCheck },
  { title: 'Coupons Wallet', href: '/coupons', icon: Ticket },
  { title: 'Automations', href: '/automations', icon: Cpu },
];

const analyticsNav = [
  { title: 'Calendar', href: '/calendar', icon: CalendarIcon },
  { title: 'Analytics', href: '/analytics', icon: BarChart3 },
  { title: 'Reports', href: '/reports', icon: FileText },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const initials = session?.user?.name
    ? session.user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'CU';

  const [orderedMain, setOrderedMain] = useState(mainNav);
  const [orderedFinance, setOrderedFinance] = useState(financeNav);
  const [orderedAnalytics, setOrderedAnalytics] = useState(analyticsNav);
  const [sectionLabels, setSectionLabels] = useState({
    overview: 'Overview',
    finance: 'Finance',
    insights: 'Insights',
    system: 'System',
  });

  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('sf_sidebar_order');
      if (saved) {
        try {
          const order = JSON.parse(saved) as string[];
          const reorder = (items: typeof mainNav) => {
            return [...items].sort((a, b) => {
              const indexA = order.indexOf(a.href);
              const indexB = order.indexOf(b.href);
              if (indexA === -1 && indexB === -1) return 0;
              if (indexA === -1) return 1;
              if (indexB === -1) return -1;
              return indexA - indexB;
            });
          };
          setOrderedMain(reorder(mainNav));
          setOrderedFinance(reorder(financeNav));
          setOrderedAnalytics(reorder(analyticsNav));
        } catch (e) {
          console.error(e);
        }
      } else {
        setOrderedMain(mainNav);
        setOrderedFinance(financeNav);
        setOrderedAnalytics(analyticsNav);
      }

      const savedLabels = localStorage.getItem('sf_sidebar_section_labels');
      if (savedLabels) {
        try {
          const parsed = JSON.parse(savedLabels);
          setSectionLabels(prev => ({ ...prev, ...parsed }));
        } catch (e) {
          console.error(e);
        }
      }
    };

    handleStorageChange();

    const loadFromApi = async () => {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          if (data.sidebarOrder) {
            const orderIds = data.sidebarOrder.split(',');
            const idToHref: Record<string, string> = {
              dashboard: '/',
              inbox: '/inbox',
              accounts: '/accounts',
              transactions: '/transactions',
              income: '/income',
              categories: '/categories',
              budgets: '/budgets',
              recurring: '/recurring',
              'fixed-deposits': '/fixed-deposits',
              investments: '/investments',
              debts: '/debts',
              loans: '/loans',
              shopping: '/shopping',
              warranties: '/warranties',
              coupons: '/coupons',
              automations: '/automations',
              calendar: '/calendar',
              analytics: '/analytics',
              reports: '/reports'
            };
            const hrefOrder = orderIds.map((id: string) => idToHref[id]).filter(Boolean);
            localStorage.setItem('sf_sidebar_order', JSON.stringify(hrefOrder));
          }
          if (data.sidebarSectionLabels) {
            localStorage.setItem('sf_sidebar_section_labels', data.sidebarSectionLabels);
          }
          handleStorageChange();
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadFromApi();

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('sf_sidebar_updated', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('sf_sidebar_updated', handleStorageChange);
    };
  }, []);

  const NavItem = ({ item }: { item: { title: string; href: string; icon: React.ElementType } }) => {
    const isActive = pathname === item.href || 
      (item.href !== '/' && pathname.startsWith(item.href));
    const Icon = item.icon;

    const content = (
      <Link
        href={item.href}
        className={cn(
          'flex items-center gap-3 rounded-xl px-3 py-2.5 text-[0.8125rem] font-medium transition-all duration-200',
          'hover:bg-accent hover:text-accent-foreground',
          isActive
            ? 'bg-primary/10 text-primary shadow-sm'
            : 'text-muted-foreground',
          collapsed && 'justify-center px-2'
        )}
      >
        <Icon className={cn('h-[1.125rem] w-[1.125rem] shrink-0', isActive && 'text-primary')} />
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
    <div className="space-y-0.5">
      {!collapsed && (
        <p className="px-3 pb-1 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground/60">
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
          <NavSection title={sectionLabels.overview} items={orderedMain} />
          <NavSection title={sectionLabels.finance} items={orderedFinance} />
          <NavSection title={sectionLabels.insights} items={orderedAnalytics} />
          <NavSection title={sectionLabels.system} items={[{ title: 'Settings', href: '/settings', icon: Settings }]} />
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-3 space-y-2">
        <DropdownMenu>
          <DropdownMenuTrigger className="w-full text-left outline-none">
            <div className={cn(
              "flex items-center gap-3 rounded-xl p-2 cursor-pointer transition-all duration-200 hover:bg-accent/40",
              collapsed && "justify-center p-1.5"
            )}>
              <Avatar className="h-9 w-9 shrink-0 ring-1 ring-border/20">
                <AvatarFallback className="bg-primary/15 text-primary text-xs font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-foreground truncate leading-snug">
                    {session?.user?.name || 'Cloud User'}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate leading-normal">
                    {session?.user?.email || 'cloudstoreme111@gmail.com'}
                  </p>
                </div>
              )}
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align={collapsed ? "start" : "center"} side="right" sideOffset={12}>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{session?.user?.name || 'Cloud User'}</p>
                <p className="text-xs text-muted-foreground">
                  {session?.user?.email || 'cloudstoreme111@gmail.com'}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/settings')} className="cursor-pointer gap-2">
              <User className="h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/settings')} className="cursor-pointer gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-2 text-destructive focus:text-destructive"
              onClick={() => signOut({ callbackUrl: '/login' })}
            >
              <LogOut className="h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className={cn(
            'w-full justify-center text-muted-foreground hover:text-foreground h-8',
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
