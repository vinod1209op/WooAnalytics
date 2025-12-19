'use client';

import { useEffect, useMemo, useState } from 'react';
import { useInactiveCustomers } from '@/hooks/useInactiveCustomers';
import { useStore } from '@/providers/store-provider';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE?.trim() || 'http://localhost:3001';
const DAYS_PRESETS = [30, 60, 90];

function formatDate(value: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(+d)) return value;
  return d.toLocaleDateString();
}

export default function IdleCustomersPage() {
  const { store, loading: storeLoading } = useStore();
  const [days, setDays] = useState(30);
  const [limit] = useState(50);
  const [cursor, setCursor] = useState(0);
  const [copied, setCopied] = useState(false);

  const { data, loading, error } = useInactiveCustomers({ days, limit, cursor });

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  const csvUrl = useMemo(() => {
    if (!store?.id) return '#';
    const params = new URLSearchParams({
      storeId: store.id,
      days: String(days),
      limit: String(limit),
      cursor: String(cursor),
      format: 'csv',
    });
    return `${API_BASE}/customers/inactive?${params.toString()}`;
  }, [store?.id, days, limit, cursor]);

  const sortedRows = useMemo(() => {
    const list = data?.data ?? [];
    const toTs = (value: string | null) => (value ? new Date(value).getTime() : 0);
    return [...list].sort((a, b) => toTs(b.lastOrderAt) - toTs(a.lastOrderAt));
  }, [data?.data]);

  const handleCopyEmails = async () => {
    const emails = (data?.data ?? []).map((c) => c.email).filter(Boolean).join('\n');
    if (!emails) return;
    try {
      await navigator.clipboard.writeText(emails);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const canPageForward = !!data?.nextCursor;

  return (
    <div className="space-y-6">
      <Card className="border-[#d9c7f5] bg-white/80 p-4 shadow-sm backdrop-blur dark:border-purple-900/50 dark:bg-purple-950/30">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Badge className="bg-purple-600 text-white shadow-sm dark:bg-purple-500">Admin</Badge>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#5b3ba4] dark:text-purple-100">
              Idle customers
            </h1>
            <p className="text-sm text-[#6f4bb3] dark:text-purple-200/80">
              View idle customers, copy emails, or export CSV for GHL.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={String(days)}
              onValueChange={(val) => {
                setDays(Number(val));
                setCursor(0);
              }}
            >
              <SelectTrigger className="w-[150px] rounded-xl border-[#d9c7f5] bg-white text-[#5b3ba4] shadow-sm dark:border-purple-900/50 dark:bg-purple-950/50">
                <SelectValue placeholder="Days" />
              </SelectTrigger>
              <SelectContent>
                {DAYS_PRESETS.map((d) => (
                  <SelectItem key={d} value={String(d)}>
                    Idle {d} days
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              className="rounded-xl border-[#d9c7f5] text-[#5b3ba4] hover:bg-[#f0e5ff] dark:border-purple-900/50 dark:text-purple-100 dark:hover:bg-purple-900/60"
              onClick={handleCopyEmails}
              disabled={!data?.data?.length}
            >
              {copied ? 'Copied' : 'Copy emails'}
            </Button>
            <Button
              variant="default"
              className="rounded-xl bg-[#6f4bb3] text-white hover:bg-[#5b3ba4]"
              asChild
              disabled={!store?.id}
            >
              <a href={csvUrl}>Export CSV</a>
            </Button>
          </div>
        </div>
        <div className="mt-2 text-xs text-slate-500 dark:text-slate-300">
          Showing {data?.data?.length ?? 0} rows • cursor {cursor} • cutoff{' '}
          {data?.cutoff ? formatDate(data.cutoff) : '—'}
        </div>
      </Card>

      {error && (
        <Card className="border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </Card>
      )}

      <Card className="border-[#d9c7f5] bg-white/80 p-4 shadow-sm backdrop-blur dark:border-purple-900/50 dark:bg-purple-950/30">
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Last order</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Coupons</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-sm text-slate-500">
                    Loading…
                  </TableCell>
                </TableRow>
              )}
              {!loading && data?.data?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-sm text-slate-500">
                    No idle customers for this window.
                  </TableCell>
                </TableRow>
              )}
              {sortedRows.map((row) => {
                const items = row.lastItems
                  .map((i) => `${i.name ?? 'Item'} x${i.quantity}`)
                  .join(', ');
                const coupons = row.lastOrderCoupons.join(', ');
                return (
                  <TableRow key={row.customerId}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-[#5b3ba4] dark:text-purple-100">
                          {row.name || 'Unknown'}
                        </span>
                        <span className="text-xs text-slate-500">#{row.customerId}</span>
                        {row.phone && (
                          <span className="text-xs text-slate-500">{row.phone}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-slate-700 dark:text-slate-200">
                      {row.email}
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
        </div>

        <div className="mt-4 flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
          <div>
            Showing page starting at cursor {cursor}. {data?.count ?? 0} rows fetched.
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="rounded-xl border-[#d9c7f5] text-[#5b3ba4] hover:bg-[#f0e5ff] dark:border-purple-900/50 dark:text-purple-100 dark:hover:bg-purple-900/60"
              disabled={cursor === 0 || loading}
              onClick={() => setCursor(Math.max(cursor - limit, 0))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              className="rounded-xl border-[#d9c7f5] text-[#5b3ba4] hover:bg-[#f0e5ff] dark:border-purple-900/50 dark:text-purple-100 dark:hover:bg-purple-900/60"
              disabled={!canPageForward || loading}
              onClick={() => {
                if (data?.nextCursor != null) setCursor(data.nextCursor);
              }}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
