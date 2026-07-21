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
  Vault,
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
import { User, LogOut, ShoppingBag, ShieldCheck, Ticket, Cpu, Mail, Calendar as CalendarIcon, Users, CreditCard, FolderKanban } from 'lucide-react';

import { DEFAULT_SIDEBAR_LAYOUT, SidebarLayout, SidebarSectionNode } from '../settings/sidebar-editor';

const ICON_MAP: Record<string, React.ElementType> = {
  dashboard: LayoutDashboard,
  inbox: Mail,
  accounts: Wallet,
  transactions: ArrowLeftRight,
  income: DollarSign,
  categories: Tag,
  people: Users,
  budgets: PiggyBank,
  recurring: Repeat,
  groups: FolderKanban,
  'fixed-deposits': Landmark,
  investments: TrendingUp,
  lending: ArrowLeftRight,
  shopping: ShoppingBag,
  vault: Vault,
  automations: Cpu,
  calendar: CalendarIcon,
  analytics: BarChart3,
  reports: FileText,
};

const DEFAULT_TITLE_MAP: Record<string, string> = {
  dashboard: 'Dashboard',
  inbox: 'AI Inbox',
  accounts: 'Accounts',
  transactions: 'Transactions',
  income: 'Income',
  categories: 'Categories',
  people: 'People',
  budgets: 'Budgets',
  recurring: 'Bills & Subs',
  groups: 'Groups',
  'fixed-deposits': 'Fixed Deposits',
  investments: 'Investments',
  lending: 'Lending & Debts',
  shopping: 'Shopping List',
  vault: 'Vault',
  automations: 'Automations',
  calendar: 'Calendar',
  analytics: 'Analytics',
  reports: 'Reports',
};

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

  const [layout, setLayout] = useState<SidebarLayout>(DEFAULT_SIDEBAR_LAYOUT);

  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('sf_sidebar_layout');
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as SidebarLayout;
          if (parsed && parsed.sections) {
            // Auto-migrate legacy items (coupons/warranties) to vault
            let migrated = false;
            parsed.sections.forEach(sec => {
              const hasCoupons = sec.items.some(i => i.id === 'coupons');
              const hasWarranties = sec.items.some(i => i.id === 'warranties');
              const hasVault = sec.items.some(i => i.id === 'vault');
              
              if (hasCoupons || hasWarranties) {
                migrated = true;
                const firstLegacyIndex = sec.items.findIndex(i => i.id === 'coupons' || i.id === 'warranties');
                sec.items = sec.items.filter(i => i.id !== 'coupons' && i.id !== 'warranties');
                if (!hasVault && firstLegacyIndex !== -1) {
                  sec.items.splice(firstLegacyIndex, 0, { id: 'vault', title: null, isHidden: false });
                }
              }
            });
            
            setLayout(parsed);
            if (migrated) {
              localStorage.setItem('sf_sidebar_layout', JSON.stringify(parsed));
            }
          }
        } catch (e) {
          console.error(e);
        }
      } else {
        setLayout(DEFAULT_SIDEBAR_LAYOUT);
      }
    };

    handleStorageChange();

    const loadFromApi = async () => {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          // Migration from old keys
          if (data.sidebarLayout) {
            localStorage.setItem('sf_sidebar_layout', data.sidebarLayout);
          } else if (data.sidebarOrder || data.sidebarSectionLabels) {
             // Fallback to default if they had old style customizations but no new layout
             localStorage.setItem('sf_sidebar_layout', JSON.stringify(DEFAULT_SIDEBAR_LAYOUT));
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

  const NavSection = ({ section }: { section: SidebarSectionNode }) => {
    if (section.isCollapsed || section.items.filter(i => !i.isHidden).length === 0) return null;

    return (
      <div className="space-y-0.5">
        {!collapsed && (
          <p className="px-3 pb-1 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground/60">
            {section.title || section.id}
          </p>
        )}
        {collapsed && <Separator className="my-2" />}
        {section.items.filter(i => !i.isHidden).map((item) => {
          const href = item.id === 'dashboard' ? '/' : `/${item.id}`;
          const Icon = ICON_MAP[item.id] || LayoutDashboard;
          return (
            <NavItem 
              key={item.id} 
              item={{ title: item.title || DEFAULT_TITLE_MAP[item.id] || item.id, href, icon: Icon }} 
            />
          );
        })}
      </div>
    );
  };

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
          {layout.sections.map(section => (
            <NavSection key={section.id} section={section} />
          ))}
          <div className="space-y-0.5">
            {!collapsed && (
              <p className="px-3 pb-1 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground/60">
                System
              </p>
            )}
            {collapsed && <Separator className="my-2" />}
            <NavItem item={{ title: 'Settings', href: '/settings', icon: Settings }} />
          </div>
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
