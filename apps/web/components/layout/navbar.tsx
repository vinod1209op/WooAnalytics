'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import DarkToggle from '@/components/theme/dark-toggle';
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from '@/components/ui/navigation-menu';
import { cn } from '@/lib/utils';

export function Navbar() {
  const pathname = usePathname();
  const navItems = [
    { href: '/', label: 'Dashboard' },
    { href: '/analytics', label: 'Analytics' },
    { href: '/admin/idle', label: 'Customers' },
    { href: '/ghl', label: 'GHL' },
  ];

  return (
    <header className="border-b border-[#d9c7f5]/80 bg-gradient-to-r from-[#f5ebff] via-white to-[#f9f1ff] backdrop-blur dark:border-purple-900/50 dark:from-purple-950/60 dark:via-slate-950 dark:to-purple-950/40">
      <div className="mx-auto flex h-14 max-w-[1500px] items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="text-lg font-bold tracking-tight text-[#6f4bb3] dark:text-purple-100"
        >
          MCRDSE Analytics
        </Link>

        <div className="flex items-center gap-4">
          <NavigationMenu viewport={false}>
            <NavigationMenuList className="gap-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <NavigationMenuItem key={item.href}>
                    <NavigationMenuLink
                      asChild
                      active={isActive}
                      className={cn(
                        'rounded-full px-3 py-1 text-sm font-medium transition-colors',
                        'hover:bg-[#f0e5ff] hover:text-[#5b3ba4] dark:hover:bg-purple-900/50 dark:hover:text-purple-50',
                        isActive
                          ? 'bg-[#6f4bb3] text-white shadow-sm dark:bg-purple-500'
                          : 'text-slate-700 dark:text-slate-200'
                      )}
                    >
                      <Link href={item.href}>{item.label}</Link>
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                );
              })}
            </NavigationMenuList>
          </NavigationMenu>

          <DarkToggle />
        </div>
      </div>
    </header>
  );
}
