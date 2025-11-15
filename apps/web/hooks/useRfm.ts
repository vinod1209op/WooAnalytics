// apps/web/hooks/useRfm.ts
'use client';

import { useEffect, useState } from 'react';
import type { FilterState } from '@/components/filters/filter-bar';
import { getJson, buildFilterParams } from '@/lib/api';
import { RfmBucket } from '@/types/rfm';

export function useRfm(filter: FilterState) {
  const [rfm, setRfm] = useState<RfmBucket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await getJson<{ rfm: RfmBucket[] }>(
          '/rfm',
          buildFilterParams(filter),
        );
        if (!cancelled) {
          setLoading(true);
          setError(null);
          setRfm(data.rfm ?? []);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load RFM', err);
          const message = err instanceof Error ? err.message: 'Failed to load RFM';
          setError(message);
          setRfm([]);
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [JSON.stringify(buildFilterParams(filter))]);

  return { rfm, loading, error };
}