// apps/web/hooks/useSalesSeries.ts
'use client';

import { useEffect, useState } from 'react';
import type { FilterState } from '@/components/filters/filter-bar';
import type { SalesPoint } from '@/types/sales';
import { getJson, buildFilterParams } from '@/lib/api';

export function useSalesSeries(filter: FilterState) {
  const [sales, setSales] = useState<SalesPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await getJson<{ sales: SalesPoint[] }>(
          '/sales',
          buildFilterParams(filter),
        );

        if (!cancelled) {
          setLoading(true);
          setError(null);
          setSales(data.sales ?? []);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load sales series', err);
          const message =
            err instanceof Error ? err.message : 'Failed to load sales series';
          setError(message);
          setSales([]);
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // stringify params so hook re-runs when filter changes, without eslint nagging
  }, [JSON.stringify(buildFilterParams(filter))]);

  return { sales, loading, error };
}