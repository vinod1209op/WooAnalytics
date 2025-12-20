'use client';

import { useEffect, useMemo, useState } from 'react';
import { useInactiveCustomers } from '@/hooks/useInactiveCustomers';
import { useStore } from '@/providers/store-provider';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { IdleFilters } from '@/components/admin/idle/filters';
import { SegmentCards } from '@/components/admin/idle/segment-cards';
import { CustomerTable } from '@/components/admin/idle/customer-table';
import { useMetaFilters } from '@/hooks/useMetaFilters';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE?.trim() || 'http://localhost:3001';

function formatDate(value: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(+d)) return value;
  return d.toLocaleDateString();
}

const FALLBACK_SEGMENTS = [
  'ONE_TIME_IDLE_30',
  'REPEAT_IDLE_30',
  'LOYAL_IDLE_30',
  'ONE_TIME_IDLE_60',
  'REPEAT_IDLE_60',
  'LOYAL_IDLE_60',
  'ONE_TIME_IDLE_90',
  'REPEAT_IDLE_90',
  'LOYAL_IDLE_90',
];

export default function IdleCustomersPage() {
  const { store } = useStore();
  const { categories } = useMetaFilters();
  const storeId = store?.id;

  const [days, setDays] = useState(30);
  const [limit] = useState(50);
  const [cursor, setCursor] = useState(0);
  const [copied, setCopied] = useState(false);
  const [segment, setSegment] = useState<string | null>(null);
  const [intent, setIntent] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);

  const { data, loading, error } = useInactiveCustomers({
    days,
    limit,
    cursor,
    segment,
    intent,
    category,
  });

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  const csvUrl = useMemo(() => {
    if (!storeId) return '#';
    const params = new URLSearchParams({
      storeId,
      days: String(days),
      limit: String(limit),
      cursor: String(cursor),
      format: 'csv',
    });
    if (segment) params.set('segment', segment);
    if (intent) params.set('intent', intent);
    if (category) params.set('category', category);
    return `${API_BASE}/customers/inactive?${params.toString()}`;
  }, [storeId, days, limit, cursor, segment, intent, category]);

  const sortedRows = useMemo(() => {
    const list = data?.data ?? [];
    const toTs = (value: string | null) => (value ? new Date(value).getTime() : 0);
    return [...list].sort((a, b) => {
      const riskA = a.churnRisk ?? 0;
      const riskB = b.churnRisk ?? 0;
      if (riskA !== riskB) return riskB - riskA;
      return toTs(b.lastOrderAt) - toTs(a.lastOrderAt);
    });
  }, [data?.data]);

  const segmentSummary = useMemo(() => {
    const agg: Record<
      string,
      { count: number; ltv: number; daysSum: number; daysCount: number }
    > = {};
    for (const row of data?.data ?? []) {
      const key = row.segment || 'UNKNOWN';
      if (!agg[key]) agg[key] = { count: 0, ltv: 0, daysSum: 0, daysCount: 0 };
      agg[key].count += 1;
      if (row.metrics?.ltv != null) agg[key].ltv += row.metrics.ltv;
      if (row.metrics?.daysSinceLastOrder != null) {
        agg[key].daysSum += row.metrics.daysSinceLastOrder;
        agg[key].daysCount += 1;
      }
    }
    return agg;
  }, [data?.data]);

  const handleCopyEmails = async () => {
    const emails = (data?.data ?? []).map((c) => c.email).filter(Boolean).join('\n');
    if (!emails) return;
    try {
      await navigator.clipboard.writeText(emails);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const resetCursor = () => setCursor(0);
  const canPageForward = !!data?.nextCursor;
  const segmentOptions =
    data?.segmentCounts && Object.keys(data.segmentCounts).length
      ? Object.keys(data.segmentCounts)
      : FALLBACK_SEGMENTS;

  return (
    <div className="space-y-6">
      <Card className="border-[#d9c7f5] bg-white/80 p-4 shadow-sm backdrop-blur dark:border-purple-900/50 dark:bg-purple-950/30">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Badge className="bg-purple-600 text-white shadow-sm dark:bg-purple-500">Admin</Badge>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#5b3ba4] dark:text-purple-100">
              Idle customers
            </h1>
            <p className="text-sm text-[#6f4bb3] dark:text-purple-200/80">
              View idle customers, copy emails, or export CSV for GHL.
            </p>
          </div>
          <IdleFilters
            days={days}
            setDays={setDays}
            intent={intent}
            setIntent={setIntent}
            segment={segment}
            setSegment={setSegment}
            category={category}
            setCategory={setCategory}
            onCopyEmails={handleCopyEmails}
            csvUrl={csvUrl}
            disableActions={!data?.data?.length}
            segmentOptions={segmentOptions}
            categories={categories}
            resetCursor={resetCursor}
          />
        </div>
        <div className="mt-2 text-xs text-slate-500 dark:text-slate-300">
          Showing {data?.data?.length ?? 0} rows • cursor {cursor} • cutoff{' '}
          {data?.cutoff ? formatDate(data.cutoff) : '—'}
        </div>
        {error && (
          <Card className="mt-3 border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </Card>
        )}
      </Card>

      <Card className="border-[#d9c7f5] bg-white/80 p-4 shadow-sm backdrop-blur dark:border-purple-900/50 dark:bg-purple-950/30">
        <div className="overflow-auto">
          <SegmentCards summary={segmentSummary} storeId={storeId} days={days} limit={limit} apiBase={API_BASE} />
          <CustomerTable rows={sortedRows} loading={loading} segmentCounts={data?.segmentCounts} />
        </div>

        <div className="mt-4 flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
          <div>
            Showing page starting at cursor {cursor}. {data?.count ?? 0} rows fetched.
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="rounded-xl border-[#d9c7f5] text-[#5b3ba4] hover:bg-[#f0e5ff] dark:border-purple-900/50 dark:text-purple-100 dark:hover:bg-purple-900/60"
              disabled={cursor === 0 || loading}
              onClick={() => setCursor(Math.max(cursor - limit, 0))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              className="rounded-xl border-[#d9c7f5] text-[#5b3ba4] hover:bg-[#f0e5ff] dark:border-purple-900/50 dark:text-purple-100 dark:hover:bg-purple-900/60"
              disabled={!canPageForward || loading}
              onClick={() => {
                if (data?.nextCursor != null) setCursor(data.nextCursor);
              }}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
