// apps/web/hooks/useTopProductsPerformance.ts
"use client";

import type { FilterState } from "@/components/filters/filter-bar";
import { buildFilterParams } from "@/lib/api";
import type { ProductPerformance } from "@/types/analytics";
import { useStoreFetch } from "./useStoreFetch";

export function useTopProductsPerformance(filter: FilterState) {
  const params = new URLSearchParams(buildFilterParams(filter, "") as Record<string, string>);
  const { data, loading, error } = useStoreFetch<{ products: ProductPerformance[] }>({
    path: "/analytics/products/top",
    searchParams: params,
  });

  return {
    products: data?.products ?? [],
    loading,
    error,
  };
}
