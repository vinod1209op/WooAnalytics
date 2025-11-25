// apps/web/hooks/useShippingTax.ts
"use client";

import type { FilterState } from "@/components/filters/filter-bar";
import { buildFilterParams } from "@/lib/api";
import type { ShippingTaxPoint } from "@/types/analytics";
import { useStoreFetch } from "./useStoreFetch";

export function useShippingTax(filter: FilterState) {
  const params = new URLSearchParams(buildFilterParams(filter, "") as Record<string, string>);
  const { data, loading, error } = useStoreFetch<{ points: ShippingTaxPoint[] }>({
    path: "/analytics/shipping-tax",
    searchParams: params,
  });

  return {
    points: data?.points ?? [],
    loading,
    error,
  };
}
