'use client';

import { useEffect, useState } from 'react';
import { getJson } from '@/lib/api';

export type GhlIdleCustomer = {
  contactId: string;
  email: string | null;
  name: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone: string | null;
  dateAdded: string | null;
  dateUpdated: string | null;
  tags: string[];
  metrics: {
    totalOrdersCount: number | null;
    totalSpend: number | null;
    lastOrderDate: string | null;
    lastOrderValue: number | null;
    firstOrderDate: string | null;
    firstOrderValue: number | null;
    orderSubscription: string | null;
    daysSinceLastOrder: number | null;
    avgDaysBetweenOrders: number | null;
  };
  loyalty?: {
    pointsBalance: number | null;
    pointsLifetime: number | null;
    pointsToNext: number | null;
    nextRewardAt: number | null;
    lastRewardAt: number | null;
    tier: string | null;
  };
  segment: string | null;
  churnRisk: number | null;
  topCategory: string | null;
  productCategories: string[];
  productsOrdered: string[];
  leadCouponUsed?: boolean;
  leadCouponRemainingSpend?: number | null;
  intent: {
    primaryIntent: string | null;
    mentalState: string | null;
    improvementArea: string | null;
    updatedAt: string | null;
    source: string | null;
  };
  db: null | {
    customerId: number;
    wooId: string | null;
    createdAt: string | null;
    lastActiveAt: string | null;
    ordersCount: number | null;
    totalSpend: number | null;
    firstOrderAt: string | null;
    lastOrderAt: string | null;
  };
};

export type GhlIdleResponse = {
  locationId: string;
  tag: string;
  days: number;
  cutoff: string;
  page: number;
  limit: number;
  count: number;
  totalCount: number;
  segmentSummary: Record<string, { count: number; ltv: number; daysSum: number; daysCount: number }>;
  categories: string[];
  data: GhlIdleCustomer[];
};

export function useGhlIdleCustomers({
  tag,
  days,
  page,
  limit,
  segment,
  intent,
  improvement,
  category,
  minOrders,
  minSpend,
  query,
  storeId,
  leadCouponUsed,
}: {
  tag: string;
  days: number;
  page: number;
  limit: number;
  segment?: string | null;
  intent?: string | null;
  improvement?: string | null;
  category?: string | null;
  minOrders?: number | null;
  minSpend?: number | null;
  query?: string;
  storeId?: string;
  leadCouponUsed?: boolean;
}) {
  const [data, setData] = useState<GhlIdleResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams();
    params.set('tag', tag);
    params.set('days', String(days));
    params.set('page', String(page));
    params.set('limit', String(limit));
    if (storeId) params.set('storeId', storeId);
    if (segment) params.set('segment', segment);
    if (intent) params.set('intent', intent);
    if (improvement) params.set('improvement', improvement);
    if (category) params.set('category', category);
    if (minOrders != null) params.set('minOrders', String(minOrders));
    if (minSpend != null) params.set('minSpend', String(minSpend));
    if (query) params.set('query', query);
    if (leadCouponUsed) params.set('leadCouponUsed', '1');

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await getJson<GhlIdleResponse>('/customers/ghl-idle', params);
        if (cancelled) return;
        setData(res);
      } catch (err) {
        if (cancelled) return;
        console.error('useGhlIdleCustomers error:', err);
        const msg =
          err instanceof Error
            ? err.message
            : typeof err === 'string'
            ? err
            : 'Failed to load idle customers';
        setError(msg);
        setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    tag,
    days,
    page,
    limit,
    segment,
    intent,
    improvement,
    category,
    minOrders,
    minSpend,
    query,
    storeId,
    leadCouponUsed,
  ]);

  return { data, loading, error };
}
