'use client';

import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { IdleCustomer } from '@/hooks/useInactiveCustomers';

function formatDate(value: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(+d)) return value;
  return d.toLocaleDateString();
}

export function CustomerTable({
  rows,
  loading,
  segmentCounts,
}: {
  rows: IdleCustomer[];
  loading: boolean;
  segmentCounts?: Record<string, number>;
}) {
  const hasData = rows.length > 0;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Risk</TableHead>
          <TableHead>Segment</TableHead>
          <TableHead>Orders/LTV</TableHead>
          <TableHead>Last order</TableHead>
          <TableHead>Items</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Coupons</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading && (
          <TableRow>
            <TableCell colSpan={9} className="text-sm text-slate-500">
              Loading…
            </TableCell>
          </TableRow>
        )}
        {!loading && !hasData && (
          <TableRow>
            <TableCell colSpan={9} className="text-sm text-slate-500">
              No idle customers for this window.
            </TableCell>
          </TableRow>
        )}
        {rows.map((row) => {
          const items = row.lastItems.map((i) => `${i.name ?? 'Item'} x${i.quantity}`).join(', ');
          const coupons = row.lastOrderCoupons.join(', ');
          return (
            <TableRow key={row.customerId}>
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-medium text-[#5b3ba4] dark:text-purple-100">
                    {row.name || 'Unknown'}
                  </span>
                  <span className="text-xs text-slate-500">#{row.customerId}</span>
                  {row.phone && <span className="text-xs text-slate-500">{row.phone}</span>}
                </div>
              </TableCell>
              <TableCell className="text-sm text-slate-700 dark:text-slate-200">
                {row.email}
              </TableCell>
              <TableCell className="text-sm text-slate-700 dark:text-slate-200">
                {row.churnRisk != null ? `${row.churnRisk}/100` : '—'}
              </TableCell>
              <TableCell>
                {row.segment ? (
                  <Badge className="bg-[#f0e5ff] text-[#5b3ba4] dark:bg-purple-900/60 dark:text-purple-50">
                    {row.segment}
                  </Badge>
                ) : (
                  <span className="text-xs text-slate-500">—</span>
                )}
              </TableCell>
              <TableCell className="text-sm text-slate-700 dark:text-slate-200">
                <div>Orders: {row.ordersCount}</div>
                <div>LTV: ${row.metrics?.ltv ?? 0}</div>
              </TableCell>
              <TableCell className="text-sm text-slate-700 dark:text-slate-200">
                <div>Ordered: {formatDate(row.lastOrderAt)}</div>
                <div>Total: ${row.lastOrderTotal ?? 0}</div>
              </TableCell>
              <TableCell className="text-sm text-slate-700 dark:text-slate-200">
                {items || '—'}
              </TableCell>
              <TableCell>
                {row.topCategory ? (
                  <Badge className="bg-[#f0e5ff] text-[#5b3ba4] dark:bg-purple-900/60 dark:text-purple-50">
                    {row.topCategory}
                  </Badge>
                ) : (
                  <span className="text-xs text-slate-500">—</span>
                )}
              </TableCell>
              <TableCell className="text-sm text-slate-700 dark:text-slate-200">
                {coupons || '—'}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
