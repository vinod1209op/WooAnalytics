'use client';

import { useState } from 'react';

import { FilterBar, FilterState } from '@/components/filters/filter-bar';
import { useHasMounted } from '@/hooks/useHasMounted';
import { useMetaFilters } from '@/hooks/useMetaFilters';
import { ChartSwitcher } from '@/components/analytics/chart-switcher';
import type { ChartId } from '@/components/analytics/chart-registry';
import { Badge } from '@/components/ui/badge';
import { useAnalyticsCharts } from '@/hooks/useAnalyticsCharts';
import { useStore } from '@/providers/store-provider';
import { InsightsCards } from '@/components/analytics/insights-cards';

export default function AnalyticsPage() {
  const hasMounted = useHasMounted();
  const { store, loading: storeLoading } = useStore();

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

  const { categories, coupons } = useMetaFilters();
  const { chartSlots, setChartSlots, chartContext } = useAnalyticsCharts(filter);

  if (!hasMounted || storeLoading) return null;
  if (!store) return null;

  return (
      <div className="space-y-4">
        <div className="flex flex-col gap-3 rounded-2xl bg-white/80 p-4 shadow-sm ring-1 ring-[#d9c7f5] backdrop-blur dark:bg-purple-950/40 dark:ring-purple-900/40 sm:p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Badge className="bg-purple-600 text-white shadow-sm dark:bg-purple-500">
                  Live
                </Badge>
                <Badge
                  variant="outline"
                  className="border-[#d9c7f5] text-[#5b3ba4] dark:border-purple-800 dark:text-purple-100"
                >
                  Analytics
                </Badge>
              </div>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#5b3ba4] dark:text-purple-100">
                Analytics
              </h1>
              <p className="text-sm text-[#6f4bb3] dark:text-purple-200/80">
                Deep-dive into trends, segments, and retention.
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-2xl border border-[#d9c7f5] bg-white/80 p-1.5 shadow-sm dark:border-purple-900/50 dark:bg-purple-950/40">
              <FilterBar
                filter={filter}
                onChange={setFilter}
                categories={categories}
                coupons={coupons}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <Badge
              variant="outline"
              className="border-[#d9c7f5] bg-white text-[#5b3ba4] dark:border-purple-800 dark:bg-purple-950/50 dark:text-purple-100"
            >
              Mode: {filter.type === 'date' ? 'Date range' : filter.type === 'category' ? 'Category' : 'Coupon'}
            </Badge>
            {filter.date?.from && filter.date?.to && (
              <Badge
                variant="outline"
                className="border-[#d9c7f5] bg-white text-[#5b3ba4] dark:border-purple-800 dark:bg-purple-950/50 dark:text-purple-100"
              >
                {filter.date.from.toLocaleDateString()} → {filter.date.to.toLocaleDateString()}
              </Badge>
            )}
            {filter.type === 'category' && (
              <Badge
                variant="outline"
                className="border-[#d9c7f5] bg-white text-[#5b3ba4] dark:border-purple-800 dark:bg-purple-950/50 dark:text-purple-100"
              >
                {filter.category ? filter.category : 'All categories'}
              </Badge>
            )}
            {filter.type === 'coupon' && (
              <Badge
                variant="outline"
                className="border-[#d9c7f5] bg-white text-[#5b3ba4] dark:border-purple-800 dark:bg-purple-950/50 dark:text-purple-100"
              >
                {filter.coupon ? filter.coupon : 'All coupons'}
              </Badge>
            )}
          </div>
        </div>

        <InsightsCards storeId={store.id} filter={filter} />

        <section className="grid grid-cols-1 gap-4 pb-2 xl:grid-cols-2">
          {chartSlots.map((chartId, idx) => (
            <ChartSwitcher
              key={`${chartId}-${idx}`}
              chartId={chartId}
              onChange={(next) => {
                setChartSlots((prev) => {
                  const copy = [...prev];
                  copy[idx] = next;
                  return copy;
                });
              }}
              context={chartContext}
              allowedIds={
                idx === 0
                  ? (['revenue_orders', 'orders', 'aov', 'cumulative'] as ChartId[])
                  : idx === 1
                  ? (['rolling', 'refunds_discounts', 'shipping_tax', 'new_returning', 'lead_coupons', 'utm_orders'] as ChartId[])
                  : idx === 2
                  ? (['top_products', 'top_categories'] as ChartId[])
                  : (['segments', 'rfm', 'retention_cohorts'] as ChartId[])
              }
            />
          ))}
        </section>
      </div>
  );
}
