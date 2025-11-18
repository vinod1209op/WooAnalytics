'use client';

import { useState } from 'react';

import { KpiRow } from '@/components/dashboard/kpi-row';
import { PopularProductsTable } from '@/components/dashboard/popular-products-table';
import { FilterBar, FilterState } from '@/components/filters/filter-bar';

import { useKpis } from '@/hooks/useKpis';
import { useHasMounted } from '@/hooks/useHasMounted';
import { useMetaFilters } from '@/hooks/useMetaFilters';

const pad =
  'p-5 md:p-6';
const card =
  'rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60';

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

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-black dark:text-white">
            Dashboard
          </h1>
          <p className="text-sm text-slate-400">
            Overview of store performance and top products.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <FilterBar
            filter={filter}
            onChange={setFilter}
            categories={categories}
            coupons={coupons}
          />
        </div>
      </div>

      {/* KPI row */}
      <section className={`${card} ${pad}`}>
        <KpiRow
          revenue={kpis?.revenue ?? 0}
          orders={kpis?.orders ?? 0}
          aov={kpis?.aov ?? 0}
          units={kpis?.units ?? 0}
          customers={kpis?.customers ?? 0}
        />
      </section>

      {/* Main grid: popular products */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <PopularProductsTable  filter={filter} />
      </section>
    </div>
  );
}
