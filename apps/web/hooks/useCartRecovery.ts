"use client";

import type { FilterState } from "@/components/filters/filter-bar";
import { buildFilterParams } from "@/lib/api";
import type {
  CartRecoveryPoint,
  CartRecoverySpeedBucket,
  CartRecoverySummary,
} from "@/types/analytics";
import { useStoreFetch } from "./useStoreFetch";

type CartRecoveryResponse = {
  summary: CartRecoverySummary;
  points: CartRecoveryPoint[];
  speedBuckets: CartRecoverySpeedBucket[];
  diagnostics: {
    unattributedAbandonedOrders: number;
  };
};

export function useCartRecovery(filter: FilterState, recoveryWindowDays = 30) {
  const params = new URLSearchParams(
    buildFilterParams(filter, "") as Record<string, string>
  );
  params.set("recoveryWindowDays", String(recoveryWindowDays));

  const { data, loading, error } = useStoreFetch<CartRecoveryResponse>({
    path: "/analytics/cart-recovery",
    searchParams: params,
  });

  return {
    summary: data?.summary ?? null,
    points: data?.points ?? [],
    speedBuckets: data?.speedBuckets ?? [],
    diagnostics: data?.diagnostics ?? null,
    loading,
    error,
  };
}
