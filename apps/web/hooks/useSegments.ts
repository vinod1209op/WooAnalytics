// apps/web/hooks/useSegments.ts
'use client';

import type { FilterState } from '@/components/filters/filter-bar';
import type { SegmentPoint } from '@/types/segment';
import { buildFilterParams } from '@/lib/api';
import { useStoreFetch } from './useStoreFetch';

export function useSegments(filter: FilterState) {
  const params = new URLSearchParams(buildFilterParams(filter, '') as Record<string, string>);
  const { data, loading, error } = useStoreFetch<{ segments: SegmentPoint[] }>({
    path: '/segments',
    searchParams: params,
  });

  return {
    segments: data?.segments ?? [],
    loading,
    error,
  };
}
