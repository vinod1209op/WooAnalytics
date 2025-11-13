'use client';

import type { ReactNode } from 'react';

interface KpiCardProps {
  icon: ReactNode;
  label: string;
  value: string;
  hint?: string;
}

export function KpiCard({ icon, label, value, hint }: KpiCardProps) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/70">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-100">
        {icon}
      </div>
      <div className="flex flex-col">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {label}
        </span>
        <span className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-50">
          {value}
        </span>
        {hint && (
          <span className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {hint}
          </span>
        )}
      </div>
    </div>
  );
}
