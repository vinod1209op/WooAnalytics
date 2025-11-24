'use client';

import type { ReactNode } from 'react';

interface PageShellProps {
  children: ReactNode;
}

export function PageShell({ children }: PageShellProps) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#f8f1e7] via-white to-[#fdf7f0] text-slate-900 dark:from-slate-950 dark:via-[#1b0f2b] dark:to-slate-950 dark:text-slate-100">
      <div className="pointer-events-none absolute inset-0 opacity-40 blur-3xl dark:opacity-30">
        <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-[#c9a7ff]/30 dark:bg-purple-700/30" />
        <div className="absolute right-0 top-40 h-80 w-80 rounded-full bg-[#f6c28b]/25 dark:bg-purple-800/20" />
      </div>
      <div className="relative mx-auto w-full max-w-[1500px] px-4 py-6 md:px-7 md:py-8">
        {children}
      </div>
    </main>
  );
}
