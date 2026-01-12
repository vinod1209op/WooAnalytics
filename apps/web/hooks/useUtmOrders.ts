"use client";

import type { FilterState } from "@/components/filters/filter-bar";
import { buildFilterParams } from "@/lib/api";
import type { UtmOrdersPoint } from "@/types/analytics";
import { useStoreFetch } from "./useStoreFetch";

type UtmOrdersResponse = {
  totalOrders: number;
  points: UtmOrdersPoint[];
};

export function useUtmOrders(filter: FilterState) {
  const params = new URLSearchParams(buildFilterParams(filter, "") as Record<string, string>);
  const { data, loading, error } = useStoreFetch<UtmOrdersResponse>({
    path: "/analytics/utm-orders",
    searchParams: params,
  });

  return {
    totalOrders: data?.totalOrders ?? 0,
    points: data?.points ?? [],
    loading,
    error,
  };
}
