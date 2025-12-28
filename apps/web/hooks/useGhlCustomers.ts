'use client';

import { useEffect, useState } from 'react';
import { getJson } from '@/lib/api';
import { useStore } from '@/providers/store-provider';

export type GhlCustomer = {
  contactId: string;
  email: string | null;
  name: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone: string | null;
  address?: string | null;
  dateAdded: string | null;
  dateUpdated: string | null;
  tags: string[];
  db?: {
    customerId: number;
    wooId: string | null;
    createdAt: string | null;
    lastActiveAt: string | null;
    ordersCount: number | null;
    totalSpend: number | null;
    firstOrderAt: string | null;
    lastOrderAt: string | null;
  } | null;
  metrics?: {
    totalOrdersCount?: number | null;
    totalSpend?: number | null;
    lastOrderDate?: string | null;
    lastOrderValue?: number | null;
    firstOrderDate?: string | null;
    firstOrderValue?: number | null;
    orderSubscription?: string | null;
  };
  loyalty?: {
    pointsBalance: number | null;
    pointsLifetime: number | null;
    pointsToNext: number | null;
    nextRewardAt: number | null;
    lastRewardAt: number | null;
    tier: string | null;
  };
  productsOrdered?: string[];
  productCategories?: string[];
  intent?: {
    primaryIntent?: string | null;
    mentalState?: string | null;
    improvementArea?: string | null;
  };
};

type GhlCustomersResponse = {
  locationId: string;
  tag: string;
  page: number;
  limit: number;
  count: number;
  total: number;
  nextPage: number | null;
  categories?: string[];
  data: GhlCustomer[];
};

export function useGhlCustomers({
  tag,
  page,
  limit,
  query,
  minOrders,
  minSpend,
  joinedDays,
  activeDays,
  intent,
  improvement,
  category,
}: {
  tag: string;
  page: number;
  limit: number;
  query?: string;
  minOrders?: number | null;
  minSpend?: number | null;
  joinedDays?: number | null;
  activeDays?: number | null;
  intent?: string | null;
  improvement?: string | null;
  category?: string | null;
}) {
  const { store, loading: loadingStore, error: storeError } = useStore();
  const [data, setData] = useState<GhlCustomersResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loadingStore) return;

    let cancelled = false;
    const params = new URLSearchParams();
    if (store?.id) params.set('storeId', store.id);
    params.set('tag', tag);
    params.set('page', String(page));
    params.set('limit', String(limit));
    if (query) params.set('query', query);
    if (minOrders != null) params.set('minOrders', String(minOrders));
    if (minSpend != null) params.set('minSpend', String(minSpend));
    if (joinedDays != null) params.set('joinedAfterDays', String(joinedDays));
    if (activeDays != null) params.set('activeAfterDays', String(activeDays));
    if (intent) params.set('intent', intent);
    if (improvement) params.set('improvement', improvement);
    if (category) params.set('category', category);

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await getJson<GhlCustomersResponse>('/customers/ghl', params);
        if (cancelled) return;
        setData(res);
      } catch (err) {
        if (cancelled) return;
        console.error('useGhlCustomers error:', err);
        const msg =
          err instanceof Error
            ? err.message
            : typeof err === 'string'
            ? err
            : 'Failed to load GHL customers';
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
    store?.id,
    loadingStore,
    tag,
    page,
    limit,
    query,
    minOrders,
    minSpend,
    joinedDays,
    activeDays,
    intent,
    improvement,
    category,
  ]);

  return { data, loading: loadingStore || loading, error: error ?? storeError ?? null };
}
