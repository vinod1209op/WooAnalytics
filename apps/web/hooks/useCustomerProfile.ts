'use client';

import { useEffect, useState } from 'react';
import { getJson } from '@/lib/api';
import { useStore } from '@/providers/store-provider';
import type { RawQuizAnswers } from '@/components/admin/customer-profile/quiz-answers-card';

export type CustomerProfile = {
  customer: {
    id: string;
    email: string | null;
    name: string | null;
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
    address?: string | null;
    dateAdded?: string | null;
    dateUpdated?: string | null;
    tags?: string[];
    intent?: {
      primaryIntent: string | null;
      mentalState: string | null;
      improvementArea: string | null;
      updatedAt: string | null;
    };
    rawQuizAnswers?: RawQuizAnswers | null;
  };
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
  leadCoupons?: Array<{
    code: string;
    discountType: string | null;
    amount: number;
    minimumSpend: number | null;
    maximumSpend: number | null;
    remainingSpend: number | null;
    eligible: boolean;
  }>;
  productsOrdered?: string[];
  topProducts?: Array<{
    name: string;
    quantity: number;
    revenue: number | null;
    categories: string[];
  }>;
  topCategories?: Array<{
    name: string;
    quantity: number;
    revenue: number | null;
  }>;
  customFields?: Array<{ id: string; name?: string; fieldKey?: string; value: unknown }>;
  db?: null | {
    customer: {
      id: number;
      wooId: string | null;
      createdAt: string | null;
      lastActiveAt: string | null;
    };
    stats: null | {
      ordersCount: number;
      totalSpend: number;
      avgOrderValue: number | null;
      firstOrderAt: string | null;
      lastOrderAt: string | null;
      avgDaysBetweenOrders: number | null;
      daysSinceLastOrder: number | null;
    };
    orders: Array<{
      id: number;
      createdAt: string | null;
      status: string | null;
      currency: string | null;
      total: number | null;
      subtotal: number | null;
      discountTotal: number | null;
      shippingTotal: number | null;
      taxTotal: number | null;
      paymentMethod: string | null;
      shipping: { city: string | null; country: string | null };
      coupons: string[];
      items: Array<{
        productId: number | null;
        name: string | null;
        sku: string | null;
        quantity: number;
        lineTotal: number | null;
        categories: string[];
      }>;
    }>;
    topProducts: Array<{
      name: string;
      quantity: number;
      revenue: number;
      categories: string[];
    }>;
    topCategories: Array<{
      name: string;
      quantity: number;
      revenue: number;
    }>;
    coupons: string[];
  };
};

export function useCustomerProfile(contactId?: string) {
  const { store, loading: loadingStore, error: storeError } = useStore();
  const [data, setData] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loadingStore) return;
    if (!contactId) {
      setError('Invalid customer id');
      setData(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const params = new URLSearchParams();
    if (store?.id) params.set('storeId', store.id);

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await getJson<CustomerProfile>(`/customers/${contactId}/profile`, params);
        if (cancelled) return;
        setData(res);
      } catch (err) {
        if (cancelled) return;
        console.error('useCustomerProfile error:', err);
        const msg =
          err instanceof Error
            ? err.message
            : typeof err === 'string'
            ? err
            : 'Failed to load customer profile';
        setError(msg);
        setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [store?.id, loadingStore, contactId]);

  return { data, loading: loadingStore || loading, error: error ?? storeError ?? null };
}
