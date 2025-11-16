'use client';

import { useEffect, useState } from 'react';
import type { FilterState } from '@/components/filters/filter-bar';
import { getJson, buildFilterParams } from '@/lib/api';
import { useStore } from '@/providers/store-provider';

export interface Kpis {
  revenue: number;
  orders: number;
  aov: number;
  units: number;
  customers: number;
}

export function useKpis(filter: FilterState) {
  const { store, loading: loadingStore, error: storeError } = useStore();

  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Create a stable dependency instead of JSON.stringify
  const filterKey =
    `${filter.type}|${filter.date?.from?.toISOString() ?? ''}|${filter.date?.to?.toISOString() ?? ''}|${filter.category ?? ''}|${filter.coupon ?? ''}`;

  useEffect(() => {
    if (loadingStore) return;

    if (!store?.id) {
      setError(storeError || 'No store configured');
      setKpis(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const q = buildFilterParams(filter, store.id);
        const params = new URLSearchParams(q as Record<string, string>);

        const response = await getJson<Kpis>('/kpis', params);
        if (cancelled) return;

        setKpis(response);
      } catch (e) {
        if (cancelled) return;

        console.error('useKpis failed:', e);

        // safe error message extraction
        const msg =
          e instanceof Error
            ? e.message
            : typeof e === 'string'
            ? e
            : 'Failed to load KPIs';

        setError(msg);
        setKpis(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [store?.id, loadingStore, storeError, filter, filterKey]);

  return {
    kpis,
    loading: loadingStore || loading,
    error: error ?? storeError ?? null,
  };
}