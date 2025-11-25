// apps/web/hooks/useSalesSeries.ts
"use client";

import type { FilterState } from "@/components/filters/filter-bar";
import type { SalesPoint } from "@/types/sales";
import { buildFilterParams } from "@/lib/api";
import { useStoreFetch } from "./useStoreFetch";

export function useSalesSeries(filter: FilterState) {
  const params = new URLSearchParams(buildFilterParams(filter, "") as Record<string, string>);
  const { data, loading, error } = useStoreFetch<{ sales: SalesPoint[] }>({
    path: "/sales",
    searchParams: params,
  });

  return {
    sales: data?.sales ?? [],
    loading,
    error,
  };
}
