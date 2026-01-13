"use client";

import type { FilterState } from "@/components/filters/filter-bar";
import { buildFilterParams } from "@/lib/api";
import type { UtmOrdersPoint, UtmOrdersSummary } from "@/types/analytics";
import { useStoreFetch } from "./useStoreFetch";

type UtmOrdersResponse = {
  totalOrders: number;
  movement: UtmOrdersSummary;
  points: UtmOrdersPoint[];
};

export function useUtmOrders(filter: FilterState) {
  const params = new URLSearchParams(
    buildFilterParams(filter, "") as Record<string, string>
  );
  params.set("limit", "50");

  const { data, loading, error } = useStoreFetch<UtmOrdersResponse>({
    path: "/analytics/utm-orders",
    searchParams: params,
  });

  const totalOrders = data?.totalOrders ?? 0;
  const mergedPoints = mergeDirectNone(data?.points ?? [], totalOrders);

  return {
    totalOrders,
    movement: data?.movement ?? null,
    points: mergedPoints,
    loading,
    error,
  };
}

function mergeDirectNone(points: UtmOrdersPoint[], totalOrders: number): UtmOrdersPoint[] {
  const merged = new Map<string, UtmOrdersPoint>();

  for (const point of points) {
    const sourceLabel = point.source?.trim();
    const normalizedSource =
      !sourceLabel ||
      sourceLabel.toLowerCase() === "none" ||
      sourceLabel.toLowerCase() === "direct"
        ? "Direct"
        : sourceLabel;
    const key = `${normalizedSource}::${point.medium}`;
    const existing = merged.get(key);

    if (existing) {
      existing.orders += point.orders;
      existing.customers += point.customers;
    } else {
      merged.set(key, { ...point, source: normalizedSource });
    }
  }

  const output = Array.from(merged.values()).map((row) => ({
    ...row,
    share: totalOrders ? (row.orders / totalOrders) * 100 : 0,
  }));

  output.sort((a, b) => b.orders - a.orders);
  return output;
}
