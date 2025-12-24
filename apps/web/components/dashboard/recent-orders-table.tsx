'use client';

import type { FilterState } from '@/components/filters/filter-bar';
import { useRecentOrders } from '@/hooks/useRecentOrders';
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

export function RecentOrdersTable({ filter }: Props) {
  const { orders, loading, error } = useRecentOrders(filter, 8);

  return (
    <section className="rounded-2xl border border-[#d9c7f5] bg-gradient-to-b from-white via-[#faf5ff] to-white/90 p-5 shadow-[0_8px_24px_rgba(93,63,163,0.08)] backdrop-blur-sm dark:border-purple-900/50 dark:bg-gradient-to-b dark:from-[#1a0f2b] dark:via-[#201338] dark:to-[#1a0f2b]/80">
      <header className="mb-3">
        <h2 className="text-base font-semibold text-[#6f4bb3] dark:text-purple-200">
          Recent orders
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Latest in-range orders
        </p>
      </header>

      {error && (
        <div className="mb-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40">
          {error}
        </div>
      )}

      {loading ? (
        <div className="h-24 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
      ) : !orders.length ? (
        <div className="flex items-center justify-center rounded-xl border border-dashed border-slate-200 p-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          No orders in this range.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table className="table-fixed text-sm">
            <TableHeader>
              <TableRow className="border-b border-[#d9c7f5] text-[11px] font-semibold uppercase tracking-wide text-[#6f4bb3] dark:border-purple-900/60 dark:text-purple-200">
                <TableHead className="w-[140px] py-2 px-2">Order</TableHead>
                <TableHead className="w-[150px] py-2 px-2">Customer</TableHead>
                <TableHead className="w-[110px] py-2 px-2">Status</TableHead>
                <TableHead className="w-[90px] py-2 px-2 text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((o, idx) => {
                const rowBg =
                  idx % 2 === 0
                    ? 'bg-white dark:bg-slate-900'
                    : 'bg-[#faf5ff] dark:bg-slate-900/60';
                const date = new Date(o.date).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                });
                return (
                  <TableRow
                    key={o.id}
                    className={`${rowBg} border-b border-slate-100 last:border-0 hover:bg-[#f7f1ff]/70 dark:border-slate-800 dark:hover:bg-purple-900/40`}
                  >
                    <TableCell className="py-2 px-2 text-sm font-medium text-slate-900 dark:text-slate-50 whitespace-nowrap">
                      #{o.id} • {date}
                    </TableCell>
                    <TableCell className="py-2 px-2 text-sm text-slate-900 dark:text-slate-50 truncate">
                      <span title={o.customer}>{o.customer}</span>
                    </TableCell>
                    <TableCell className="py-2 px-2 text-[11px] uppercase text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {o.status}
                    </TableCell>
                    <TableCell className="py-2 px-2 text-right text-sm font-semibold text-slate-900 dark:text-slate-50 whitespace-nowrap">
                      ${o.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
