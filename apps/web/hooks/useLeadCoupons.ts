// apps/web/hooks/useLeadCoupons.ts
"use client";

import type { FilterState } from "@/components/filters/filter-bar";
import { buildFilterParams } from "@/lib/api";
import type { LeadCouponPoint, LeadCouponSummary } from "@/types/analytics";
import { useStoreFetch } from "./useStoreFetch";

export function useLeadCoupons(filter: FilterState) {
  const params = new URLSearchParams(buildFilterParams(filter, "") as Record<string, string>);
  const { data, loading, error } = useStoreFetch<{
    summary: LeadCouponSummary;
    points: LeadCouponPoint[];
  }>({
    path: "/analytics/lead-coupons",
    searchParams: params,
  });

  return {
    summary: data?.summary ?? null,
    points: data?.points ?? [],
    loading,
    error,
  };
}
