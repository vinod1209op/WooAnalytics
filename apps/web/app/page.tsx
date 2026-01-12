'use client';

import { useState } from 'react';
import { Gift, Repeat, Globe, Tag, ShoppingCart } from 'lucide-react';

import { KpiRow } from '@/components/dashboard/kpi-row';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { PopularProductsTable } from '@/components/dashboard/popular-products-table';
import { TopCategoriesTable } from '@/components/dashboard/top-categories-table';
import { RecentOrdersTable } from '@/components/dashboard/recent-orders-table';
import { FilterBar, FilterState } from '@/components/filters/filter-bar';
import { Badge } from '@/components/ui/badge';

import { useKpis } from '@/hooks/useKpis';
import { useHasMounted } from '@/hooks/useHasMounted';
import { useMetaFilters } from '@/hooks/useMetaFilters';

const pad =
  'p-5 md:p-6';
const card =
  'rounded-2xl border border-[#d9c7f5] bg-white/90 shadow-sm backdrop-blur dark:border-purple-900/60 dark:bg-purple-950/40';

export default function Page() {
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

  const { categories, coupons } = useMetaFilters();

  const { kpis } = useKpis(filter);

  if (!hasMounted) return null;

  const pct = (current: number, previous?: number | null) => {
    if (previous === undefined || previous === null || previous === 0) return undefined;
    const delta = ((current - previous) / previous) * 100;
    const positive = delta >= 0;
    const sign = positive ? '▲' : '▼';
    return {
      text: `${sign} ${Math.abs(delta).toFixed(1)}%`,
      positive,
    };
  };
  const formatPercent = (value?: number | null) =>
    value == null ? '—' : `${value.toFixed(1)}%`;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-3 rounded-2xl bg-white/80 p-4 shadow-sm ring-1 ring-[#d9c7f5] backdrop-blur dark:bg-purple-950/40 dark:ring-purple-900/50 sm:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Badge className="bg-purple-600 text-white shadow-sm dark:bg-purple-500">Live</Badge>
              <Badge variant="outline" className="border-[#d9c7f5] text-[#5b3ba4] dark:border-purple-800 dark:text-purple-100">
                WooCommerce Analytics
              </Badge>
            </div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#5b3ba4] dark:text-purple-100">
              Dashboard
            </h1>
            <p className="text-sm text-[#6f4bb3] dark:text-purple-200/80">
              Overview of store performance and top products.
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
          <Badge variant="outline" className="border-[#d9c7f5] bg-white text-[#5b3ba4] dark:border-purple-800 dark:bg-purple-950/50 dark:text-purple-100">
            Mode: {filter.type === 'date' ? 'Date range' : filter.type === 'category' ? 'Category' : 'Coupon'}
          </Badge>
          {filter.date?.from && filter.date?.to && (
            <Badge variant="outline" className="border-[#d9c7f5] bg-white text-[#5b3ba4] dark:border-purple-800 dark:bg-purple-950/50 dark:text-purple-100">
              {filter.date.from.toLocaleDateString()} → {filter.date.to.toLocaleDateString()}
            </Badge>
          )}
          {filter.type === 'category' && (
            <Badge variant="outline" className="border-[#d9c7f5] bg-white text-[#5b3ba4] dark:border-purple-800 dark:bg-purple-950/50 dark:text-purple-100">
              {filter.category ? filter.category : 'All categories'}
            </Badge>
          )}
          {filter.type === 'coupon' && (
            <Badge variant="outline" className="border-[#d9c7f5] bg-white text-[#5b3ba4] dark:border-purple-800 dark:bg-purple-950/50 dark:text-purple-100">
              {filter.coupon ? filter.coupon : 'All coupons'}
            </Badge>
          )}
        </div>

      </div>

      {/* KPI row */}
      <section className={`${card} ${pad}`}>
        {kpis && (
          <KpiRow
            {...kpis}
          />
        )}
      </section>

      {/* Focus KPIs */}
      {kpis && (
        <section className={`${card} p-4 md:p-5`}>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <KpiCard
              icon={<Tag className="h-5 w-5" />}
              label="Lead coupons %"
              value={formatPercent(kpis.leadCouponRedemptionRate)}
              hint={pct(
                kpis.leadCouponRedemptionRate ?? 0,
                kpis.leadCouponRedemptionRatePrev ?? undefined
              )}
              compact
            />
            <KpiCard
              icon={<Gift className="h-5 w-5" />}
              label="Sample buyers"
              value={kpis.sampleBuyers.toLocaleString()}
              hint={pct(kpis.sampleBuyers, kpis.previous?.sampleBuyers)}
              compact
            />
            <KpiCard
              icon={<Repeat className="h-5 w-5" />}
              label="Sample repeat buyers"
              value={kpis.sampleRepeatBuyers.toLocaleString()}
              hint={pct(kpis.sampleRepeatBuyers, kpis.previous?.sampleRepeatBuyers)}
              compact
            />
            <KpiCard
              icon={<Globe className="h-5 w-5" />}
              label="mcrdse-movement customers"
              value={(kpis.movementCustomers ?? 0).toLocaleString()}
              hint={pct(kpis.movementCustomers ?? 0, kpis.movementCustomersPrev ?? undefined)}
              compact
            />
            <KpiCard
              icon={<ShoppingCart className="h-5 w-5" />}
              label="mcrdse-movement orders"
              value={(kpis.movementOrders ?? 0).toLocaleString()}
              hint={pct(kpis.movementOrders ?? 0, kpis.movementOrdersPrev ?? undefined)}
              compact
            />
          </div>
        </section>
      )}

      {/* Main grid: popular products + categories + recent orders */}
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <PopularProductsTable filter={filter} />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <TopCategoriesTable filter={filter} />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <RecentOrdersTable filter={filter} />
        </div>
      </section>
    </div>
  );
}
