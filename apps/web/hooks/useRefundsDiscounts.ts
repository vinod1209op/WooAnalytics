// apps/web/hooks/useRefundsDiscounts.ts
"use client";

import type { FilterState } from "@/components/filters/filter-bar";
import { buildFilterParams } from "@/lib/api";
import type { RefundsDiscountsPoint } from "@/types/analytics";
import { useStoreFetch } from "./useStoreFetch";

export function useRefundsDiscounts(filter: FilterState) {
  const params = new URLSearchParams(buildFilterParams(filter, "") as Record<string, string>);
  const { data, loading, error } = useStoreFetch<{ points: RefundsDiscountsPoint[] }>({
    path: "/analytics/refunds-discounts",
    searchParams: params,
  });

  return {
    points: data?.points ?? [],
    loading,
    error,
  };
}
