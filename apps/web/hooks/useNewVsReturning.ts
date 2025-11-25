// apps/web/hooks/useNewVsReturning.ts
"use client";

import type { FilterState } from "@/components/filters/filter-bar";
import { buildFilterParams } from "@/lib/api";
import type { NewVsReturningPoint } from "@/types/analytics";
import { useStoreFetch } from "./useStoreFetch";

export function useNewVsReturning(filter: FilterState) {
  const params = new URLSearchParams(buildFilterParams(filter, "") as Record<string, string>);
  const { data, loading, error } = useStoreFetch<{ points: NewVsReturningPoint[] }>({
    path: "/analytics/new-vs-returning",
    searchParams: params,
  });

  return {
    points: data?.points ?? [],
    loading,
    error,
  };
}
