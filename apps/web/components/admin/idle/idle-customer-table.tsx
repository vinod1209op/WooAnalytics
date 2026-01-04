'use client';

import Link from 'next/link';
import { Fragment, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { GhlIdleCustomer } from '@/hooks/useGhlIdleCustomers';
import { formatDate, formatMoney, formatPoints, formatPhone, nameFromEmail } from '@/lib/formatters';

type SortKey = 'name' | 'email' | 'lastOrder' | 'daysIdle' | 'spend' | 'risk' | 'segment';
type SortDir = 'asc' | 'desc';

type SortControlProps = {
  columnKey: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey, dir: SortDir) => void;
};

function SortControl({ columnKey, sortKey, sortDir, onSort }: SortControlProps) {
  return (
    <span className="ml-1 inline-flex flex-col leading-none">
      <button
        type="button"
        aria-label={`Sort ${columnKey} ascending`}
        onClick={() => onSort(columnKey, 'asc')}
        className={`text-[10px] ${
          sortKey === columnKey && sortDir === 'asc' ? 'text-[#5b3ba4]' : 'text-slate-400'
        }`}
      >
        ▲
      </button>
      <button
        type="button"
        aria-label={`Sort ${columnKey} descending`}
        onClick={() => onSort(columnKey, 'desc')}
        className={`text-[10px] ${
          sortKey === columnKey && sortDir === 'desc' ? 'text-[#5b3ba4]' : 'text-slate-400'
        }`}
      >
        ▼
      </button>
    </span>
  );
}

export function IdleCustomerTable({
  rows,
  loading,
}: {
  rows: GhlIdleCustomer[];
  loading: boolean;
}) {
  const hasData = rows.length > 0;
  const columnCount = 9;
  const [sortKey, setSortKey] = useState<SortKey>('lastOrder');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const sortedRows = useMemo(() => {
    const list = [...rows];
    const str = (value: string | null | undefined) =>
      (value ?? '').toString().toLowerCase();
    const dateVal = (value: string | null | undefined) =>
      value ? new Date(value).getTime() : 0;
    const num = (value: number | null | undefined) =>
      value == null || Number.isNaN(value) ? 0 : value;

    const compare = (a: GhlIdleCustomer, b: GhlIdleCustomer) => {
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
        case 'lastOrder':
          cmp = dateVal(a.metrics?.lastOrderDate) - dateVal(b.metrics?.lastOrderDate);
          break;
        case 'daysIdle':
          cmp =
            num(a.metrics?.daysSinceLastOrder) -
            num(b.metrics?.daysSinceLastOrder);
          break;
        case 'spend':
          cmp =
            num(a.metrics?.totalSpend ?? a.metrics?.lastOrderValue) -
            num(b.metrics?.totalSpend ?? b.metrics?.lastOrderValue);
          break;
        case 'risk':
          cmp = num(a.churnRisk) - num(b.churnRisk);
          break;
        case 'segment':
          cmp = str(a.segment).localeCompare(str(b.segment));
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
              <SortControl columnKey="name" sortKey={sortKey} sortDir={sortDir} onSort={setSort} />
            </div>
          </TableHead>
          <TableHead className="text-xs font-semibold uppercase tracking-wide text-[#7a5bcf]">
            <div className="flex items-center">
              Email
              <SortControl columnKey="email" sortKey={sortKey} sortDir={sortDir} onSort={setSort} />
            </div>
          </TableHead>
          <TableHead className="text-xs font-semibold uppercase tracking-wide text-[#7a5bcf]">
            <div className="flex items-center">
              Last order
              <SortControl columnKey="lastOrder" sortKey={sortKey} sortDir={sortDir} onSort={setSort} />
            </div>
          </TableHead>
          <TableHead className="text-xs font-semibold uppercase tracking-wide text-[#7a5bcf]">
            <div className="flex items-center">
              Days idle
              <SortControl columnKey="daysIdle" sortKey={sortKey} sortDir={sortDir} onSort={setSort} />
            </div>
          </TableHead>
          <TableHead className="text-xs font-semibold uppercase tracking-wide text-[#7a5bcf]">
            <div className="flex items-center">
              Spend
              <SortControl columnKey="spend" sortKey={sortKey} sortDir={sortDir} onSort={setSort} />
            </div>
          </TableHead>
          <TableHead className="text-xs font-semibold uppercase tracking-wide text-[#7a5bcf]">
            <div className="flex items-center">
              Risk
              <SortControl columnKey="risk" sortKey={sortKey} sortDir={sortDir} onSort={setSort} />
            </div>
          </TableHead>
          <TableHead className="text-xs font-semibold uppercase tracking-wide text-[#7a5bcf]">
            <div className="flex items-center">
              Segment
              <SortControl columnKey="segment" sortKey={sortKey} sortDir={sortDir} onSort={setSort} />
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
              No idle customers found.
            </TableCell>
          </TableRow>
        )}
        {sortedRows.map((row, index) => {
          const displayName = row.name || nameFromEmail(row.email);
          const riskValue = row.churnRisk;
          const riskTone =
            riskValue == null
              ? 'bg-slate-100 text-slate-600 dark:bg-slate-800/50 dark:text-slate-200'
              : riskValue >= 80
              ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-100'
              : riskValue >= 60
              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-100'
              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-100';
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
                    {row.tags?.includes('needs_medical_clearance') && (
                      <Badge className="w-fit bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-100">
                        Needs clearance
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-slate-700 dark:text-slate-200">
                  {row.email || '—'}
                </TableCell>
                <TableCell className="text-sm text-slate-700 dark:text-slate-200">
                  {formatDate(row.metrics?.lastOrderDate ?? null)}
                </TableCell>
                <TableCell className="text-sm text-slate-700 dark:text-slate-200">
                  {row.metrics?.daysSinceLastOrder != null
                    ? `${row.metrics.daysSinceLastOrder.toFixed(1)} days`
                    : '—'}
                </TableCell>
                <TableCell className="text-sm text-slate-700 dark:text-slate-200">
                  {formatMoney(
                    row.metrics?.totalSpend ?? row.metrics?.lastOrderValue ?? null
                  )}
                </TableCell>
                <TableCell className="text-sm text-slate-700 dark:text-slate-200">
                  <Badge className={`w-fit text-[11px] ${riskTone}`}>
                    {riskValue != null ? `${riskValue}/100` : '—'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    {row.segment ? (
                      <Badge
                        variant="outline"
                        className="w-fit border-[#dcc7ff] bg-[#f6efff] text-xs text-[#5b3ba4] shadow-sm dark:border-purple-900/50 dark:bg-purple-900/40 dark:text-purple-100"
                      >
                        {row.segment}
                      </Badge>
                    ) : (
                      <span className="text-sm text-slate-500">—</span>
                    )}
                    {row.topCategory && (
                      <span className="text-[11px] text-slate-500">{row.topCategory}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="border-[#d9c7f5] text-[#5b3ba4] hover:bg-[#f0e5ff] dark:border-purple-900/50 dark:text-purple-100 dark:hover:bg-purple-900/60"
                  >
                    <Link href={`/admin/customers/${row.contactId}`}>Details</Link>
                  </Button>
                </TableCell>
              </TableRow>
            </Fragment>
          );
        })}
      </TableBody>
    </Table>
  );
}
