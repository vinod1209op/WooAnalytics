'use client';

import type { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface KpiCardProps {
  icon: ReactNode;
  label: string;
  value: string;
  hint?: {
    text: string;
    positive: boolean;
  };
}

export function KpiCard({ icon, label, value, hint }: KpiCardProps) {
  return (
    <Card className="flex flex-col items-center gap-2 border border-emerald-100 bg-white/90 p-4 text-center shadow-sm backdrop-blur-sm dark:border-emerald-900/40 dark:bg-slate-900/70">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-200">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-100">
          {icon}
        </span>
        <span>{label}</span>
      </div>
      <span className="text-lg font-semibold text-slate-900 sm:text-xl dark:text-slate-50">
        {value}
      </span>
      {hint && (
        <Badge
          variant={hint.positive ? 'secondary' : 'destructive'}
          className={`px-2 py-0.5 text-[11px] font-semibold ${
            hint.positive
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-100'
              : 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-100'
          }`}
        >
          {hint.text}
        </Badge>
      )}
    </Card>
  );
}
