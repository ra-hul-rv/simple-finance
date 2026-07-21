'use client';

import { Bell, Search, LogOut, User, Settings, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from './theme-toggle';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';

const pathLabels: Record<string, string> = {
  '/': 'Dashboard',
  '/accounts': 'Accounts',
  '/transactions': 'Transactions',
  '/income': 'Income',
  '/categories': 'Categories & Tags',
  '/budgets': 'Budgets',
  '/recurring': 'Recurring',
  '/groups': 'Groups',
  '/investments': 'Investments',
  '/credit-cards': 'Credit Cards',
  '/fixed-deposits': 'Fixed Deposits',
  '/lending': 'Lending & Debts',
  '/analytics': 'Analytics',
  '/reports': 'Reports',
  '/settings': 'Settings',
};

export function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const initials = session?.user?.name
    ? session.user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'SF';

  const getPageTitle = () => {
    if (pathname in pathLabels) return pathLabels[pathname];
    // Handle nested routes
    const basePath = '/' + pathname.split('/')[1];
    return pathLabels[basePath] || 'Dashboard';
  };

  const getBreadcrumbs = () => {
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 0) return [];
    return segments.map((segment, index) => ({
      label: pathLabels['/' + segment] || segment.charAt(0).toUpperCase() + segment.slice(1),
      href: '/' + segments.slice(0, index + 1).join('/'),
      isLast: index === segments.length - 1,
    }));
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur-xl">
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold tracking-tight hidden lg:block">
          {getPageTitle()}
        </h1>
        {breadcrumbs.length > 1 && (
          <nav className="hidden items-center gap-1 text-sm text-muted-foreground lg:flex">
            <Link href="/" className="hover:text-foreground transition-colors">
              Home
            </Link>
            {breadcrumbs.map((crumb) => (
              <span key={crumb.href} className="flex items-center gap-1">
                <ChevronRight className="h-3 w-3" />
                {crumb.isLast ? (
                  <span className="text-foreground font-medium">{crumb.label}</span>
                ) : (
                  <Link href={crumb.href} className="hover:text-foreground transition-colors">
                    {crumb.label}
                  </Link>
                )}
              </span>
            ))}
          </nav>
        )}
      </div>

      <div className="flex items-center gap-1">
        {/* Search */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-lg"
        >
          <Search className="h-4 w-4 text-muted-foreground" />
          <span className="sr-only">Search</span>
        </Button>

        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-lg"
        >
          <Bell className="h-4 w-4 text-muted-foreground" />
          <Badge
            className="absolute -right-0.5 -top-0.5 h-4 w-4 rounded-full p-0 text-[10px] flex items-center justify-center gradient-primary border-0 text-white"
          >
            3
          </Badge>
          <span className="sr-only">Notifications</span>
        </Button>

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Button
              variant="ghost"
              className="relative ml-1 h-9 w-9 rounded-full"
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{session?.user?.name || 'User'}</p>
                <p className="text-xs text-muted-foreground">
                  {session?.user?.email || 'user@simplefinance.app'}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
             <DropdownMenuItem>
              <Link href="/settings" className="flex items-center gap-2 w-full">
                <User className="h-4 w-4" />
                Profile
              </Link>
            </DropdownMenuItem>
             <DropdownMenuItem>
              <Link href="/settings" className="flex items-center gap-2 w-full">
                <Settings className="h-4 w-4" />
                Settings
              </Link>
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
      </div>
    </header>
  );
}
