'use client';

import Link from 'next/link';
import { Fragment, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { IdleCustomer } from '@/hooks/useInactiveCustomers';

function formatDate(value: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(+d)) return value;
  return d.toLocaleDateString();
}

function formatMoney(value: number | null) {
  if (value == null || Number.isNaN(value)) return '—';
  return `$${value.toFixed(2)}`;
}

function formatPhone(value: string | null) {
  if (!value) return '—';
  const raw = value.trim();
  if (!raw) return '—';
  const digits = raw.replace(/\D/g, '');
  if (!digits) return raw;
  if (digits.length === 10) {
    return `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  if (digits.length < 10) {
    return `+1 ${digits}`;
  }
  return `+${digits}`;
}

type SortKey = 'id' | 'name' | 'email' | 'orderTotal' | 'risk';
type SortDir = 'asc' | 'desc';

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
  const columnCount = 7;
  const [sortKey, setSortKey] = useState<SortKey>('risk');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const sortedRows = useMemo(() => {
    const list = [...rows];
    const compare = (a: IdleCustomer, b: IdleCustomer) => {
      const num = (value: number | null | undefined) =>
        value == null || Number.isNaN(value) ? null : value;
      const str = (value: string | null | undefined) =>
        (value ?? '').toString().toLowerCase();

      let cmp = 0;
      switch (sortKey) {
        case 'id': {
          cmp = (num(a.customerId) ?? -1) - (num(b.customerId) ?? -1);
          break;
        }
        case 'name': {
          cmp = str(a.name).localeCompare(str(b.name));
          break;
        }
        case 'email': {
          cmp = str(a.email).localeCompare(str(b.email));
          break;
        }
        case 'orderTotal': {
          const aTotal = num(a.lastOrderTotal);
          const bTotal = num(b.lastOrderTotal);
          if (aTotal == null && bTotal == null) cmp = 0;
          else if (aTotal == null) cmp = 1;
          else if (bTotal == null) cmp = -1;
          else cmp = aTotal - bTotal;
          break;
        }
        case 'risk': {
          const aRisk = num(a.churnRisk);
          const bRisk = num(b.churnRisk);
          if (aRisk == null && bRisk == null) cmp = 0;
          else if (aRisk == null) cmp = 1;
          else if (bRisk == null) cmp = -1;
          else cmp = aRisk - bRisk;
          if (cmp === 0) {
            const aDate = a.lastOrderAt ? new Date(a.lastOrderAt).getTime() : 0;
            const bDate = b.lastOrderAt ? new Date(b.lastOrderAt).getTime() : 0;
            cmp = aDate - bDate;
          }
          break;
        }
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
      <TableHeader>
        <TableRow>
          <TableHead>
            <div className="flex items-center">
              ID
              <SortControl columnKey="id" />
            </div>
          </TableHead>
          <TableHead>
            <div className="flex items-center">
              Name
              <SortControl columnKey="name" />
            </div>
          </TableHead>
          <TableHead>
            <div className="flex items-center">
              Email
              <SortControl columnKey="email" />
            </div>
          </TableHead>
          <TableHead>
            <div className="flex items-center">
              Order total
              <SortControl columnKey="orderTotal" />
            </div>
          </TableHead>
          <TableHead>
            <div className="flex items-center">
              Risk
              <SortControl columnKey="risk" />
            </div>
          </TableHead>
          <TableHead>Segment</TableHead>
          <TableHead className="text-right">Full details</TableHead>
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
              No idle customers for this window.
            </TableCell>
          </TableRow>
        )}
        {sortedRows.map((row) => {
          return (
            <Fragment key={row.customerId}>
              <TableRow>
                <TableCell className="text-sm text-slate-700 dark:text-slate-200">
                  #{row.customerId}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <span className="font-medium text-[#5b3ba4] dark:text-purple-100">
                      {row.name || 'Unknown'}
                    </span>
                    {row.phone && (
                      <span className="text-xs text-slate-500">{formatPhone(row.phone)}</span>
                    )}
                    {row.tags?.includes('needs_medical_clearance') && (
                      <Badge className="w-fit bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-100">
                        Needs clearance
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-slate-700 dark:text-slate-200">
                  {row.email}
                </TableCell>
                <TableCell className="text-sm text-slate-700 dark:text-slate-200">
                  <div>Ordered: {formatDate(row.lastOrderAt)}</div>
                  <div>Total: {formatMoney(row.lastOrderTotal)}</div>
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
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="border-[#d9c7f5] text-[#5b3ba4] hover:bg-[#f0e5ff] dark:border-purple-900/50 dark:text-purple-100 dark:hover:bg-purple-900/60"
                    >
                      <Link href={`/admin/customers/${row.customerId}`}>Full Details</Link>
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
