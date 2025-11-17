// apps/web/hooks/useSegments.ts
'use client';

import { useEffect, useState } from 'react';
import type { FilterState } from '@/components/filters/filter-bar';
import { getJson, buildFilterParams } from '@/lib/api';
import { useStore } from '@/providers/store-provider';
import type { SegmentPoint } from '@/types/segment';

export function useSegments(filter: FilterState) {
  const { store, loading: loadingStore, error: storeError } = useStore();

  const [segments, setSegments] = useState<SegmentPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // wait until store is loaded
    if (loadingStore) return;

    if (!store?.id) {
      setError(storeError || 'No store configured');
      setSegments([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        // Build query params: storeId + date/category/coupon type
        const q = buildFilterParams(filter, store.id);
        const params = new URLSearchParams(q as Record<string, string>);

        const data = await getJson<{ segments: SegmentPoint[] }>(
          '/segments',
          params,
        );

        if (cancelled) return;
        setSegments(data?.segments ?? []);
      } catch (err) {
        if (cancelled) return;
        console.error('Failed to load segments', err);
        const message =
          err instanceof Error
            ? err.message
            : typeof err === 'string'
            ? err
            : 'Failed to load segments';
        setError(message);
        setSegments([]);
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
    storeError,
    filter.type,
    filter.date?.from,
    filter.date?.to,
    filter.category,
    filter.coupon,
    filter,
  ]);

  return {
    segments,
    loading: loadingStore || loading,
    error: error ?? storeError ?? null,
  };
}
