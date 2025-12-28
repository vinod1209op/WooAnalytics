'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type Summary = Record<string, { count: number; ltv: number; daysSum: number; daysCount: number }>;

export function SegmentCards({
  summary,
  makeCsvUrl,
}: {
  summary: Summary;
  makeCsvUrl: (segment: string) => string;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Object.entries(summary).map(([seg, info]) => {
        const avgDays =
          info.daysCount > 0 ? Math.round((info.daysSum / info.daysCount) * 10) / 10 : 0;
        const avgLtv = info.count > 0 ? Math.round((info.ltv / info.count) * 100) / 100 : 0;
        const segCsvUrl = makeCsvUrl(seg);
        return (
          <Card
            key={seg}
            className="border-[#eadcff] bg-white/80 p-3 shadow-sm backdrop-blur-sm dark:border-purple-900/50 dark:bg-purple-950/40"
          >
            <div className="flex items-center justify-between gap-2 pb-1">
              <Badge
                className={cn(
                  'bg-[#f6efff] text-[#5b3ba4] dark:bg-purple-900/60 dark:text-purple-50'
                )}
              >
                {seg}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg border-[#d9c7f5] text-[#5b3ba4] hover:bg-[#f0e5ff] dark:border-purple-900/50 dark:text-purple-100 dark:hover:bg-purple-900/60"
                asChild
                disabled={!segCsvUrl}
              >
                <a href={segCsvUrl || '#'}>Export</a>
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
