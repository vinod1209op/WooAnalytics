'use client';

import { useState } from 'react';

import { FilterBar, FilterState } from '@/components/filters/filter-bar';
import { useHasMounted } from '@/hooks/useHasMounted';
import { useMetaFilters } from '@/hooks/useMetaFilters';

import { useSalesSeries } from '@/hooks/useSalesSeries';
import { useSegments } from '@/hooks/useSegments';
import { useRfmHeatmap } from '@/hooks/useRfm';

import { RevenueChart } from '@/components/analytics/revenue-chart';
import { OrdersChart } from '@/components/analytics/orders-chart';
import { RfmHeatmap } from '@/components/analytics/rfm-chart';
import { SegmentsChart } from '@/components/analytics/segments-chart';

const pad =
  'p-5 md:p-6';
const card =
  'rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60';
const sectionTitle =
  'text-xl font-semibold text-slate-900 dark:text-slate-50';

export default function AnalyticsPage() {
  const hasMounted = useHasMounted();

  const [filter, setFilter] = useState<FilterState>(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 30);
    return {
      type: 'date',
      date: { from, to },
      category: '',
      coupon: '',
    };
  });

  const { categories, coupons, loadingMeta } = useMetaFilters();
  const { sales, loading: loadingSales, error: salesError } = useSalesSeries(filter);
  const { segments, loading: loadingSegments } = useSegments(filter);
  const { cells, loading: loadingRfm } = useRfmHeatmap(filter);

  if (!hasMounted) return null;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 md:px-8 dark:bg-slate-950">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        {/* Header + filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-3xl font-bold tracking-tight text-black dark:text-white">
            Analytics
          </h1>
          <div className="flex items-center gap-2">
            <FilterBar
              filter={filter}
              onChange={setFilter}
              categories={categories}
              coupons={coupons}

            />
          </div>
        </div>

        {/* Row 1: Revenue + Orders */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className={`${card} ${pad} min-w-0`}>
            <h2 className={sectionTitle}>Revenue Trend</h2>
            <div className="mt-4 h-80 w-full">
              <RevenueChart data={sales} loading={loadingSales} error={salesError} />
            </div>
          </div>

          <div className={`${card} ${pad} min-w-0`}>
            <h2 className={sectionTitle}>Orders Trend</h2>
            <div className="mt-4 h-80 w-full">
              <OrdersChart data={sales} loading={loadingSales} error={salesError} />
            </div>
          </div>
        </div>

        {/* Row 2: RFM + Segments */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className={`${card} ${pad} min-w-0`}>
            <h2 className={sectionTitle}>RFM Distribution</h2>
            <div className="mt-4 h-80 w-full">
              <RfmHeatmap data={cells} loading={loadingRfm} />
            </div>
          </div>

          <div className={`${card} ${pad} min-w-0`}>
            <h2 className={sectionTitle}>Customer Segments</h2>
            <div className="mt-4 h-80 w-full">
              <SegmentsChart data={segments} loading={loadingSegments} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}