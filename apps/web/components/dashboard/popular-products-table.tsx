// web/app/components/dashboard/popular-products-table.tsx
'use client';

import { usePopularProducts } from '@/hooks/usePopularProducts';
import type { FilterState } from '@/components/filters/filter-bar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type PopularProductsTableProps = {
  filter: FilterState;
};

export function PopularProductsTable({ filter }: PopularProductsTableProps) {
  const { products, loading, error } = usePopularProducts(filter);

  return (
    <section className="rounded-2xl border border-[#d9c7f5] bg-gradient-to-b from-white via-[#faf5ff] to-white/90 p-5 shadow-[0_8px_24px_rgba(93,63,163,0.08)] backdrop-blur-sm dark:border-purple-900/50 dark:bg-gradient-to-b dark:from-[#1a0f2b] dark:via-[#201338] dark:to-[#1a0f2b]/80">
      <header className="mb-3 flex items-center justify-between gap-3">
        <div>
        <h2 className="text-base font-semibold text-[#6f4bb3] dark:text-purple-200">
          Popular products
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Top 10 by units sold
        </p>
        </div>
      </header>

      {error && (
        <div className="mb-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40">
          {error}
        </div>
      )}

      {loading ? (
        <div className="h-32 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
      ) : !products.length ? (
        <div className="flex items-center justify-center rounded-xl border border-dashed border-slate-200 p-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          No products yet. Once orders sync, you’ll see your top items here.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table className="table-fixed text-sm">
            <TableHeader>
              <TableRow className="border-b border-[#d9c7f5] text-[11px] font-semibold uppercase tracking-wide text-[#6f4bb3] dark:border-purple-900/60 dark:text-purple-200">
                <TableHead className="w-1/2 py-2 px-2 text-left">Product</TableHead>
                <TableHead className="w-[90px] py-2 px-2 text-right">Units</TableHead>
                <TableHead className="w-[120px] py-2 px-2 text-right">Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p, idx) => {
                const rowBg =
                  idx % 2 === 0
                    ? 'bg-white dark:bg-slate-900'
                    : 'bg-[#faf5ff] dark:bg-slate-900/60';
                const revenue = p.price * p.total_sales;

                return (
                  <TableRow
                    key={p.id}
                    className={`${rowBg} border-b border-slate-100 last:border-0 hover:bg-[#f7f1ff]/70 dark:border-slate-800 dark:hover:bg-purple-900/40`}
                  >
                    <TableCell className="max-w-[220px] truncate py-2 px-2 text-sm font-medium text-slate-900 dark:text-slate-50">
                      <span title={p.name}>{p.name}</span>
                    </TableCell>
                    <TableCell className="py-2 px-2 text-right text-sm text-slate-900 dark:text-slate-50 whitespace-nowrap">
                      {p.total_sales.toLocaleString()}
                    </TableCell>
                    <TableCell className="py-2 px-2 text-right text-sm font-semibold text-slate-900 dark:text-slate-50 whitespace-nowrap">
                      ${revenue.toFixed(2)}
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
