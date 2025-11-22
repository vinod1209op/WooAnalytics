'use client';

import type { FilterState } from '@/components/filters/filter-bar';
import { useTopCategories } from '@/hooks/useTopCategories';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type Props = {
  filter: FilterState;
};

export function TopCategoriesTable({ filter }: Props) {
  const { categories, loading, error } = useTopCategories(filter);

  return (
    <section className="rounded-2xl border border-emerald-100/70 bg-white/85 p-5 shadow-sm backdrop-blur-sm dark:border-emerald-900/40 dark:bg-emerald-950/30">
      <header className="mb-3">
        <h2 className="text-base font-semibold text-emerald-700 dark:text-emerald-200">
          Top categories
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Ranked by revenue
        </p>
      </header>

      {error && (
        <div className="mb-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40">
          {error}
        </div>
      )}

      {loading ? (
        <div className="h-24 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
      ) : !categories.length ? (
        <div className="flex items-center justify-center rounded-xl border border-dashed border-slate-200 p-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          No category data yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table className="table-fixed text-sm">
            <TableHeader>
              <TableRow className="border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <TableHead className="w-1/2 py-2 px-2 text-left">Category</TableHead>
                <TableHead className="w-[70px] py-2 px-2 text-right">Units</TableHead>
                <TableHead className="w-[110px] py-2 px-2 text-right">Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((c, idx) => {
                const rowBg =
                  idx % 2 === 0
                    ? 'bg-white dark:bg-slate-900'
                    : 'bg-slate-50 dark:bg-slate-900/60';
                return (
                  <TableRow
                    key={c.name + idx}
                    className={`${rowBg} border-b border-slate-100 last:border-0 hover:bg-slate-50/80 dark:border-slate-800 dark:hover:bg-slate-800/80`}
                  >
                    <TableCell className="max-w-[200px] truncate py-2 px-2 text-sm font-medium text-slate-900 dark:text-slate-50">
                      <span title={c.name}>{c.name}</span>
                    </TableCell>
                    <TableCell className="py-2 px-2 text-right text-sm text-slate-900 dark:text-slate-50 whitespace-nowrap">
                      {c.units.toLocaleString()}
                    </TableCell>
                    <TableCell className="py-2 px-2 text-right text-sm font-semibold text-slate-900 dark:text-slate-50 whitespace-nowrap">
                      ${c.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}
