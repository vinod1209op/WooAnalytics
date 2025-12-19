'use client';

import { useEffect, useState } from 'react';
import { getJson } from '@/lib/api';
import { useStore } from '@/providers/store-provider';

export type IdleCustomer = {
  customerId: number;
  email: string;
  name: string | null;
  phone: string | null;
  ordersCount: number;
  lastActiveAt: string | null;
  lastOrderAt: string | null;
  lastOrderTotal: number | null;
  lastOrderDiscount: number | null;
  lastOrderShipping: number | null;
  lastOrderTax: number | null;
  lastOrderCoupons: string[];
  lastItems: {
    productId: number | null;
    name: string | null;
    sku: string | null;
    quantity: number;
    lineTotal: number;
    categories?: string[];
  }[];
  topCategory: string | null;
};

type InactiveResponse = {
  storeId: string;
  days: number;
  cutoff: string;
  count: number;
  nextCursor: number | null;
  data: IdleCustomer[];
};

export function useInactiveCustomers({
  days,
  limit,
  cursor,
}: {
  days: number;
  limit: number;
  cursor: number;
}) {
  const { store, loading: loadingStore, error: storeError } = useStore();
  const [data, setData] = useState<InactiveResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loadingStore) return;
    if (!store?.id) {
      setError(storeError || 'No store configured');
      setData(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const params = new URLSearchParams();
    params.set('storeId', store.id);
    params.set('days', String(days));
    params.set('limit', String(limit));
    params.set('cursor', String(cursor));

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await getJson<InactiveResponse>('/customers/inactive', params);
        if (cancelled) return;
        setData(res);
      } catch (err) {
        if (cancelled) return;
        console.error('useInactiveCustomers error:', err);
        const msg =
          err instanceof Error
            ? err.message
            : typeof err === 'string'
            ? err
            : 'Failed to load inactive customers';
        setError(msg);
        setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [store?.id, loadingStore, storeError, days, limit, cursor]);

  return { data, loading: loadingStore || loading, error: error ?? storeError ?? null };
}
