// apps/web/hooks/useCumulative.ts
"use client";

import type { FilterState } from "@/components/filters/filter-bar";
import { buildFilterParams } from "@/lib/api";
import type { CumulativePoint } from "@/types/analytics";
import { useStoreFetch } from "./useStoreFetch";

export function useCumulativeSeries(filter: FilterState) {
  const params = new URLSearchParams(buildFilterParams(filter, "") as Record<string, string>);
  const { data, loading, error } = useStoreFetch<{ points: CumulativePoint[] }>({
    path: "/analytics/cumulative",
    searchParams: params,
  });

  return {
    points: data?.points ?? [],
    loading,
    error,
  };
}
