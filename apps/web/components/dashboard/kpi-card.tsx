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
  compact?: boolean;
}

export function KpiCard({ icon, label, value, hint, compact = false }: KpiCardProps) {
  const cardPadding = compact ? 'p-3' : 'p-4';
  const cardGap = compact ? 'gap-1.5' : 'gap-2';
  const iconSize = compact ? 'h-7 w-7' : 'h-8 w-8';
  const labelText = compact ? 'text-xs' : 'text-xs';
  const valueText = compact ? 'text-lg sm:text-xl' : 'text-lg sm:text-xl';
  const badgeText = compact ? 'text-[11px]' : 'text-[11px]';

  return (
    <Card
      className={`flex flex-col items-center ${cardGap} border border-[#d9c7f5] bg-gradient-to-b from-white via-[#faf5ff] to-white/80 ${cardPadding} text-center shadow-[0_8px_30px_rgba(93,63,163,0.08)] backdrop-blur-sm dark:border-purple-900/50 dark:bg-gradient-to-b dark:from-[#1a0f2b] dark:via-[#201338] dark:to-[#1a0f2b]/80`}
    >
      <div className={`flex items-center gap-2 ${labelText} font-semibold uppercase tracking-wide text-[#6f4bb3] dark:text-purple-200`}>
        <span
          className={`flex ${iconSize} items-center justify-center rounded-xl bg-gradient-to-br from-[#f3e9ff] to-[#e6d7ff] text-[#6f4bb3] shadow-sm dark:from-purple-900/50 dark:to-purple-800/50 dark:text-purple-100`}
        >
          {icon}
        </span>
        <span>{label}</span>
      </div>
      <span className={`${valueText} font-semibold text-slate-900 dark:text-slate-50`}>
        {value}
      </span>
      {hint && (
        <Badge
          variant={hint.positive ? 'secondary' : 'destructive'}
          className={`px-2 py-0.5 ${badgeText} font-semibold ${
            hint.positive
              ? 'bg-[#e6f5ff] text-[#0b7bb5] shadow-sm dark:bg-[#0f2740] dark:text-[#9cd3ff]'
              : 'bg-rose-100 text-rose-700 shadow-sm dark:bg-rose-900/50 dark:text-rose-100'
          }`}
        >
          {hint.text}
        </Badge>
      )}
    </Card>
  );
}
