'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StatCard } from '@/components/admin/customer-profile/stat-card';
import { QuizAnswersCard } from '@/components/admin/customer-profile/quiz-answers-card';
import { useCustomerProfile } from '@/hooks/useCustomerProfile';
import { useCountUp } from '@/hooks/useCountUp';
import { formatDate, formatMoney, formatPhone, formatPoints, nameFromEmail } from '@/lib/formatters';
import { getLastReward, getNextReward } from '@/lib/loyalty';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE?.trim() || 'http://localhost:3001';

function formatDays(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '—';
  return `${value.toFixed(1)} days`;
}

function daysSinceDate(value?: string | null) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(+d)) return null;
  const diff = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
  return Math.round(diff * 10) / 10;
}

function formatLabel(value?: string | null) {
  if (!value) return '—';
  return value.replace(/_/g, ' ');
}

export default function CustomerProfilePage() {
  const params = useParams<{ id: string }>();
  const contactId = params?.id;
  const { data, loading, error } = useCustomerProfile(contactId);
  const [actionState, setActionState] = useState<Record<string, 'idle' | 'sending' | 'sent' | 'error'>>({});
  const [actionError, setActionError] = useState<string | null>(null);

  const runAction = async (action: string) => {
    if (!data?.customer?.id) return;
    setActionError(null);
    setActionState((prev) => ({ ...prev, [action]: 'sending' }));
    try {
      const res = await fetch(`${API_BASE}/customers/ghl-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId: data.customer.id, action }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || 'Failed to send action');
      }
      setActionState((prev) => ({ ...prev, [action]: 'sent' }));
      setTimeout(() => {
        setActionState((prev) => ({ ...prev, [action]: 'idle' }));
      }, 1800);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send action';
      setActionError(message);
      setActionState((prev) => ({ ...prev, [action]: 'error' }));
    }
  };

  const tags = data?.customer?.tags ?? [];
  const dbStats = data?.db?.stats ?? null;
  const dbOrders = data?.db?.orders ?? [];
  const dbTopProducts = data?.db?.topProducts ?? [];
  const dbTopCategories = data?.db?.topCategories ?? [];
  const topProducts = data?.topProducts ?? dbTopProducts;
  const topCategories = data?.topCategories ?? dbTopCategories;
  const loyalty = data?.loyalty ?? null;
  const leadCoupons = data?.leadCoupons ?? [];
  const leadCouponsToUnlock = leadCoupons
    .filter((coupon) => coupon.remainingSpend != null && !coupon.eligible)
    .sort((a, b) => (a.remainingSpend ?? 0) - (b.remainingSpend ?? 0));
  const leadCouponsPreview = leadCouponsToUnlock.slice(0, 6);
  const pointsBalance = loyalty?.pointsBalance ?? null;
  const pointsToNext = loyalty?.pointsToNext ?? null;
  const nextRewardAt = loyalty?.nextRewardAt ?? null;
  const animatedPoints = useCountUp(pointsBalance, { durationMs: 900 });
  const displayPoints = animatedPoints ?? pointsBalance;
  const nextReward = getNextReward(pointsBalance);
  const lastReward = getLastReward(pointsBalance);
  const progress =
    displayPoints != null && nextRewardAt
      ? Math.min(100, Math.round((displayPoints / nextRewardAt) * 100))
      : 0;
  const avgOrderValue =
    dbStats?.avgOrderValue ??
    (data?.metrics?.totalSpend != null &&
    data?.metrics?.totalOrdersCount != null &&
    data.metrics.totalOrdersCount > 0
      ? data.metrics.totalSpend / data.metrics.totalOrdersCount
      : null);
  const customerInsightsStats = [
    { label: 'Total spend', value: formatMoney(data?.metrics?.totalSpend ?? null) },
    { label: 'Points', value: formatPoints(displayPoints ?? null) },
    { label: 'Avg order', value: formatMoney(avgOrderValue) },
    { label: 'Total orders', value: data?.metrics?.totalOrdersCount ?? '—' },
    { label: 'First order', value: formatDate(data?.metrics?.firstOrderDate ?? null) },
    { label: 'Last order', value: formatDate(data?.metrics?.lastOrderDate ?? null) },
    { label: 'Last order value', value: formatMoney(data?.metrics?.lastOrderValue ?? null) },
    {
      label: 'Days since last',
      value: formatDays(
        dbStats?.daysSinceLastOrder ?? daysSinceDate(data?.metrics?.lastOrderDate ?? null)
      ),
    },
  ];

  customerInsightsStats.push({
    label: 'Points to next',
    value: pointsToNext != null ? `${pointsToNext} pts` : '—',
  });

  customerInsightsStats.push({
    label: 'Next reward at',
    value: nextRewardAt != null ? formatPoints(nextRewardAt) : '—',
  });

  if (dbStats?.avgDaysBetweenOrders != null) {
    customerInsightsStats.push({
      label: 'Avg days between',
      value: formatDays(dbStats.avgDaysBetweenOrders),
    });
  }
  if (data?.metrics?.orderSubscription) {
    customerInsightsStats.push({
      label: 'Order subscription',
      value: data.metrics.orderSubscription,
    });
  }

  return (
    <div className="space-y-6">
      <Card className="border-[#d9c7f5] bg-gradient-to-br from-[#fbf7ff] via-white to-[#f7f0ff] p-4 shadow-sm backdrop-blur dark:border-purple-900/50 dark:bg-purple-950/30">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Badge className="bg-purple-600 text-white shadow-sm dark:bg-purple-500">
              Customer
            </Badge>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#5b3ba4] dark:text-purple-100">
              Full customer profile
            </h1>
            <p className="text-sm text-[#6f4bb3] dark:text-purple-200/80">
              Unified profile view for a single buyer.
            </p>
          </div>
          <Button
            asChild
            variant="outline"
            className="rounded-xl border-[#d9c7f5] text-[#5b3ba4] hover:bg-[#f0e5ff] dark:border-purple-900/50 dark:text-purple-100 dark:hover:bg-purple-900/60"
          >
            <Link href="/admin/idle">Back to customers</Link>
          </Button>
        </div>
      </Card>

      {loading && (
        <Card className="border-[#eadcff] bg-white/70 p-4 text-sm text-slate-500 dark:border-purple-900/40 dark:bg-purple-950/30">
          Loading customer profile…
        </Card>
      )}

      {error && (
        <Card className="border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </Card>
      )}

      {data && (
        <>
          <Card className="border-[#eadcff] bg-white/70 p-4 shadow-sm dark:border-purple-900/40 dark:bg-purple-950/30">
            <div className="grid gap-3 lg:grid-cols-[1.35fr_1fr]">
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Customer
                </div>
                {(() => {
                  const displayName = data.customer.name || nameFromEmail(data.customer.email);
                  return (
                    <div className="text-2xl font-semibold text-[#5b3ba4] dark:text-purple-100">
                      {displayName}
                    </div>
                  );
                })()}
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                  {data.db?.customer?.id && (
                    <Badge
                      variant="outline"
                      className="rounded-full border-[#dcc7ff] bg-white/70 px-2 py-0.5 text-[#5b3ba4] shadow-sm dark:border-purple-900/60 dark:bg-purple-900/40 dark:text-purple-100"
                    >
                      ID {data.db.customer.id}
                    </Badge>
                  )}
                  {data.db?.customer?.wooId && (
                    <Badge
                      variant="outline"
                      className="rounded-full border-[#dcc7ff] bg-white/70 px-2 py-0.5 text-[#5b3ba4] shadow-sm dark:border-purple-900/60 dark:bg-purple-900/40 dark:text-purple-100"
                    >
                      Woo {data.db.customer.wooId}
                    </Badge>
                  )}
                  <Badge
                    variant="outline"
                    className="rounded-full border-[#dcc7ff] bg-white/70 px-2 py-0.5 text-[#5b3ba4] shadow-sm dark:border-purple-900/60 dark:bg-purple-900/40 dark:text-purple-100"
                  >
                    GHL {data.customer.id}
                  </Badge>
                </div>
              </div>
              <div className="rounded-2xl border border-[#eadcff] bg-white/80 p-4 text-sm text-slate-600 shadow-sm dark:border-purple-900/40 dark:bg-purple-950/40 dark:text-slate-200">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Contact
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <div>
                    <div className="text-[11px] uppercase tracking-wide text-slate-500">
                      Email
                    </div>
                    <div className="mt-1 text-sm text-slate-700 dark:text-slate-100">
                      {data.customer.email || '—'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-wide text-slate-500">
                      Phone
                    </div>
                    <div className="mt-1 text-sm text-slate-700 dark:text-slate-100">
                      {formatPhone(data.customer.phone)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-wide text-slate-500">
                      Joined
                    </div>
                    <div className="mt-1 text-sm text-slate-700 dark:text-slate-100">
                      {formatDate(data.customer.dateAdded)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-wide text-slate-500">
                      Last active
                    </div>
                    <div className="mt-1 text-sm text-slate-700 dark:text-slate-100">
                      {formatDate(data.customer.dateUpdated)}
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <div className="text-[11px] uppercase tracking-wide text-slate-500">
                      Address
                    </div>
                    <div className="mt-1 text-sm text-slate-700 dark:text-slate-100">
                      {data.customer.address || '—'}
                    </div>
                  </div>
                </div>
              </div>
              {tags.length > 0 && (
                <div className="lg:col-span-2">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    GHL Tags
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="outline"
                        className="max-w-full break-words border-[#dcc7ff] bg-[#f6efff] text-xs text-[#5b3ba4] shadow-sm dark:border-purple-900/50 dark:bg-purple-900/40 dark:text-purple-100"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>

          <Card className="border-[#eadcff] bg-white/70 p-4 shadow-sm dark:border-purple-900/40 dark:bg-purple-950/30">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#7a5bcf] dark:text-purple-200">
              Customer insights
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {customerInsightsStats.map((item) => (
                <StatCard key={item.label} label={item.label} value={item.value} />
              ))}
            </div>
          </Card>

          <Card className="border-[#eadcff] bg-white/70 p-4 shadow-sm dark:border-purple-900/40 dark:bg-purple-950/30">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-[#7a5bcf] dark:text-purple-200">
                  Loyalty engagement
                </div>
                <div className="mt-1 text-sm text-slate-600 dark:text-slate-200">
                  {nextReward?.title
                    ? `Next reward: ${nextReward.title}`
                    : 'Next reward not set yet.'}
                </div>
              </div>
              {lastReward?.title && (
                <div className="rounded-full border border-[#dcc7ff] bg-[#f6efff] px-3 py-1 text-xs text-[#5b3ba4] shadow-sm dark:border-purple-900/50 dark:bg-purple-900/40 dark:text-purple-100">
                  Last reward: {lastReward.title}
                </div>
              )}
              {pointsToNext != null && pointsToNext <= 10 && (
                <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-700 shadow-sm dark:border-emerald-900/50 dark:bg-emerald-900/30 dark:text-emerald-100">
                  Close to reward
                </div>
              )}
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{formatPoints(displayPoints)} balance</span>
                <span>
                  {nextRewardAt != null ? formatPoints(nextRewardAt) : '—'} target
                </span>
              </div>
              <div className="mt-2 h-3 w-full rounded-full bg-[#f4ecff] shadow-inner dark:bg-purple-900/40">
                <div
                  className="h-3 rounded-full bg-gradient-to-r from-[#b892ff] via-[#8e63f1] to-[#6f4bb3] transition-all duration-700"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="mt-2 text-xs text-slate-500">
                {pointsToNext != null
                  ? `${pointsToNext} points away from the next reward.`
                  : 'Points to next reward will appear after spend is calculated.'}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="rounded-xl border-[#d9c7f5] text-[#5b3ba4] hover:bg-[#f0e5ff] dark:border-purple-900/50 dark:text-purple-100 dark:hover:bg-purple-900/60"
                onClick={() => runAction('email_nudge')}
                disabled={actionState.email_nudge === 'sending'}
              >
                {actionState.email_nudge === 'sent'
                  ? 'Email sent'
                  : actionState.email_nudge === 'sending'
                  ? 'Sending…'
                  : 'Send email nudge'}
              </Button>
              <Button
                variant="outline"
                className="rounded-xl border-[#d9c7f5] text-[#5b3ba4] hover:bg-[#f0e5ff] dark:border-purple-900/50 dark:text-purple-100 dark:hover:bg-purple-900/60"
                onClick={() => runAction('sms_nudge')}
                disabled={actionState.sms_nudge === 'sending'}
              >
                {actionState.sms_nudge === 'sent'
                  ? 'SMS sent'
                  : actionState.sms_nudge === 'sending'
                  ? 'Sending…'
                  : 'Send SMS nudge'}
              </Button>
              <Button
                variant="outline"
                className="rounded-xl border-[#d9c7f5] text-[#5b3ba4] hover:bg-[#f0e5ff] dark:border-purple-900/50 dark:text-purple-100 dark:hover:bg-purple-900/60"
                onClick={() => runAction('reward_unlocked')}
                disabled={actionState.reward_unlocked === 'sending'}
              >
                {actionState.reward_unlocked === 'sent'
                  ? 'Reward tagged'
                  : actionState.reward_unlocked === 'sending'
                  ? 'Sending…'
                  : 'Tag reward unlocked'}
              </Button>
            </div>
            {actionError && (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
                {actionError}
              </div>
            )}
          </Card>

          {leadCouponsToUnlock.length > 0 && (
            <Card className="border-[#eadcff] bg-white/70 p-4 shadow-sm dark:border-purple-900/40 dark:bg-purple-950/30">
              <div className="text-xs font-semibold uppercase tracking-wide text-[#7a5bcf] dark:text-purple-200">
                Lead coupons to unlock
              </div>
              <div className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-200">
                {leadCouponsPreview.map((coupon) => (
                  <div
                    key={coupon.code}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[#f0e5ff] bg-white/80 p-2 text-xs text-slate-700 dark:border-purple-900/40 dark:bg-purple-950/40 dark:text-slate-100"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="font-semibold text-[#5b3ba4] dark:text-purple-100">
                        {coupon.code}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {coupon.discountType ?? 'discount'} • {formatMoney(coupon.amount)}
                      </span>
                    </div>
                    <div className="text-right text-[11px] text-slate-500">
                      <span>{formatPoints(Math.ceil(coupon.remainingSpend ?? 0))} to qualify</span>
                    </div>
                  </div>
                ))}
                {leadCouponsToUnlock.length > leadCouponsPreview.length && (
                  <div className="text-[11px] text-slate-500">
                    {leadCouponsToUnlock.length - leadCouponsPreview.length} more lead coupons
                    not shown.
                  </div>
                )}
              </div>
            </Card>
          )}

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="border-[#eadcff] bg-white/70 p-4 shadow-sm dark:border-purple-900/40 dark:bg-purple-950/30">
              <div className="text-xs font-semibold uppercase tracking-wide text-[#7a5bcf] dark:text-purple-200">
                Intent
              </div>
              <div className="mt-3 grid gap-3 text-sm text-slate-700 dark:text-slate-200 sm:grid-cols-2">
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-slate-500">
                    Primary
                  </div>
                  <div className="mt-1 font-medium">
                    {formatLabel(data.customer.intent?.primaryIntent ?? null)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-slate-500">
                    Mental state
                  </div>
                  <div className="mt-1 font-medium">
                    {formatLabel(data.customer.intent?.mentalState ?? null)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-slate-500">
                    Improvement
                  </div>
                  <div className="mt-1 font-medium">
                    {formatLabel(data.customer.intent?.improvementArea ?? null)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-slate-500">
                    Updated
                  </div>
                  <div className="mt-1 font-medium">
                    {formatDate(data.customer.intent?.updatedAt ?? null)}
                  </div>
                </div>
              </div>
            </Card>
            <Card className="border-[#eadcff] bg-white/70 p-4 shadow-sm dark:border-purple-900/40 dark:bg-purple-950/30">
              <div className="text-xs font-semibold uppercase tracking-wide text-[#7a5bcf] dark:text-purple-200">
                Top products
              </div>
              <div className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-200">
                {topProducts.length ? (
                  <ul className="space-y-2">
                    {topProducts.map((product) => (
                      <li
                        key={product.name}
                        className="rounded-md border border-[#f0e5ff] bg-white/80 p-2 text-xs text-slate-700 dark:border-purple-900/40 dark:bg-purple-950/40 dark:text-slate-100"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">{product.name}</span>
                          <span>
                            {product.quantity} units • {formatMoney(product.revenue)}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div>No product data found in order history.</div>
                )}
              </div>
            </Card>
            <Card className="border-[#eadcff] bg-white/70 p-4 shadow-sm dark:border-purple-900/40 dark:bg-purple-950/30">
              <div className="text-xs font-semibold uppercase tracking-wide text-[#7a5bcf] dark:text-purple-200">
                Top categories
              </div>
              <div className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-200">
                {topCategories.length ? (
                  <ul className="space-y-2">
                    {topCategories.map((category) => (
                      <li
                        key={category.name}
                        className="flex items-center justify-between rounded-md border border-[#f0e5ff] bg-white/80 p-2 text-xs text-slate-700 dark:border-purple-900/40 dark:bg-purple-950/40 dark:text-slate-100"
                      >
                        <span className="font-medium">{category.name}</span>
                        <span>
                          {category.quantity} units • {formatMoney(category.revenue)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div>No category data found in order history.</div>
                )}
              </div>
            </Card>
          </div>

          {dbOrders.length > 0 && (
            <Card className="border-[#eadcff] bg-white/70 p-4 shadow-sm dark:border-purple-900/40 dark:bg-purple-950/30">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-[#7a5bcf] dark:text-purple-200">
                  Order history
                </div>
                <div className="text-xs text-slate-500">
                  Showing {dbOrders.length} most recent orders
                </div>
              </div>
              <div className="mt-4 space-y-4">
                {dbOrders.map((order) => (
                  <div
                    key={order.id}
                    className="rounded-xl border border-[#f0e5ff] bg-white/80 p-3 text-sm text-slate-700 shadow-sm dark:border-purple-900/40 dark:bg-purple-950/40 dark:text-slate-100"
                  >
                    {(() => {
                      const categories = new Set<string>();
                      order.items.forEach((item) => {
                        (item.categories || []).forEach((cat) => categories.add(cat));
                      });
                      const categoryList = Array.from(categories.values());
                      return (
                        <>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-[#5b3ba4] dark:text-purple-100">
                        Order #{order.id}
                      </div>
                      <div className="text-xs text-slate-500">
                        {formatDate(order.createdAt)} • {formatMoney(order.total)}
                      </div>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      Status: {order.status ?? '—'} • Payment:{' '}
                      {order.paymentMethod ?? '—'} • Ship:{' '}
                      {[order.shipping.city, order.shipping.country]
                        .filter(Boolean)
                        .join(', ') || '—'}
                    </div>
                    <div className="mt-3 grid gap-3 lg:grid-cols-[2fr_1fr]">
                      <div className="space-y-2">
                        <div className="text-[11px] uppercase tracking-wide text-slate-500">
                          Items
                        </div>
                        <ul className="space-y-2">
                          {order.items.map((item, index) => (
                            <li
                              key={`${order.id}-${item.productId ?? index}`}
                              className="rounded-md border border-[#f0e5ff] bg-white/80 p-2 text-xs text-slate-700 dark:border-purple-900/40 dark:bg-purple-950/40 dark:text-slate-100"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span>
                                  {item.name ?? 'Item'} x{item.quantity}
                                </span>
                                <span>{formatMoney(item.lineTotal)}</span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="space-y-1 text-xs text-slate-600 dark:text-slate-200">
                        <div className="text-[11px] uppercase tracking-wide text-slate-500">
                          Totals
                        </div>
                        <div>Subtotal: {formatMoney(order.subtotal)}</div>
                        <div>Discount: {formatMoney(order.discountTotal)}</div>
                        <div>Shipping: {formatMoney(order.shippingTotal)}</div>
                        <div>Tax: {formatMoney(order.taxTotal)}</div>
                        <div className="font-semibold text-[#5b3ba4] dark:text-purple-100">
                          Total: {formatMoney(order.total)}
                        </div>
                      </div>
                    </div>
                    {(categoryList.length > 0 || order.coupons.length > 0) && (
                      <div className="mt-3 border-t border-[#f0e5ff] pt-3 dark:border-purple-900/40">
                        {categoryList.length > 0 && (
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] uppercase tracking-wide text-slate-500">
                              Categories
                            </span>
                            <div className="flex flex-nowrap items-center gap-1 overflow-x-auto">
                              {categoryList.map((cat) => (
                                <Badge
                                  key={`${order.id}-${cat}`}
                                  variant="outline"
                                  className="border-[#dcc7ff] bg-[#f6efff] text-[10px] text-[#5b3ba4] dark:border-purple-900/50 dark:bg-purple-900/40 dark:text-purple-100"
                                >
                                  {cat}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {order.coupons.length > 0 && (
                          <div className="mt-2 flex items-center gap-2">
                            <span className="text-[11px] uppercase tracking-wide text-slate-500">
                              Coupons
                            </span>
                            <div className="flex flex-nowrap items-center gap-1 overflow-x-auto">
                              {order.coupons.map((code) => (
                                <Badge
                                  key={`${order.id}-coupon-${code}`}
                                  variant="outline"
                                  className="border-[#dcc7ff] bg-[#f6efff] text-[10px] text-[#5b3ba4] dark:border-purple-900/50 dark:bg-purple-900/40 dark:text-purple-100"
                                >
                                  {code}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                        </>
                      );
                    })()}
                  </div>
                ))}
              </div>
            </Card>
          )}

          <QuizAnswersCard rawQuizAnswers={data.customer.rawQuizAnswers} />
        </>
      )}
    </div>
  );
}
