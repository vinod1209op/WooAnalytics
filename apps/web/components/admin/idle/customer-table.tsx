'use client';

import Link from 'next/link';
import { Fragment, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { GhlCustomer } from '@/hooks/useGhlCustomers';
import { formatDate, formatMoney, formatPoints, formatPhone, nameFromEmail } from '@/lib/formatters';

type SortKey = 'name' | 'email' | 'joined' | 'lastActive' | 'orders' | 'spend';
type SortDir = 'asc' | 'desc';

export function CustomerTable({
  rows,
  loading,
}: {
  rows: GhlCustomer[];
  loading: boolean;
}) {
  const hasData = rows.length > 0;
  const columnCount = 8;
  const [sortKey, setSortKey] = useState<SortKey>('lastActive');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const sortedRows = useMemo(() => {
    const list = [...rows];
    const num = (value: number | null | undefined) =>
      value == null || Number.isNaN(value) ? null : value;
    const str = (value: string | null | undefined) =>
      (value ?? '').toString().toLowerCase();
    const dateVal = (value: string | null | undefined) =>
      value ? new Date(value).getTime() : 0;

    const compare = (a: GhlCustomer, b: GhlCustomer) => {
      let cmp = 0;
      switch (sortKey) {
        case 'name':
          cmp = str(a.name || nameFromEmail(a.email)).localeCompare(
            str(b.name || nameFromEmail(b.email))
          );
          break;
        case 'email':
          cmp = str(a.email).localeCompare(str(b.email));
          break;
        case 'joined':
          cmp = dateVal(a.dateAdded) - dateVal(b.dateAdded);
          break;
        case 'lastActive':
          cmp = dateVal(a.metrics?.lastOrderDate) - dateVal(b.metrics?.lastOrderDate);
          break;
        case 'orders':
          cmp =
            (num(a.metrics?.totalOrdersCount) ?? -1) -
            (num(b.metrics?.totalOrdersCount) ?? -1);
          break;
        case 'spend':
          cmp =
            (num(a.metrics?.totalSpend) ?? -1) - (num(b.metrics?.totalSpend) ?? -1);
          break;
        default:
          cmp = 0;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    };

    return list.sort(compare);
  }, [rows, sortKey, sortDir]);

  const setSort = (key: SortKey, dir: SortDir) => {
    setSortKey(key);
    setSortDir(dir);
  };

  const SortControl = ({ columnKey }: { columnKey: SortKey }) => (
    <span className="ml-1 inline-flex flex-col leading-none">
      <button
        type="button"
        aria-label={`Sort ${columnKey} ascending`}
        onClick={() => setSort(columnKey, 'asc')}
        className={`text-[10px] ${
          sortKey === columnKey && sortDir === 'asc'
            ? 'text-[#5b3ba4]'
            : 'text-slate-400'
        }`}
      >
        ▲
      </button>
      <button
        type="button"
        aria-label={`Sort ${columnKey} descending`}
        onClick={() => setSort(columnKey, 'desc')}
        className={`text-[10px] ${
          sortKey === columnKey && sortDir === 'desc'
            ? 'text-[#5b3ba4]'
            : 'text-slate-400'
        }`}
      >
        ▼
      </button>
    </span>
  );

  return (
    <Table>
      <TableHeader className="bg-[#f7f1ff]">
        <TableRow className="border-[#eadcff]">
          <TableHead className="text-xs font-semibold uppercase tracking-wide text-[#7a5bcf]">
            #
          </TableHead>
          <TableHead className="text-xs font-semibold uppercase tracking-wide text-[#7a5bcf]">
            <div className="flex items-center">
              Name
              <SortControl columnKey="name" />
            </div>
          </TableHead>
          <TableHead className="text-xs font-semibold uppercase tracking-wide text-[#7a5bcf]">
            <div className="flex items-center">
              Email
              <SortControl columnKey="email" />
            </div>
          </TableHead>
          <TableHead className="text-xs font-semibold uppercase tracking-wide text-[#7a5bcf]">
            <div className="flex items-center">
              Joined
              <SortControl columnKey="joined" />
            </div>
          </TableHead>
          <TableHead className="text-xs font-semibold uppercase tracking-wide text-[#7a5bcf]">
            <div className="flex items-center">
              Last active
              <SortControl columnKey="lastActive" />
            </div>
          </TableHead>
          <TableHead className="text-xs font-semibold uppercase tracking-wide text-[#7a5bcf]">
            <div className="flex items-center">
              Orders
              <SortControl columnKey="orders" />
            </div>
          </TableHead>
          <TableHead className="text-xs font-semibold uppercase tracking-wide text-[#7a5bcf]">
            <div className="flex items-center">
              Spend
              <SortControl columnKey="spend" />
            </div>
          </TableHead>
          <TableHead className="text-right text-xs font-semibold uppercase tracking-wide text-[#7a5bcf]">
            Details
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading && (
          <TableRow>
            <TableCell colSpan={columnCount} className="text-sm text-slate-500">
              Loading…
            </TableCell>
          </TableRow>
        )}
        {!loading && !hasData && (
          <TableRow>
            <TableCell colSpan={columnCount} className="text-sm text-slate-500">
              No GHL customers found.
            </TableCell>
          </TableRow>
        )}
        {sortedRows.map((row, index) => {
          const displayName = row.name || nameFromEmail(row.email);
          const quizSubmitted = row.tags?.includes('quiz submitted');
          return (
            <Fragment key={row.contactId}>
              <TableRow>
                <TableCell className="text-sm text-slate-700 dark:text-slate-200">
                  {index + 1}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <span className="font-medium text-[#5b3ba4] dark:text-purple-100">
                      {displayName}
                    </span>
                    {row.phone && (
                      <span className="text-xs text-slate-500">
                        {formatPhone(row.phone)}
                      </span>
                    )}
                    {row.loyalty?.pointsToNext != null && (
                      <span className="text-[11px] text-slate-500">
                        {formatPoints(row.loyalty.pointsToNext)} to next reward
                      </span>
                    )}
                    {row.loyalty?.pointsToNext != null &&
                      row.loyalty.pointsToNext <= 10 && (
                        <Badge className="w-fit bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-100">
                          Close to reward
                        </Badge>
                      )}
                    {(quizSubmitted || row.tags?.includes('needs_medical_clearance')) && (
                      <div className="flex flex-wrap gap-1 text-[10px] uppercase tracking-wide">
                        {quizSubmitted && (
                          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-100">
                            Quiz submitted
                          </Badge>
                        )}
                        {row.tags?.includes('needs_medical_clearance') && (
                          <Badge className="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-100">
                            Needs clearance
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-slate-700 dark:text-slate-200">
                  {row.email || '—'}
                </TableCell>
                <TableCell className="text-sm text-slate-700 dark:text-slate-200">
                  {formatDate(row.dateAdded)}
                </TableCell>
                <TableCell className="text-sm text-slate-700 dark:text-slate-200">
                  {formatDate(row.metrics?.lastOrderDate ?? row.dateUpdated)}
                </TableCell>
                <TableCell className="text-sm text-slate-700 dark:text-slate-200">
                  {row.metrics?.totalOrdersCount ?? '—'}
                </TableCell>
                <TableCell className="text-sm text-slate-700 dark:text-slate-200">
                  {formatMoney(row.metrics?.totalSpend ?? null)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="border-[#d9c7f5] text-[#5b3ba4] hover:bg-[#f0e5ff] dark:border-purple-900/50 dark:text-purple-100 dark:hover:bg-purple-900/60"
                    >
                      <Link href={`/admin/customers/${row.contactId}`}>Details</Link>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            </Fragment>
          );
        })}
      </TableBody>
    </Table>
  );
}
