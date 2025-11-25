// apps/web/hooks/useAov.ts
"use client";

import type { FilterState } from "@/components/filters/filter-bar";
import { buildFilterParams } from "@/lib/api";
import type { AovPoint } from "@/types/analytics";
import { useStoreFetch } from "./useStoreFetch";

export function useAovSeries(filter: FilterState) {
  const params = new URLSearchParams(buildFilterParams(filter, "") as Record<string, string>);
  const { data, loading, error } = useStoreFetch<{ points: AovPoint[] }>({
    path: "/analytics/aov",
    searchParams: params,
  });

  return {
    points: data?.points ?? [],
    loading,
    error,
  };
}
