'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type Summary = Record<string, { count: number; ltv: number; daysSum: number; daysCount: number }>;

export function SegmentCards({
  summary,
  storeId,
  days,
  limit,
  apiBase,
}: {
  summary: Summary;
  storeId: string | undefined;
  days: number;
  limit: number;
  apiBase: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {Object.entries(summary).map(([seg, info]) => {
        const avgDays =
          info.daysCount > 0 ? Math.round((info.daysSum / info.daysCount) * 10) / 10 : 0;
        const avgLtv = info.count > 0 ? Math.round((info.ltv / info.count) * 100) / 100 : 0;
        const segCsvParams = new URLSearchParams({
          storeId: storeId ?? '',
          days: String(days),
          limit: String(limit),
          cursor: '0',
          format: 'csv',
          segment: seg,
        });
        const segCsvUrl = storeId ? `${apiBase}/customers/inactive?${segCsvParams.toString()}` : '#';
        return (
          <Card
            key={seg}
            className="border-[#d9c7f5] bg-gradient-to-b from-white via-[#faf5ff] to-white/90 p-2.5 shadow-[0_8px_24px_rgba(93,63,163,0.08)] backdrop-blur-sm dark:border-purple-900/50 dark:bg-gradient-to-b dark:from-[#1a0f2b] dark:via-[#201338] dark:to-[#1a0f2b]/80"
          >
            <div className="flex items-center justify-between gap-2 pb-1">
              <Badge
                className={cn(
                  'bg-[#f0e5ff] text-[#5b3ba4] dark:bg-purple-900/60 dark:text-purple-50'
                )}
              >
                {seg}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg border-[#d9c7f5] text-[#5b3ba4] hover:bg-[#f0e5ff] dark:border-purple-900/50 dark:text-purple-100 dark:hover:bg-purple-900/60"
                asChild
                disabled={!storeId}
              >
                <a href={segCsvUrl}>Export</a>
              </Button>
            </div>
            <div className="space-y-1 text-sm text-slate-700 dark:text-slate-200">
              <div>
                <span className="text-xs uppercase tracking-wide text-slate-500">Count</span>{' '}
                {info.count}
              </div>
              <div>
                <span className="text-xs uppercase tracking-wide text-slate-500">
                  Avg days since last
                </span>{' '}
                {avgDays || '—'}
              </div>
              <div>
                <span className="text-xs uppercase tracking-wide text-slate-500">Avg LTV</span> $
                {avgLtv || 0}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
