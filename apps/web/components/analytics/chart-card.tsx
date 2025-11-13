'use client';

import * as React from 'react';

export function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/70">
      <div className="mb-3">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">{title}</h2>
        {subtitle && (
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
        )}
      </div>
      <div className="h-80 w-full">{children}</div>
    </section>
  );
}

