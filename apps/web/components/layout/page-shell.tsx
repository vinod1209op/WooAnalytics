'use client';

import type { ReactNode } from 'react';

interface PageShellProps {
  children: ReactNode;
}

export function PageShell({ children }: PageShellProps) {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-8">
        {children}
      </div>
    </main>
  );
}
