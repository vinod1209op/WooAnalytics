'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useCustomerProfile } from '@/hooks/useCustomerProfile';

function formatDate(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(+d)) return value;
  return d.toLocaleDateString();
}

function formatMoney(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '—';
  return `$${value.toFixed(2)}`;
}

function formatLabel(value?: string | null) {
  if (!value) return '—';
  return value.replace(/_/g, ' ');
}

function nameFromEmail(email?: string | null) {
  if (!email) return 'Unknown';
  const handle = email.split('@')[0] || '';
  if (!handle) return 'Unknown';
  return handle
    .replace(/[._-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatPhone(value?: string | null) {
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

function stripQuestionNumber(label: string) {
  const cleaned = label.replace(/^\s*\d+\s*[).:-]\s*/g, '').trim();
  return cleaned || label.trim() || 'Question';
}

function isNonQuestionField(label?: string | null, fieldKey?: string | null) {
  const hay = `${label ?? ''} ${fieldKey ?? ''}`.toLowerCase();
  if (!hay.trim()) return false;
  if (hay.includes('total spend')) return true;
  if (hay.includes('ltv') || hay.includes('lifetime value')) return true;
  const orderTokens = ['order', 'orders'];
  const metricTokens = ['total', 'count', 'date', 'value', 'subscription', 'spend'];
  if (orderTokens.some((token) => hay.includes(token)) && metricTokens.some((token) => hay.includes(token))) {
    return true;
  }
  return false;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function formatQuizKey(key: string) {
  if (!key) return 'Value';
  const spaced = key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function renderQuizValue(value: unknown) {
  if (value == null || value === '') {
    return <span className="text-slate-400">—</span>;
  }
  if (Array.isArray(value)) {
    return (
      <ul className="space-y-1">
        {value.map((item, index) => (
          <li key={`${index}-${String(item)}`} className="flex gap-2">
            <span className="text-slate-400">•</span>
            <span className="break-words">{String(item)}</span>
          </li>
        ))}
      </ul>
    );
  }
  if (isRecord(value)) {
    return (
      <pre className="whitespace-pre-wrap text-xs text-slate-500">
        {JSON.stringify(value, null, 2)}
      </pre>
    );
  }
  return <span className="whitespace-pre-wrap break-words">{String(value)}</span>;
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number | null | undefined;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-[#eadcff] bg-gradient-to-br from-white via-white to-[#f6efff] p-3 shadow-sm dark:border-purple-900/40 dark:bg-purple-950/30">
      <div className="text-xs font-semibold uppercase tracking-wide text-[#7a5bcf] dark:text-purple-200">
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold text-[#5b3ba4] dark:text-purple-100">
        {value ?? '—'}
      </div>
      {hint && <div className="text-xs text-slate-500">{hint}</div>}
    </div>
  );
}

export default function CustomerProfilePage() {
  const params = useParams<{ id: string }>();
  const customerId = Number(params?.id);
  const { data, loading, error } = useCustomerProfile(customerId);

  const ghlContact = data?.ghl?.contact ?? null;
  const ghlTags = ghlContact?.tags ?? [];

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
              Deep order history + GHL context for a single customer.
            </p>
          </div>
          <Button
            asChild
            variant="outline"
            className="rounded-xl border-[#d9c7f5] text-[#5b3ba4] hover:bg-[#f0e5ff] dark:border-purple-900/50 dark:text-purple-100 dark:hover:bg-purple-900/60"
          >
            <Link href="/admin/idle">Back to idle customers</Link>
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
            <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
              <div className="space-y-3">
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
                  <Badge
                    variant="outline"
                    className="border-[#dcc7ff] bg-white/60 text-[#5b3ba4] dark:border-purple-900/60 dark:bg-purple-900/40 dark:text-purple-100"
                  >
                    ID {data.customer.id}
                  </Badge>
                  {data.customer.wooId && (
                    <Badge
                      variant="outline"
                      className="border-[#dcc7ff] bg-white/60 text-[#5b3ba4] dark:border-purple-900/60 dark:bg-purple-900/40 dark:text-purple-100"
                    >
                      Woo {data.customer.wooId}
                    </Badge>
                  )}
                  {ghlContact?.id && (
                    <Badge
                      variant="outline"
                      className="border-[#dcc7ff] bg-white/60 text-[#5b3ba4] dark:border-purple-900/60 dark:bg-purple-900/40 dark:text-purple-100"
                    >
                      GHL {ghlContact.id}
                    </Badge>
                  )}
                  {data.insights.repeatBuyer && (
                    <Badge className="bg-[#f0e5ff] text-[#5b3ba4] dark:bg-purple-900/60 dark:text-purple-50">
                      Repeat buyer
                    </Badge>
                  )}
                </div>
              </div>
              <div className="rounded-xl border border-[#eadcff] bg-white/70 p-3 text-sm text-slate-600 shadow-sm dark:border-purple-900/40 dark:bg-purple-950/40 dark:text-slate-200">
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
                      {formatDate(data.customer.createdAt)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-wide text-slate-500">
                      Last active
                    </div>
                    <div className="mt-1 text-sm text-slate-700 dark:text-slate-100">
                      {formatDate(data.customer.lastActiveAt)}
                    </div>
                  </div>
                </div>
              </div>
              {ghlTags.length > 0 && (
                <div className="lg:col-span-2">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Tags
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {ghlTags.map((tag) => (
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

          <div className="space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#7a5bcf] dark:text-purple-200">
              Customer insights
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Orders" value={data.insights.ordersCount} />
              <StatCard label="Total spend" value={formatMoney(data.insights.totalSpend)} />
              <StatCard label="Avg order" value={formatMoney(data.insights.avgOrderValue)} />
              <StatCard
                label="Orders / month"
                value={data.insights.ordersPerMonth ?? '—'}
                hint="Based on first → last order"
              />
              <StatCard
                label="Avg days between"
                value={data.insights.avgDaysBetweenOrders ?? '—'}
              />
              <StatCard
                label="Days since last"
                value={data.insights.daysSinceLastOrder ?? '—'}
              />
              <StatCard label="First order" value={formatDate(data.insights.firstOrderAt)} />
              <StatCard label="Last order" value={formatDate(data.insights.lastOrderAt)} />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="border-[#eadcff] bg-white/70 p-4 shadow-sm dark:border-purple-900/40 dark:bg-purple-950/30">
              <div className="text-xs font-semibold uppercase tracking-wide text-[#7a5bcf] dark:text-purple-200">
                Intent
              </div>
              <div className="mt-3 grid gap-2 text-sm text-slate-700 dark:text-slate-200 sm:grid-cols-2">
                <div>Primary: {formatLabel(data.customer.intent?.primaryIntent ?? null)}</div>
                <div>Mental state: {formatLabel(data.customer.intent?.mentalState ?? null)}</div>
                <div>Improvement: {formatLabel(data.customer.intent?.improvementArea ?? null)}</div>
                <div>Updated: {formatDate(data.customer.intent?.updatedAt ?? null)}</div>
              </div>
            </Card>
            <Card className="border-[#eadcff] bg-white/70 p-4 shadow-sm dark:border-purple-900/40 dark:bg-purple-950/30">
              <div className="text-xs font-semibold uppercase tracking-wide text-[#7a5bcf] dark:text-purple-200">
                Top products
              </div>
              <div className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-200">
                {data.products.products.length ? (
                  data.products.products.slice(0, 10).map((product) => (
                    <div
                      key={`${product.productId ?? product.name}`}
                      className="flex flex-wrap items-center justify-between gap-2"
                    >
                      <span className="font-medium">
                        {product.name} {product.sku ? `(${product.sku})` : ''}
                      </span>
                      <span className="text-xs text-slate-500">
                        {product.quantity} units • {formatMoney(product.revenue)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div>No product history yet.</div>
                )}
                {data.products.products.length > 10 && (
                  <div className="text-xs text-slate-500">
                    Showing top 10 of {data.products.products.length} products.
                  </div>
                )}
              </div>
            </Card>
            <Card className="border-[#eadcff] bg-white/70 p-4 shadow-sm dark:border-purple-900/40 dark:bg-purple-950/30">
              <div className="text-xs font-semibold uppercase tracking-wide text-[#7a5bcf] dark:text-purple-200">
                Top categories
              </div>
              <div className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-200">
                {data.products.categories.length ? (
                  data.products.categories.slice(0, 10).map((category) => (
                    <div
                      key={category.name}
                      className="flex flex-wrap items-center justify-between gap-2"
                    >
                      <span className="font-medium">{category.name}</span>
                      <span className="text-xs text-slate-500">
                        {category.quantity} units • {formatMoney(category.revenue)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div>No category history yet.</div>
                )}
                {data.products.categories.length > 10 && (
                  <div className="text-xs text-slate-500">
                    Showing top 10 of {data.products.categories.length} categories.
                  </div>
                )}
              </div>
            </Card>
          </div>

          <Card className="border-[#eadcff] bg-white/70 p-4 shadow-sm dark:border-purple-900/40 dark:bg-purple-950/30">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-[#7a5bcf] dark:text-purple-200">
                  Orders
                </div>
                <div className="text-sm text-slate-500">
                  {data.orders.length} orders • {data.products.totalItems} items
                </div>
              </div>
              <div className="text-xs text-slate-500">
                Last interaction: {formatDate(data.insights.lastOrderAt)}
              </div>
            </div>

            <div className="mt-4 space-y-4">
              {data.orders.length ? (
                data.orders.map((order) => (
                  <div
                    key={order.id}
                    className="rounded-xl border border-[#eadcff] bg-white/80 p-3 shadow-sm dark:border-purple-900/40 dark:bg-purple-950/40"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#f0e5ff] pb-2 dark:border-purple-900/40">
                      <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                        Order #{order.id}
                      </div>
                      <div className="text-xs text-slate-500">
                        {formatDate(order.createdAt)} • {formatMoney(order.total)}
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                      {order.status && <span>Status: {order.status}</span>}
                      {order.paymentMethod && <span>Payment: {order.paymentMethod}</span>}
                      {(order.shippingCity || order.shippingCountry) && (
                        <span>
                          Ship: {order.shippingCity ?? '—'}
                          {order.shippingCountry ? `, ${order.shippingCountry}` : ''}
                        </span>
                      )}
                      {order.coupons?.length ? (
                        <span>Coupons: {order.coupons.map((c) => c.code).filter(Boolean).join(', ')}</span>
                      ) : null}
                    </div>

                    <div className="mt-3 grid gap-3 lg:grid-cols-2">
                      <div className="space-y-2">
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Items
                        </div>
                        {order.items.length ? (
                          <ul className="space-y-2">
                            {order.items.map((item, index) => (
                              <li
                                key={`${order.id}-${item.productId ?? 'item'}-${index}`}
                                className="rounded-md border border-[#f0e5ff] bg-white/80 p-2 text-xs text-slate-700 dark:border-purple-900/40 dark:bg-purple-950/40 dark:text-slate-100"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span className="min-w-0 flex-1 font-medium">
                                    {item.name ?? 'Item'} x{item.quantity}
                                  </span>
                                  <span className="text-slate-500 dark:text-slate-300">
                                    {formatMoney(item.lineTotal)}
                                  </span>
                                </div>
                                {(item.sku || item.categories?.length) && (
                                  <div className="mt-1 break-words text-[11px] text-slate-500 dark:text-slate-300">
                                    {item.sku && <span>SKU {item.sku}</span>}
                                    {item.sku && item.categories?.length && (
                                      <span className="px-1">•</span>
                                    )}
                                    {item.categories?.length ? (
                                      <span>{item.categories.join(', ')}</span>
                                    ) : null}
                                  </div>
                                )}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div className="text-xs text-slate-500">No items listed.</div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Totals
                        </div>
                        <div className="space-y-1 text-sm text-slate-700 dark:text-slate-200">
                          <div>Subtotal: {formatMoney(order.subtotal)}</div>
                          <div>Discount: {formatMoney(order.discountTotal)}</div>
                          <div>Shipping: {formatMoney(order.shippingTotal)}</div>
                          <div>Tax: {formatMoney(order.taxTotal)}</div>
                          <div className="font-medium text-[#5b3ba4] dark:text-purple-100">
                            Total: {formatMoney(order.total)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-slate-500">No orders found.</div>
              )}
            </div>
          </Card>

          <Card className="border-[#eadcff] bg-white/70 p-4 shadow-sm dark:border-purple-900/40 dark:bg-purple-950/30">
            {data.customer.rawQuizAnswers ? (
              (() => {
                const quiz = data.customer.rawQuizAnswers as {
                  raw?: Record<string, unknown>;
                  rawFields?: Array<{
                    id?: string;
                    name?: string | null;
                    fieldKey?: string | null;
                    value?: unknown;
                  }>;
                  messaging?: Record<string, unknown>;
                  derived?: Record<string, unknown>;
                };
                const quizFields = Array.isArray(quiz?.rawFields) ? quiz.rawFields : [];
                const quizRaw = isRecord(quiz?.raw) ? quiz.raw : {};
                const quizMessaging = isRecord(quiz?.messaging) ? quiz.messaging : null;
                const quizDerived = isRecord(quiz?.derived) ? quiz.derived : null;
                const entries = quizFields.length
                  ? quizFields
                      .map((field) => {
                        const rawLabel = field.name || field.fieldKey || field.id || 'Question';
                        return {
                          id: field.id,
                          rawLabel,
                          fieldKey: field.fieldKey,
                          label: stripQuestionNumber(rawLabel),
                          value: field.value,
                        };
                      })
                      .filter((entry) => !isNonQuestionField(entry.rawLabel, entry.fieldKey))
                  : Object.entries(quizRaw)
                      .map(([key, value]) => ({
                        id: key,
                        rawLabel: key,
                        fieldKey: null,
                        label: stripQuestionNumber(key),
                        value,
                      }))
                      .filter((entry) => !isNonQuestionField(entry.rawLabel, entry.fieldKey));

                return (
                  <details className="group">
                    <summary className="cursor-pointer list-none">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-transparent pb-2 group-open:border-[#f0e5ff] dark:group-open:border-purple-900/40">
                        <div className="text-xs font-semibold uppercase tracking-wide text-[#7a5bcf] dark:text-purple-200">
                          Questions answered
                        </div>
                        <span className="text-[11px] uppercase tracking-wide text-slate-400 group-open:text-slate-500">
                          Toggle
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <Badge
                          variant="outline"
                          className="border-[#dcc7ff] bg-white/60 text-[#5b3ba4] dark:border-purple-900/60 dark:bg-purple-900/40 dark:text-purple-100"
                        >
                          Responses {entries.length}
                        </Badge>
                        {quizMessaging && (
                          <Badge
                            variant="outline"
                            className="border-[#dcc7ff] bg-white/60 text-[#5b3ba4] dark:border-purple-900/60 dark:bg-purple-900/40 dark:text-purple-100"
                          >
                            Messaging {Object.keys(quizMessaging).length}
                          </Badge>
                        )}
                        {quizDerived && (
                          <Badge
                            variant="outline"
                            className="border-[#dcc7ff] bg-white/60 text-[#5b3ba4] dark:border-purple-900/60 dark:bg-purple-900/40 dark:text-purple-100"
                          >
                            Derived {Object.keys(quizDerived).length}
                          </Badge>
                        )}
                      </div>
                    </summary>

                    {entries.length > 0 ? (
                      <div className="mt-4 grid gap-3 lg:grid-cols-2">
                        {entries.map((entry, index) => (
                          <details
                            key={`${entry.id ?? entry.label}-${index}`}
                            className="group rounded-lg border border-[#f0e5ff] bg-white/80 p-3 text-sm text-slate-700 shadow-sm transition hover:border-[#d4bfff] dark:border-purple-900/40 dark:bg-purple-950/40 dark:text-slate-100"
                          >
                            <summary className="cursor-pointer list-none">
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div className="flex items-start gap-3">
                                  <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full border border-[#dcc7ff] bg-white text-xs font-semibold text-[#5b3ba4] shadow-sm dark:border-purple-900/60 dark:bg-purple-900/40 dark:text-purple-100">
                                    {index + 1}
                                  </span>
                                  <div>
                                    <div className="text-[11px] uppercase tracking-wide text-slate-500">
                                      Question {index + 1}
                                    </div>
                                    <div className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-100">
                                      {entry.label}
                                    </div>
                                  </div>
                                </div>
                                {entry.id && (
                                  <span className="text-[11px] uppercase tracking-wide text-slate-400">
                                    ID {entry.id}
                                  </span>
                                )}
                              </div>
                            </summary>
                            <div className="mt-3 border-t border-[#f0e5ff] pt-3 text-sm text-slate-600 dark:border-purple-900/40 dark:text-slate-200">
                              <div className="text-[11px] uppercase tracking-wide text-slate-500">
                                Answer
                              </div>
                              <div className="mt-2">{renderQuizValue(entry.value)}</div>
                            </div>
                          </details>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-3 text-sm text-slate-500">No quiz answers found.</div>
                    )}

                    {(quizMessaging || quizDerived) && (
                      <div className="mt-4 grid gap-3 lg:grid-cols-2">
                        {quizMessaging && (
                          <div className="rounded-lg border border-[#f0e5ff] bg-white/80 p-3 text-sm text-slate-700 shadow-sm dark:border-purple-900/40 dark:bg-purple-950/40 dark:text-slate-100">
                            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Messaging cues
                            </div>
                            <div className="mt-2 space-y-2">
                              {Object.entries(quizMessaging)
                                .filter(([key]) => key !== 'resultFields')
                                .map(([key, value]) => (
                                  <div key={key}>
                                    <div className="text-[11px] uppercase tracking-wide text-slate-500">
                                      {formatQuizKey(key)}
                                    </div>
                                    <div className="mt-1 text-sm text-slate-600 dark:text-slate-200">
                                      {renderQuizValue(value)}
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}
                        {quizDerived && (
                          <div className="rounded-lg border border-[#f0e5ff] bg-white/80 p-3 text-sm text-slate-700 shadow-sm dark:border-purple-900/40 dark:bg-purple-950/40 dark:text-slate-100">
                            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Derived insights
                            </div>
                            <div className="mt-2 space-y-2">
                              {Object.entries(quizDerived).map(([key, value]) => (
                                <div key={key}>
                                  <div className="text-[11px] uppercase tracking-wide text-slate-500">
                                    {formatQuizKey(key)}
                                  </div>
                                  <div className="mt-1 text-sm text-slate-600 dark:text-slate-200">
                                    {renderQuizValue(value)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </details>
                );
              })()
            ) : (
              <div className="mt-3 text-sm text-slate-500">No quiz answers found.</div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
