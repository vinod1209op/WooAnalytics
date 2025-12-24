'use client';

import { useEffect, useState } from 'react';
import { getJson } from '@/lib/api';
import { useStore } from '@/providers/store-provider';

export type CustomerOrder = {
  id: number;
  createdAt: string | null;
  status?: string | null;
  currency?: string | null;
  paymentMethod?: string | null;
  shippingCountry?: string | null;
  shippingCity?: string | null;
  total: number | null;
  subtotal?: number | null;
  discountTotal?: number | null;
  shippingTotal?: number | null;
  taxTotal?: number | null;
  coupons?: Array<{ code?: string | null; discountType?: string | null; amount?: number | null }>;
  itemCount?: number;
  items: Array<{
    productId: number | null;
    name: string | null;
    sku: string | null;
    quantity: number;
    lineTotal: number;
    categories?: string[];
  }>;
};

export type CustomerProfile = {
  customer: {
    id: number;
    wooId?: string | null;
    email: string;
    name: string | null;
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
    createdAt?: string | null;
    lastActiveAt?: string | null;
    intent?: {
      primaryIntent: string | null;
      mentalState: string | null;
      improvementArea: string | null;
      updatedAt: string | null;
    };
    rawQuizAnswers?: unknown;
  };
  insights: {
    ordersCount: number;
    repeatBuyer: boolean;
    totalSpend: number;
    avgOrderValue: number | null;
    avgDaysBetweenOrders: number | null;
    daysSinceLastOrder: number | null;
    ordersPerMonth: number | null;
    firstOrderAt: string | null;
    lastOrderAt: string | null;
  };
  products: {
    totalItems: number;
    products: Array<{
      productId: number | null;
      name: string;
      sku: string | null;
      quantity: number;
      revenue: number;
      categories: string[];
    }>;
    categories: Array<{ name: string; quantity: number; revenue: number }>;
  };
  orders: CustomerOrder[];
  ghl?: {
    contact?: {
      id: string;
      email?: string | null;
      phone?: string | null;
      firstName?: string | null;
      lastName?: string | null;
      tags?: string[];
      customFields?: Array<{ id: string; value: any }>;
    } | null;
    matchedBy?: string | null;
    error?: string;
    locationId?: string;
  } | null;
};

export function useCustomerProfile(customerId?: number) {
  const { store, loading: loadingStore, error: storeError } = useStore();
  const [data, setData] = useState<CustomerProfile | null>(null);
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
    if (!customerId || !Number.isFinite(customerId)) {
      setError('Invalid customer id');
      setData(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const params = new URLSearchParams();
    params.set('storeId', store.id);

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await getJson<CustomerProfile>(`/customers/${customerId}/profile`, params);
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
  }, [store?.id, loadingStore, storeError, customerId]);

  return { data, loading: loadingStore || loading, error: error ?? storeError ?? null };
}
