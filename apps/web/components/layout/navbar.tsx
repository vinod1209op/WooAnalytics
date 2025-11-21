'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import DarkToggle from '@/components/theme/dark-toggle';


export function Navbar() {
  const pathname = usePathname();
  const navItems = [
    { href: '/', label: 'Dashboard' },
    { href: '/analytics', label: 'Analytics' },
  ];

  return (
    <header className="border-b bg-white/60 backdrop-blur dark:bg-slate-950/60">
      <div className="mx-auto flex h-14 max-w-[1420px] items-center justify-between px-4 sm:px-6">
        {/* Left: title */}
        <Link href="/" className="text-lg font-bold tracking-tight">
          MCRDSE Analytics
        </Link>

        {/* Right: nav + theme toggle */}
        <div className="flex items-center gap-4">
          <nav className="flex items-center gap-2 text-sm">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    'rounded-full px-3 py-1 transition-colors',
                    'hover:bg-slate-100 dark:hover:bg-slate-800',
                    isActive && 
                      'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900',
                  ].filter(Boolean).join(' ')}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <DarkToggle />
        </div>
      </div>
    </header>
  );
}