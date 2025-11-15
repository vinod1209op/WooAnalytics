// apps/web/hooks/useSegments.ts
'use client';

import { useEffect, useState } from 'react';
import type { FilterState } from '@/components/filters/filter-bar';
import { getJson, buildFilterParams } from '@/lib/api';

export interface SegmentSummary {
  key: string;   // e.g. "Champions"
  count: number;
}

export function useSegments(filter: FilterState) {
  const [segments, setSegments] = useState<SegmentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        if(!cancelled){
          setLoading(true);
          setError(null);
        }
        const data = await getJson<{ segments: SegmentSummary[] }>(
          '/segments',
          buildFilterParams(filter),
        );

        if (!cancelled) {
          setSegments(data.segments ?? []);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load segments', err);
          const message = err instanceof Error ? err.message: 'Failed to load segments';
          setError(message);
          setSegments([]);
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [JSON.stringify(buildFilterParams(filter))]);

  return { segments, loading, error };
}