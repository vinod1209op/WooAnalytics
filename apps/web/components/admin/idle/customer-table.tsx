'use client';

import { Fragment, useState, type ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { IdleCustomer } from '@/hooks/useInactiveCustomers';
import { cn } from '@/lib/utils';

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

function formatLabel(value: string | null | undefined) {
  if (!value) return '—';
  return value.replace(/_/g, ' ');
}

function DetailLine({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      <div className="min-w-0 text-sm text-slate-700 dark:text-slate-200">{children}</div>
    </div>
  );
}

function DetailSection({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "min-w-0 space-y-2 rounded-xl border border-[#f0e5ff] bg-white/60 p-3 dark:border-purple-900/40 dark:bg-purple-950/30",
        className
      )}
    >
      <div className="text-[11px] font-semibold uppercase tracking-wide text-[#7a5bcf] dark:text-purple-200">
        {title}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
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
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const columnCount = 6;

  const toggleRow = (customerId: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(customerId)) {
        next.delete(customerId);
      } else {
        next.add(customerId);
      }
      return next;
    });
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Last order</TableHead>
          <TableHead>Risk</TableHead>
          <TableHead>Segment</TableHead>
          <TableHead className="text-right">Details</TableHead>
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
        {rows.map((row) => {
          const isExpanded = expandedRows.has(row.customerId);
          const orderHistory =
            row.orderHistory && row.orderHistory.length
              ? row.orderHistory
              : row.lastItems.length
              ? [
                  {
                    orderId: row.lastOrderId ?? row.customerId,
                    createdAt: row.lastOrderAt,
                    total: row.lastOrderTotal,
                    discountTotal: row.lastOrderDiscount,
                    shippingTotal: row.lastOrderShipping,
                    taxTotal: row.lastOrderTax,
                    coupons: row.lastOrderCoupons,
                    items: row.lastItems,
                  },
                ]
              : [];
          const historyLabel =
            orderHistory.length && row.ordersCount > orderHistory.length
              ? `Showing latest ${orderHistory.length} of ${row.ordersCount} orders`
              : orderHistory.length
              ? `${row.ordersCount} orders`
              : 'No orders yet';
          const coupons = row.lastOrderCoupons.join(', ');
          return (
            <Fragment key={row.customerId}>
              <TableRow>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <span className="font-medium text-[#5b3ba4] dark:text-purple-100">
                      {row.name || 'Unknown'}
                    </span>
                    <span className="text-xs text-slate-500">#{row.customerId}</span>
                    {row.phone && <span className="text-xs text-slate-500">{row.phone}</span>}
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleRow(row.customerId)}
                    className="border-[#d9c7f5] text-[#5b3ba4] hover:bg-[#f0e5ff] dark:border-purple-900/50 dark:text-purple-100 dark:hover:bg-purple-900/60"
                  >
                    {isExpanded ? 'Hide' : 'Details'}
                  </Button>
                </TableCell>
              </TableRow>
              {isExpanded && (
                <TableRow className="bg-[#f7f1ff] dark:bg-purple-950/30">
                  <TableCell colSpan={columnCount} className="p-0">
                    <div className="rounded-2xl border border-[#eadcff] bg-white/80 p-4 shadow-sm dark:border-purple-900/50 dark:bg-purple-950/20">
                      <div className="grid gap-3 text-sm text-slate-700 break-words dark:text-slate-200">
                        <div className="grid min-w-0 gap-3 md:grid-cols-3">
                          <DetailSection title="Profile">
                            <DetailLine label="Name">{row.name || 'Unknown'}</DetailLine>
                            <DetailLine label="Email">{row.email || '—'}</DetailLine>
                            <DetailLine label="Phone">{row.phone || '—'}</DetailLine>
                            <DetailLine label="Customer ID">{row.customerId}</DetailLine>
                            <DetailLine label="Last active">{formatDate(row.lastActiveAt)}</DetailLine>
                          </DetailSection>
                          <DetailSection title="Intent">
                            <DetailLine label="Primary">
                              {formatLabel(row.intent?.primaryIntent ?? null)}
                            </DetailLine>
                            <DetailLine label="Mental state">
                              {formatLabel(row.intent?.mentalState ?? null)}
                            </DetailLine>
                            <DetailLine label="Improvement">
                              {formatLabel(row.intent?.improvementArea ?? null)}
                            </DetailLine>
                            <DetailLine label="Source">{row.intent?.source ?? '—'}</DetailLine>
                            <DetailLine label="Updated">
                              {formatDate(row.intent?.updatedAt ?? null)}
                            </DetailLine>
                          </DetailSection>
                          <DetailSection title="Segmentation">
                            <DetailLine label="Segment">{row.segment ?? '—'}</DetailLine>
                            <DetailLine label="Top category">{row.topCategory ?? '—'}</DetailLine>
                            <DetailLine label="Churn risk">
                              {row.churnRisk != null ? `${row.churnRisk}/100` : '—'}
                            </DetailLine>
                            <DetailLine label="Days since last order">
                              {row.metrics?.daysSinceLastOrder ?? '—'}
                            </DetailLine>
                            <DetailLine label="Avg days between">
                              {row.metrics?.avgDaysBetweenOrders ?? '—'}
                            </DetailLine>
                          </DetailSection>
                        </div>
                        <div className="grid min-w-0 gap-3 md:grid-cols-4">
                          <DetailSection title="Orders">
                            <DetailLine label="Total orders">{row.ordersCount}</DetailLine>
                            <DetailLine label="First order">
                              {formatDate(row.firstOrderAt)}
                            </DetailLine>
                            <DetailLine label="LTV">{formatMoney(row.metrics?.ltv ?? null)}</DetailLine>
                          </DetailSection>
                          <DetailSection title="Last order">
                            <DetailLine label="Date">{formatDate(row.lastOrderAt)}</DetailLine>
                            <DetailLine label="Total">{formatMoney(row.lastOrderTotal)}</DetailLine>
                            <DetailLine label="Discount">
                              {formatMoney(row.lastOrderDiscount)}
                            </DetailLine>
                            <DetailLine label="Shipping">
                              {formatMoney(row.lastOrderShipping)}
                            </DetailLine>
                            <DetailLine label="Tax">{formatMoney(row.lastOrderTax)}</DetailLine>
                          </DetailSection>
                          <DetailSection title="Items" className="md:col-span-2">
                            <div className="text-xs text-slate-500">{historyLabel}</div>
                            {orderHistory.length ? (
                              <div className="space-y-3">
                                {orderHistory.map((order) => (
                                  <div
                                    key={order.orderId}
                                    className="min-w-0 rounded-lg border border-[#eadcff] bg-white/80 p-2 shadow-sm dark:border-purple-900/50 dark:bg-purple-950/30"
                                  >
                                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                                      <span className="font-medium text-slate-600 dark:text-slate-300">
                                        Order #{order.orderId}
                                      </span>
                                      <span>
                                        {formatDate(order.createdAt)} • {formatMoney(order.total)}
                                      </span>
                                    </div>
                                    {order.items.length ? (
                                      <ul className="mt-2 space-y-2">
                                        {order.items.map((item, index) => {
                                          const name = item.name ?? 'Item';
                                          const sku = item.sku ? `SKU ${item.sku}` : null;
                                          const categories =
                                            item.categories && item.categories.length
                                              ? item.categories.join(', ')
                                              : null;
                                          return (
                                            <li
                                              key={`${order.orderId}-${item.productId ?? index}`}
                                              className="break-words rounded-md border border-[#f0e5ff] bg-white/80 p-2 text-xs text-slate-700 dark:border-purple-900/40 dark:bg-purple-950/40 dark:text-slate-100"
                                            >
                                              <div className="flex flex-wrap items-center justify-between gap-2">
                                                <span className="font-medium">
                                                  {name} x{item.quantity}
                                                </span>
                                                <span className="text-slate-500 dark:text-slate-300">
                                                  {formatMoney(item.lineTotal)}
                                                </span>
                                              </div>
                                              {(sku || categories) && (
                                                <div className="mt-1 break-words text-[11px] text-slate-500 dark:text-slate-300">
                                                  {sku && <span>{sku}</span>}
                                                  {sku && categories && <span className="px-1">•</span>}
                                                  {categories && <span>{categories}</span>}
                                                </div>
                                              )}
                                            </li>
                                          );
                                        })}
                                      </ul>
                                    ) : (
                                      <div className="mt-2 text-xs text-slate-500">
                                        No items listed for this order.
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-sm text-slate-500">No orders found.</div>
                            )}
                          </DetailSection>
                        </div>
                        <div className="grid min-w-0 gap-3 md:grid-cols-3">
                          <DetailSection title="Coupons">
                            <DetailLine label="Codes">{coupons || '—'}</DetailLine>
                          </DetailSection>
                          <DetailSection title="Offer">
                            <DetailLine label="Type">
                              {formatLabel(row.offer?.offer ?? null)}
                            </DetailLine>
                            <DetailLine label="Value">
                              {row.offer?.value != null ? row.offer.value : '—'}
                            </DetailLine>
                            <DetailLine label="Message">{row.offer?.message ?? '—'}</DetailLine>
                          </DetailSection>
                          <DetailSection title="Tags">
                            <DetailLine label="Labels">
                              {row.tags && row.tags.length ? (
                                <div className="flex flex-wrap gap-1">
                                  {row.tags.map((tag) => (
                                    <Badge
                                      key={tag}
                                      variant="outline"
                                      className="max-w-full break-words border-[#d9c7f5] text-xs text-[#5b3ba4] dark:border-purple-900/50 dark:text-purple-100"
                                    >
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                '—'
                              )}
                            </DetailLine>
                          </DetailSection>
                        </div>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </Fragment>
          );
        })}
      </TableBody>
    </Table>
  );
}
