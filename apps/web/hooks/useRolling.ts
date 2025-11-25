// apps/web/hooks/useRolling.ts
"use client";

import type { FilterState } from "@/components/filters/filter-bar";
import { buildFilterParams } from "@/lib/api";
import type { RollingPoint } from "@/types/analytics";
import { useStoreFetch } from "./useStoreFetch";

export function useRollingSeries(filter: FilterState) {
  const params = new URLSearchParams(buildFilterParams(filter, "") as Record<string, string>);
  const { data, loading, error } = useStoreFetch<{ points: RollingPoint[] }>({
    path: "/analytics/rolling",
    searchParams: params,
  });

  return {
    points: data?.points ?? [],
    loading,
    error,
  };
}
